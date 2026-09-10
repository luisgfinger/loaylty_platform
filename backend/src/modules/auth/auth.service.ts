import bcrypt from "bcryptjs";

import {
  prisma,
} from "../../lib/prisma.js";

import type {
  CreateEmployeeUserInput,
  LoginInput,
} from "./auth.schema.js";


// =====================================================
// CRIAR LOGIN PARA FUNCIONÁRIO
// =====================================================

export async function createEmployeeUser(
  companyId: number,
  cpf: string,
  data: CreateEmployeeUserInput
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
        role:
          true,

        companyPerson: {
          include: {
            person: {
              include: {
                user:
                  true,
              },
            },

            company:
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


  // ==================================================
  // VERIFICAR SE A PESSOA JÁ POSSUI USER
  // ==================================================

  if (
    employee
      .companyPerson
      .person
      .user
  ) {
    throw new Error(
      "USER_ALREADY_EXISTS"
    );
  }


  // ==================================================
  // VERIFICAR USERNAME
  // ==================================================

  const existingUserName =
    await prisma.user.findUnique({
      where: {
        userName:
          data.userName,
      },
    });


  if (existingUserName) {
    throw new Error(
      "USERNAME_ALREADY_EXISTS"
    );
  }


  // ==================================================
  // GERAR HASH DA SENHA
  // ==================================================

  const passwordHash =
    await bcrypt.hash(
      data.password,
      12
    );


  // ==================================================
  // CRIAR USER
  // ==================================================

  const user =
    await prisma.user.create({
      data: {
        Person_idPerson:
          employee
            .companyPerson
            .Person_idPerson,

        userName:
          data.userName,

        passwordHash,

        isActive:
          true,
      },
    });


  // Nunca retornamos passwordHash.

  return {
    idUser:
      user.idUser,

    userName:
      user.userName,

    isActive:
      user.isActive,

    employee: {
      idCompanyEmployee:
        employee
          .idCompanyEmployee,

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

      role:
        employee.role
          ?.role ??
        null,

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
    },
  };
}


// =====================================================
// VALIDAR LOGIN
// =====================================================

export async function authenticateUser(
  data: LoginInput
) {
  // ==================================================
  // LOCALIZAR USER
  // ==================================================

  const user =
    await prisma.user.findUnique({
      where: {
        userName:
          data.userName,
      },

      include: {
        person:
          true,
      },
    });


  if (
    !user ||
    !user.isActive
  ) {
    throw new Error(
      "INVALID_CREDENTIALS"
    );
  }


  // ==================================================
  // VALIDAR SENHA
  // ==================================================

  const passwordIsValid =
    await bcrypt.compare(
      data.password,
      user.passwordHash
    );


  if (!passwordIsValid) {
    throw new Error(
      "INVALID_CREDENTIALS"
    );
  }


  // ==================================================
  // VERIFICAR SE É FUNCIONÁRIO DESTA EMPRESA
  // ==================================================

  const employee =
    await prisma.companyEmployee.findFirst({
      where: {
        isActive:
          true,

        companyPerson: {
          Company_idCompany:
            data.companyId,

          Person_idPerson:
            user.Person_idPerson,

          isActive:
            true,

          company: {
            isActive:
              true,
          },
        },
      },

      include: {
        role:
          true,

        companyPerson: {
          include: {
            company:
              true,

            person:
              true,
          },
        },
      },
    });


  if (!employee) {
    throw new Error(
      "EMPLOYEE_NOT_AUTHORIZED"
    );
  }


  return {
    user: {
      idUser:
        user.idUser,

      userName:
        user.userName,

      idPerson:
        user.Person_idPerson,
    },

    employee: {
      idCompanyEmployee:
        employee
          .idCompanyEmployee,

      role:
        employee
          .role
          ?.role ??
        null,
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

    person: {
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
    },
  };
}