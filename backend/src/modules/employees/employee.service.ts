import {
  prisma,
} from "../../lib/prisma.js";

import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "./employee.schema.js";


// =====================================================
// CRIAR FUNCIONÁRIO
// =====================================================

export async function createEmployee(
  companyId: number,
  data: CreateEmployeeInput
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
      // PROCURAR PESSOA PELO CPF
      // ===============================================

      let person =
        await tx.person.findUnique({
          where: {
            cpf:
              data.cpf,
          },
        });


      // ===============================================
      // CRIAR PESSOA SE NÃO EXISTIR
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
      // PROCURAR VÍNCULO DA PESSOA COM A EMPRESA
      // ===============================================

      let companyPerson =
        await tx.companyPerson.findUnique({
          where: {
            Company_idCompany_Person_idPerson: {
              Company_idCompany:
                companyId,

              Person_idPerson:
                person.idPerson,
            },
          },

          include: {
            employee:
              true,

            customer:
              true,
          },
        });


      // ===============================================
      // FUNCIONÁRIO JÁ CADASTRADO
      // ===============================================

      if (
        companyPerson?.employee
      ) {
        throw new Error(
          "EMPLOYEE_ALREADY_EXISTS"
        );
      }


      // ===============================================
      // CRIAR COMPANY PERSON SE NECESSÁRIO
      //
      // Caso a pessoa já seja cliente,
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
              employee:
                true,

              customer:
                true,
            },
          });
      }


      // ===============================================
      // ROLE
      // ===============================================

      let roleId:
        number | null =
          null;


      if (data.role) {
        const role =
          await tx.userRoles.upsert({
            where: {
              role:
                data.role,
            },

            create: {
              role:
                data.role,
            },

            update: {},
          });


        roleId =
          role.idRole;
      }


      // ===============================================
      // CRIAR FUNCIONÁRIO
      // ===============================================

      const employee =
        await tx.companyEmployee.create({
          data: {
            CompanyPerson_idCompanyPerson:
              companyPerson
                .idCompanyPerson,

            UserRoles_idRole:
              roleId,

            admissionDate:
              data.admissionDate ??
              null,

            isActive:
              true,
          },

          include: {
            role:
              true,

            companyPerson: {
              include: {
                person:
                  true,

                company:
                  true,

                customer:
                  true,
              },
            },
          },
        });


      return employee;
    }
  );
}


// =====================================================
// LISTAR FUNCIONÁRIOS
// =====================================================

export async function listEmployees(
  companyId: number
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
  // BUSCAR FUNCIONÁRIOS
  // ==================================================

  const employees =
    await prisma.companyEmployee.findMany({
      where: {
        companyPerson: {
          Company_idCompany:
            companyId,
        },
      },

      include: {
        role:
          true,

        companyPerson: {
          include: {
            person:
              true,

            company:
              true,

            customer:
              true,
          },
        },
      },

      orderBy: {
        companyPerson: {
          person: {
            name:
              "asc",
          },
        },
      },
    });


  // ==================================================
  // FORMATAR RESPOSTA
  // ==================================================

  return employees.map(
    (
      employee
    ) => ({
      idCompanyEmployee:
        employee
          .idCompanyEmployee,

      isActive:
        employee
          .isActive,

      admissionDate:
        employee
          .admissionDate,

      terminationDate:
        employee
          .terminationDate,

      createdAt:
        employee
          .createdAt,

      role:
        employee.role
          ? {
              idRole:
                employee
                  .role
                  .idRole,

              role:
                employee
                  .role
                  .role,
            }
          : null,

      person: {
        idPerson:
          employee
            .companyPerson
            .person
            .idPerson,

        cpf:
          employee
            .companyPerson
            .person
            .cpf,

        name:
          employee
            .companyPerson
            .person
            .name,

        email:
          employee
            .companyPerson
            .person
            .email,

        phoneNumber:
          employee
            .companyPerson
            .person
            .phoneNumber,

        dateOfBirth:
          employee
            .companyPerson
            .person
            .dateOfBirth,
      },

      company: {
        idCompany:
          employee
            .companyPerson
            .company
            .idCompany,

        name:
          employee
            .companyPerson
            .company
            .name,
      },

      isCustomer:
        employee
          .companyPerson
          .customer !==
        null,
    })
  );
}


// =====================================================
// BUSCAR FUNCIONÁRIO PELO CPF
// =====================================================

