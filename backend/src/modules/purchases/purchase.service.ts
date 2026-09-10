import {
  prisma,
} from "../../lib/prisma.js";

import type {
  CreatePurchaseInput,
} from "./purchase.schema.js";

import {
  ensureCustomerCycle,
} from "../loyalty/cycle.service.js";


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

            amount:
              data.amount,
          },
        });


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

        amount:
          purchase
            .amount
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

          amount:
            purchase
              .amount
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