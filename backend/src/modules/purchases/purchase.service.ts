import {
  prisma,
} from "../../lib/prisma.js";

import type {
  CreatePurchaseInput,
} from "./purchase.schema.js";

import {
  ensureCustomerCycle,
} from "../loyalty/cycle.service.js";

import {
  calculateRewardFundContribution,
  creditRewardFund,
  debitRewardFund,
} from "../rewards/reward.fund.service.js";


// =====================================================
// CONSTANTES
// =====================================================

const CASHIER_DELETE_WINDOW_MS =
  30 * 60 * 1000;


// =====================================================
// FUNÇÕES AUXILIARES DE DATA
// =====================================================

function startOfDay(
  date: Date
): Date {
  const result =
    new Date(
      date
    );


  result.setHours(
    0,
    0,
    0,
    0
  );


  return result;
}


function addDays(
  date: Date,
  days: number
): Date {
  const result =
    new Date(
      date
    );


  result.setDate(
    result.getDate() +
    days
  );


  return result;
}


function getDayKey(
  date: Date
): string {
  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return `${year}-${month}-${day}`;
}


// =====================================================
// CRIAR COMPRA / VENDA
// =====================================================

export async function createPurchase(
  companyId: number,
  employeeId: number,
  data: CreatePurchaseInput
) {
  // ==================================================
  // LOCALIZAR CLIENTE
  // ==================================================

  const customer =
    await prisma.companyCustomer.findFirst({
      where: {
        isActive:
          true,

        companyPerson: {
          Company_idCompany:
            companyId,

          isActive:
            true,

          person: {
            cpf:
              data.cpf,
          },
        },
      },

      include: {
        companyPerson: {
          include: {
            person:
              true,
          },
        },
      },
    });


  if (!customer) {
    throw new Error(
      "CUSTOMER_NOT_FOUND"
    );
  }


  // ==================================================
  // CALCULAR CONTRIBUIÇÃO PARA O FUNDO
  //
  // 0,5% do valor da venda.
  // ==================================================

  const rewardFundContribution =
    calculateRewardFundContribution(
      data.amount
    );


  // ==================================================
  // TRANSAÇÃO
  // ==================================================

  return prisma.$transaction(
    async (tx) => {
      // ===============================================
      // VALIDAR FUNCIONÁRIO RESPONSÁVEL
      // ===============================================

      const responsibleEmployee =
        await tx.companyEmployee.findFirst({
          where: {
            idCompanyEmployee:
              employeeId,

            isActive:
              true,

            companyPerson: {
              Company_idCompany:
                companyId,

              isActive:
                true,
            },
          },

          include: {
            companyPerson: {
              include: {
                person:
                  true,
              },
            },
          },
        });


      if (!responsibleEmployee) {
        throw new Error(
          "EMPLOYEE_NOT_AUTHORIZED"
        );
      }


      // ===============================================
      // REGISTRAR VENDA
      // ===============================================

      const purchase =
        await tx.purchase.create({
          data: {
            CompanyCustomer_idCompanyCustomer:
              customer
                .idCompanyCustomer,

            RegisteredByEmployee_idCompanyEmployee:
              employeeId,

            fiscalDocumentNumber:
              data
                .fiscalDocumentNumber,

            amount:
              data.amount,

            rewardFundContribution,
          },
        });


      // ===============================================
      // CREDITAR 0,5% NO FUNDO
      // ===============================================

      await creditRewardFund(
        tx,
        companyId,
        rewardFundContribution
      );


      // ===============================================
      // GARANTIR CICLO DO CLIENTE
      // ===============================================

      const cycle =
        await ensureCustomerCycle(
          tx,

          customer
            .idCompanyCustomer,

          purchase
            .purchaseDate
        );


      // ===============================================
      // RESPOSTA
      // ===============================================

      return {
        idPurchase:
          purchase
            .idPurchase
            .toString(),

        fiscalDocumentNumber:
          purchase
            .fiscalDocumentNumber,

        amount:
          purchase
            .amount
            .toString(),

        rewardFundContribution:
          purchase
            .rewardFundContribution
            .toString(),

        purchaseDate:
          purchase
            .purchaseDate,


        customer: {
          idCompanyCustomer:
            customer
              .idCompanyCustomer,

          cpf:
            customer
              .companyPerson
              .person
              .cpf,

          name:
            customer
              .companyPerson
              .person
              .name,
        },


        registeredBy: {
          idCompanyEmployee:
            responsibleEmployee
              .idCompanyEmployee,

          cpf:
            responsibleEmployee
              .companyPerson
              .person
              .cpf,

          name:
            responsibleEmployee
              .companyPerson
              .person
              .name,
        },


        cycle:
          cycle
            ? {
                idCustomerCycle:
                  cycle
                    .idCustomerCycle
                    .toString(),

                cycleStart:
                  cycle
                    .cycleStart,

                cycleEnd:
                  cycle
                    .cycleEnd,

                status:
                  cycle
                    .status,
              }
            : null,
      };
    }
  );
}


// =====================================================
// EXCLUIR COMPRA / VENDA
// =====================================================