export async function findEmployeeByCpf(
  companyId: number,
  cpf: string
) {
  const cleanCpf =
    cpf.replace(
      /\D/g,
      ""
    );


  const employee =
    await prisma.companyEmployee.findFirst({
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
        role:
          true,

        companyPerson: {
          include: {
            person:
              true,

            company:
              true,

            customer:
              true,
          },
        },
      },
    });


  if (!employee) {
    throw new Error(
      "EMPLOYEE_NOT_FOUND"
    );
  }


  return employee;
}


// =====================================================
// ATUALIZAR FUNCIONÁRIO
// =====================================================

export async function updateEmployee(
  companyId: number,

  // Funcionário que está fazendo a requisição.
  authenticatedEmployeeId: number,

  // CPF do funcionário que será editado.
  cpf: string,

  data: UpdateEmployeeInput
) {
  const cleanCpf =
    cpf.replace(
      /\D/g,
      ""
    );


  // ==================================================
  // LOCALIZAR FUNCIONÁRIO
  // ==================================================

  const employee =
    await prisma.companyEmployee.findFirst({
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

        role:
          true,
      },
    });


  if (!employee) {
    throw new Error(
      "EMPLOYEE_NOT_FOUND"
    );
  }


  // ==================================================
  // VERIFICAR SE O ADMIN ESTÁ EDITANDO A SI MESMO
  // ==================================================

  const isEditingSelf =
    employee.idCompanyEmployee ===
    authenticatedEmployeeId;


  // ==================================================
  // NÃO PODE INATIVAR A SI MESMO
  // ==================================================

  if (
    isEditingSelf &&
    data.isActive === false
  ) {
    throw new Error(
      "CANNOT_DISABLE_SELF"
    );
  }


  // ==================================================
  // NÃO PODE REMOVER O PRÓPRIO ADMIN
  //
  // Inclui:
  //
  // ADMIN -> ATENDENTE
  // ADMIN -> GERENTE
  // ADMIN -> null
  // ==================================================

  if (
    isEditingSelf &&
    data.role !== undefined &&
    data.role !== "ADMIN"
  ) {
    throw new Error(
      "CANNOT_REMOVE_OWN_ADMIN_ROLE"
    );
  }


  // ==================================================
  // TRANSAÇÃO
  // ==================================================

  return prisma.$transaction(
    async (tx) => {
      // ===============================================
      // ATUALIZAR DADOS DA PERSON
      // ===============================================

      if (
        data.name !== undefined ||
        data.email !== undefined ||
        data.phoneNumber !== undefined ||
        data.dateOfBirth !== undefined
      ) {
        await tx.person.update({
          where: {
            idPerson:
              employee
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


      // ===============================================
      // RESOLVER ROLE
      // ===============================================

      let roleId:
        number |
        null |
        undefined =
          undefined;


      if (
        data.role !== undefined
      ) {
        // ---------------------------------------------
        // REMOVER ROLE
        // ---------------------------------------------

        if (
          data.role === null
        ) {
          roleId =
            null;
        }

        // ---------------------------------------------
        // CRIAR / LOCALIZAR ROLE
        // ---------------------------------------------

        else {
          const role =
            await tx.userRoles.upsert({
              where: {
                role:
                  data.role,
              },

              create: {
                role:
                  data.role,
              },

              update: {},
            });


          roleId =
            role.idRole;
        }
      }


      // ===============================================
      // ATUALIZAR COMPANY EMPLOYEE
      // ===============================================

      await tx.companyEmployee.update({
        where: {
          idCompanyEmployee:
            employee
              .idCompanyEmployee,
        },

        data: {
          ...(data.admissionDate !== undefined
            ? {
                admissionDate:
                  data.admissionDate,
              }
            : {}),

          ...(data.terminationDate !== undefined
            ? {
                terminationDate:
                  data.terminationDate,
              }
            : {}),

          ...(data.isActive !== undefined
            ? {
                isActive:
                  data.isActive,
              }
            : {}),

          ...(roleId !== undefined
            ? {
                UserRoles_idRole:
                  roleId,
              }
            : {}),
        },
      });


      // ===============================================
      // RETORNAR FUNCIONÁRIO ATUALIZADO
      // ===============================================

      return tx.companyEmployee.findUnique({
        where: {
          idCompanyEmployee:
            employee
              .idCompanyEmployee,
        },

        include: {
          role:
            true,

          companyPerson: {
            include: {
              person:
                true,

              company:
                true,

              customer:
                true,
            },
          },
        },
      });
    }
  );
}