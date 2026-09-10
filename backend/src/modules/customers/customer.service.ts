import {
  prisma,
} from "../../lib/prisma.js";

import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "./customer.schema.js";


// =====================================================
// CRIAR CLIENTE
// =====================================================

export async function createCustomer(
  companyId: number,
  employeeId: number,
  data: CreateCustomerInput
) {
  // ==================================================
  // VERIFICAR EMPRESA
  // ==================================================

  const company =
    await prisma.company.findUnique({
      where: {
        idCompany:
          companyId,
      },
    });


  if (!company) {
    throw new Error(
      "COMPANY_NOT_FOUND"
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
        });


      if (!responsibleEmployee) {
        throw new Error(
          "EMPLOYEE_NOT_AUTHORIZED"
        );
      }


      // ===============================================
      // PROCURAR PERSON PELO CPF
      // ===============================================

      let person =
        await tx.person.findUnique({
          where: {
            cpf:
              data.cpf,
          },
        });


      // ===============================================
      // CRIAR PERSON CASO NÃO EXISTA
      // ===============================================

      if (!person) {
        person =
          await tx.person.create({
            data: {
              cpf:
                data.cpf,

              name:
                data.name,

              email:
                data.email ??
                null,

              phoneNumber:
                data.phoneNumber ??
                null,

              dateOfBirth:
                data.dateOfBirth ??
                null,
            },
          });
      }


      // ===============================================
      // PROCURAR VÍNCULO PERSON <-> COMPANY
      // ===============================================

      let companyPerson =
        await tx.companyPerson.findUnique({
          where: {
            Company_idCompany_Person_idPerson:
              {
                Company_idCompany:
                  companyId,

                Person_idPerson:
                  person.idPerson,
              },
          },

          include: {
            customer:
              true,
          },
        });


      // ===============================================
      // CLIENTE JÁ CADASTRADO NESTA EMPRESA
      // ===============================================

      if (
        companyPerson?.customer
      ) {
        throw new Error(
          "CUSTOMER_ALREADY_EXISTS"
        );
      }


      // ===============================================
      // CRIAR COMPANY PERSON
      //
      // Caso essa pessoa já seja funcionário,
      // reutilizamos o CompanyPerson existente.
      // ===============================================

      if (!companyPerson) {
        companyPerson =
          await tx.companyPerson.create({
            data: {
              Company_idCompany:
                companyId,

              Person_idPerson:
                person.idPerson,

              isActive:
                true,
            },

            include: {
              customer:
                true,
            },
          });
      }


      // ===============================================
      // CRIAR COMPANY CUSTOMER
      // ===============================================

      const customer =
        await tx.companyCustomer.create({
          data: {
            CompanyPerson_idCompanyPerson:
              companyPerson
                .idCompanyPerson,

            // Funcionário responsável pelo cadastro
            RegisteredByEmployee_idCompanyEmployee:
              employeeId,

            isActive:
              true,

            whatsappOptIn:
              data.whatsappOptIn,

            whatsappOptInAt:
              data.whatsappOptIn
                ? new Date()
                : null,
          },

          include: {
            companyPerson: {
              include: {
                person:
                  true,

                company:
                  true,
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
        });


      return customer;
    }
  );
}

export async function updateCustomer(
  companyId: number,
  cpf: string,
  data: UpdateCustomerInput
) {
  const cleanCpf =
    cpf.replace(/\D/g, "");


  const customer =
    await prisma.companyCustomer.findFirst({
      where: {
        companyPerson: {
          Company_idCompany:
            companyId,

          person: {
            cpf:
              cleanCpf,
          },
        },
      },

      include: {
        companyPerson: {
          include: {
            person: true,
            company: true,
          },
        },
      },
    });


  if (!customer) {
    throw new Error(
      "CUSTOMER_NOT_FOUND"
    );
  }


  return prisma.$transaction(
    async (tx) => {
      // =============================================
      // DADOS DA PESSOA
      // =============================================

      if (
        data.name !== undefined ||
        data.email !== undefined ||
        data.phoneNumber !== undefined ||
        data.dateOfBirth !== undefined
      ) {
        await tx.person.update({
          where: {
            idPerson:
              customer
                .companyPerson
                .Person_idPerson,
          },

          data: {
            ...(data.name !== undefined
              ? {
                  name:
                    data.name,
                }
              : {}),

            ...(data.email !== undefined
              ? {
                  email:
                    data.email,
                }
              : {}),

            ...(data.phoneNumber !== undefined
              ? {
                  phoneNumber:
                    data.phoneNumber,
                }
              : {}),

            ...(data.dateOfBirth !== undefined
              ? {
                  dateOfBirth:
                    data.dateOfBirth,
                }
              : {}),
          },
        });
      }


      // =============================================
      // DADOS DO CLIENTE
      // =============================================

      if (
        data.whatsappOptIn !== undefined ||
        data.isActive !== undefined
      ) {
        await tx.companyCustomer.update({
          where: {
            idCompanyCustomer:
              customer
                .idCompanyCustomer,
          },

          data: {
            ...(data.isActive !== undefined
              ? {
                  isActive:
                    data.isActive,
                }
              : {}),

            ...(data.whatsappOptIn !== undefined
              ? {
                  whatsappOptIn:
                    data.whatsappOptIn,

                  whatsappOptInAt:
                    data.whatsappOptIn
                      ? new Date()
                      : null,
                }
              : {}),
          },
        });
      }


      return tx.companyCustomer.findUnique({
        where: {
          idCompanyCustomer:
            customer
              .idCompanyCustomer,
        },

        include: {
          companyPerson: {
            include: {
              person: true,
              company: true,
            },
          },

          registeredByEmployee: {
            include: {
              companyPerson: {
                include: {
                  person: true,
                },
              },
            },
          },
        },
      });
    }
  );
}


// =====================================================
// BUSCAR CLIENTE PELO CPF
// =====================================================

export async function findCustomerByCpf(
  companyId: number,
  cpf: string
) {
  const cleanCpf =
    cpf.replace(
      /\D/g,
      ""
    );


  const customer =
    await prisma.companyCustomer.findFirst({
      where: {
        companyPerson: {
          Company_idCompany:
            companyId,

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

            company:
              true,
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

        journey:
          true,

        customerRewards: {
          where: {
            status:
              "AVAILABLE",
          },

          include: {
            reward:
              true,

            rewardCategory:
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
  // FORMATAR RESPOSTA
  //
  // Evitamos retornar BigInt diretamente no JSON.
  // ==================================================

  return {
    idCompanyCustomer:
      customer
        .idCompanyCustomer,

    registrationDate:
      customer
        .registrationDate,

    isActive:
      customer
        .isActive,

    whatsappOptIn:
      customer
        .whatsappOptIn,

    whatsappOptInAt:
      customer
        .whatsappOptInAt,


    person: {
      idPerson:
        customer
          .companyPerson
          .person
          .idPerson,

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

      email:
        customer
          .companyPerson
          .person
          .email,

      phoneNumber:
        customer
          .companyPerson
          .person
          .phoneNumber,

      dateOfBirth:
        customer
          .companyPerson
          .person
          .dateOfBirth,
    },


    company: {
      idCompany:
        customer
          .companyPerson
          .company
          .idCompany,

      name:
        customer
          .companyPerson
          .company
          .name,
    },


    registeredBy:
      customer
        .registeredByEmployee
        ? {
            idCompanyEmployee:
              customer
                .registeredByEmployee
                .idCompanyEmployee,

            name:
              customer
                .registeredByEmployee
                .companyPerson
                .person
                .name,

            cpf:
              customer
                .registeredByEmployee
                .companyPerson
                .person
                .cpf,
          }
        : null,


    journey:
      customer.journey
        ? {
            idCustomerJourney:
              customer
                .journey
                .idCustomerJourney
                .toString(),

            progress:
              customer
                .journey
                .progress
                .toString(),

            regularity:
              customer
                .journey
                .regularity
                .toString(),

            updatedAt:
              customer
                .journey
                .updatedAt,
          }
        : null,


    rewards:
      customer
        .customerRewards
        .map(
          (
            customerReward
          ) => ({
            idCustomerReward:
              customerReward
                .idCustomerReward
                .toString(),

            rewardType:
              customerReward
                .rewardType,

            status:
              customerReward
                .status,

            earnedAt:
              customerReward
                .earnedAt,

            selectedAt:
              customerReward
                .selectedAt,

            redeemedAt:
              customerReward
                .redeemedAt,

            expiresAt:
              customerReward
                .expiresAt,

            reward:
              customerReward
                .reward,

            rewardCategory:
              customerReward
                .rewardCategory,
          })
        ),
  };
}