export async function deletePurchase(
  companyId: number,
  purchaseId: bigint,
  employeeId: number,
  role: string | null
) {
  return prisma.$transaction(
    async (tx) => {
      // ===============================================
      // LOCALIZAR VENDA
      //
      // A busca já garante que a venda pertence
      // à empresa informada.
      // ===============================================

      const purchase =
        await tx.purchase.findFirst({
          where: {
            idPurchase:
              purchaseId,

            customer: {
              companyPerson: {
                Company_idCompany:
                  companyId,
              },
            },
          },
        });


      if (!purchase) {
        throw new Error(
          "PURCHASE_NOT_FOUND"
        );
      }


      // ===============================================
      // VALIDAR PERFIL
      // ===============================================

      if (
        role !== "ADMIN" &&
        role !== "CAIXA"
      ) {
        throw new Error(
          "PURCHASE_DELETE_FORBIDDEN"
        );
      }


      // ===============================================
      // REGRAS DO CAIXA
      // ===============================================

      if (
        role === "CAIXA"
      ) {
        // O CAIXA só pode excluir
        // uma venda feita por ele.
        if (
          purchase
            .RegisteredByEmployee_idCompanyEmployee
          !== employeeId
        ) {
          throw new Error(
            "PURCHASE_DELETE_FORBIDDEN"
          );
        }


        const elapsed =
          Date.now() -
          purchase
            .purchaseDate
            .getTime();


        // Permitimos até exatamente
        // 30 minutos.
        if (
          elapsed >
          CASHIER_DELETE_WINDOW_MS
        ) {
          throw new Error(
            "PURCHASE_DELETE_WINDOW_EXPIRED"
          );
        }
      }


      // ===============================================
      // AJUSTAR CURSOR DO CICLO ABERTO
      //
      // IMPORTANTE:
      //
      // NÃO retiramos progresso já conquistado.
      //
      // Porém CustomerCycle.purchaseDays funciona
      // como um cursor de dias já processados.
      //
      // Se apagarmos o único registro de um dia
      // já processado e não corrigirmos esse contador,
      // um novo dia futuro poderia deixar de gerar
      // progresso.
      //
      // Por isso reduzimos APENAS purchaseDays quando:
      //
      // - o ciclo ainda está OPEN;
      // - aquele dia já havia sido processado;
      // - esta é a única venda daquele dia.
      //
      // CustomerJourney.progress e
      // CustomerCycle.progressEarned NÃO são alterados.
      // ===============================================

      const cycle =
        await tx.customerCycle.findFirst({
          where: {
            CompanyCustomer_idCompanyCustomer:
              purchase
                .CompanyCustomer_idCompanyCustomer,

            status:
              "OPEN",

            cycleStart: {
              lte:
                purchase.purchaseDate,
            },

            cycleEnd: {
              gt:
                purchase.purchaseDate,
            },
          },
        });


      if (cycle) {
        const purchaseDayStart =
          startOfDay(
            purchase.purchaseDate
          );


        const purchaseDayEnd =
          addDays(
            purchaseDayStart,
            1
          );


        const purchasesOnSameDay =
          await tx.purchase.count({
            where: {
              CompanyCustomer_idCompanyCustomer:
                purchase
                  .CompanyCustomer_idCompanyCustomer,

              purchaseDate: {
                gte:
                  purchaseDayStart,

                lt:
                  purchaseDayEnd,
              },
            },
          });


        // Só precisamos mexer no cursor
        // se essa for a única venda daquele dia.
        if (
          purchasesOnSameDay === 1
        ) {
          const todayStart =
            startOfDay(
              new Date()
            );


          const purchasesBeforeToday =
            await tx.purchase.findMany({
              where: {
                CompanyCustomer_idCompanyCustomer:
                  purchase
                    .CompanyCustomer_idCompanyCustomer,

                purchaseDate: {
                  gte:
                    cycle.cycleStart,

                  lt:
                    todayStart,
                },
              },

              select: {
                purchaseDate:
                  true,
              },

              orderBy: {
                purchaseDate:
                  "asc",
              },
            });


          const uniqueDays:
            string[] = [];


          const seenDays =
            new Set<string>();


          for (
            const item
            of purchasesBeforeToday
          ) {
            const dayKey =
              getDayKey(
                item.purchaseDate
              );


            if (
              seenDays.has(
                dayKey
              )
            ) {
              continue;
            }


            seenDays.add(
              dayKey
            );


            uniqueDays.push(
              dayKey
            );
          }


          const deletedDayKey =
            getDayKey(
              purchase.purchaseDate
            );


          const deletedDayIndex =
            uniqueDays.indexOf(
              deletedDayKey
            );


          const processedDays =
            cycle.purchaseDays ??
            0;


          const deletedDayWasProcessed =
            deletedDayIndex >= 0 &&
            deletedDayIndex <
              processedDays;


          if (
            deletedDayWasProcessed &&
            processedDays > 0
          ) {
            await tx.customerCycle.update({
              where: {
                idCustomerCycle:
                  cycle
                    .idCustomerCycle,
              },

              data: {
                purchaseDays:
                  processedDays -
                  1,
              },
            });
          }
        }
      }


      // ===============================================
      // ESTORNAR CONTRIBUIÇÃO DA VENDA
      //
      // Utilizamos exatamente o valor registrado
      // na própria venda.
      //
      // NÃO recalculamos 0,5%.
      // ===============================================

      const rewardFundContribution =
        Number(
          purchase
            .rewardFundContribution
        );


      await debitRewardFund(
        tx,
        companyId,
        rewardFundContribution
      );


      // ===============================================
      // EXCLUIR VENDA
      // ===============================================

      await tx.purchase.delete({
        where: {
          idPurchase:
            purchase.idPurchase,
        },
      });


      // ===============================================
      // RESPOSTA
      // ===============================================

      return {
        idPurchase:
          purchase
            .idPurchase
            .toString(),

        amount:
          purchase
            .amount
            .toString(),

        rewardFundContribution:
          purchase
            .rewardFundContribution
            .toString(),

        purchaseDate:
          purchase
            .purchaseDate,
      };
    }
  );
}


// =====================================================
// LISTAR TODAS AS COMPRAS DA EMPRESA
// =====================================================

export async function listCompanyPurchases(
  companyId: number
) {
  const purchases =
    await prisma.purchase.findMany({
      where: {
        customer: {
          companyPerson: {
            Company_idCompany:
              companyId,
          },
        },
      },

      include: {
        customer: {
          include: {
            companyPerson: {
              include: {
                person:
                  true,
              },
            },
          },
        },

        registeredByEmployee: {
          include: {
            companyPerson: {
              include: {
                person:
                  true,
              },
            },
          },
        },
      },

      orderBy: {
        purchaseDate:
          "desc",
      },
    });


  return {
    purchases:
      purchases.map(
        (
          purchase
        ) => ({
          idPurchase:
            purchase
              .idPurchase
              .toString(),

          purchaseDate:
            purchase
              .purchaseDate,

          amount:
            purchase
              .amount
              .toString(),

          customer: {
            idCompanyCustomer:
              purchase
                .customer
                .idCompanyCustomer,

            cpf:
              purchase
                .customer
                .companyPerson
                .person
                .cpf,

            name:
              purchase
                .customer
                .companyPerson
                .person
                .name,
          },

          registeredBy:
            purchase
              .registeredByEmployee
              ? {
                  idCompanyEmployee:
                    purchase
                      .registeredByEmployee
                      .idCompanyEmployee,

                  cpf:
                    purchase
                      .registeredByEmployee
                      .companyPerson
                      .person
                      .cpf,

                  name:
                    purchase
                      .registeredByEmployee
                      .companyPerson
                      .person
                      .name,
                }
              : null,
        })
      ),
  };
}


// =====================================================
// LISTAR COMPRAS DO CLIENTE
// =====================================================

export async function listCustomerPurchases(
  companyId: number,
  cpf: string
) {
  const cleanCpf =
    cpf.replace(
      /\D/g,
      ""
    );


  // ==================================================
  // LOCALIZAR CLIENTE
  // ==================================================

  const customer =
    await prisma.companyCustomer.findFirst({
      where: {
        isActive:
          true,

        companyPerson: {
          Company_idCompany:
            companyId,

          isActive:
            true,

          person: {
            cpf:
              cleanCpf,
          },
        },
      },

      include: {
        companyPerson: {
          include: {
            person:
              true,
          },
        },
      },
    });


  if (!customer) {
    throw new Error(
      "CUSTOMER_NOT_FOUND"
    );
  }


  // ==================================================
  // BUSCAR COMPRAS
  // ==================================================

  const purchases =
    await prisma.purchase.findMany({
      where: {
        CompanyCustomer_idCompanyCustomer:
          customer
            .idCompanyCustomer,
      },

      include: {
        registeredByEmployee: {
          include: {
            companyPerson: {
              include: {
                person:
                  true,
              },
            },
          },
        },
      },

      orderBy: {
        purchaseDate:
          "desc",
      },
    });


  // ==================================================
  // RESPOSTA
  // ==================================================

  return {
    customer: {
      idCompanyCustomer:
        customer
          .idCompanyCustomer,

      cpf:
        customer
          .companyPerson
          .person
          .cpf,

      name:
        customer
          .companyPerson
          .person
          .name,
    },


    purchases:
      purchases.map(
        (
          purchase
        ) => ({
          idPurchase:
            purchase
              .idPurchase
              .toString(),

          fiscalDocumentNumber:
            purchase
              .fiscalDocumentNumber,

          amount:
            purchase
              .amount
              .toString(),

          rewardFundContribution:
            purchase
              .rewardFundContribution
              .toString(),

          purchaseDate:
            purchase
              .purchaseDate,


          registeredBy:
            purchase
              .registeredByEmployee
              ? {
                  idCompanyEmployee:
                    purchase
                      .registeredByEmployee
                      .idCompanyEmployee,

                  cpf:
                    purchase
                      .registeredByEmployee
                      .companyPerson
                      .person
                      .cpf,

                  name:
                    purchase
                      .registeredByEmployee
                      .companyPerson
                      .person
                      .name,
                }
              : null,
        })
      ),
  };
}