import { prisma, } from "../../lib/prisma.js";
// =====================================================
// CADASTRAR EMPRESA
// =====================================================
export async function createCompany(data) {
    // ==================================================
    // VERIFICAR CNPJ
    // ==================================================
    const existingCompany = await prisma.company.findUnique({
        where: {
            cnpj: data.cnpj,
        },
    });
    if (existingCompany) {
        throw new Error("COMPANY_ALREADY_EXISTS");
    }
    // ==================================================
    // CRIAR
    // ==================================================
    return prisma.company.create({
        data: {
            name: data.name,
            cnpj: data.cnpj,
            address: data.address ??
                null,
            email: data.email ??
                null,
            ie: data.ie ??
                null,
            phoneNumber: data.phoneNumber ??
                null,
            isActive: true,
        },
    });
}
// =====================================================
// BUSCAR EMPRESA
// =====================================================
export async function findCompanyById(companyId) {
    const company = await prisma.company.findUnique({
        where: {
            idCompany: companyId,
        },
        include: {
            loyaltySettings: true,
        },
    });
    if (!company) {
        throw new Error("COMPANY_NOT_FOUND");
    }
    return company;
}
// =====================================================
// LISTAR EMPRESAS
//
// Por segurança, recebe a empresa do usuário
// autenticado e retorna somente ela.
// =====================================================
export async function listCompanies(companyId) {
    const company = await prisma.company.findUnique({
        where: {
            idCompany: companyId,
        },
    });
    if (!company) {
        throw new Error("COMPANY_NOT_FOUND");
    }
    return [
        company,
    ];
}
// =====================================================
// EDITAR EMPRESA
// =====================================================
export async function updateCompany(companyId, data) {
    // ==================================================
    // VERIFICAR EMPRESA
    // ==================================================
    const company = await prisma.company.findUnique({
        where: {
            idCompany: companyId,
        },
    });
    if (!company) {
        throw new Error("COMPANY_NOT_FOUND");
    }
    // ==================================================
    // VERIFICAR CNPJ NOVO
    // ==================================================
    if (data.cnpj !== undefined &&
        data.cnpj !== company.cnpj) {
        const companyWithCnpj = await prisma.company.findUnique({
            where: {
                cnpj: data.cnpj,
            },
        });
        if (companyWithCnpj &&
            companyWithCnpj.idCompany !==
                companyId) {
            throw new Error("CNPJ_ALREADY_EXISTS");
        }
    }
    // ==================================================
    // ATUALIZAR
    // ==================================================
    return prisma.company.update({
        where: {
            idCompany: companyId,
        },
        data: {
            ...(data.name !== undefined
                ? {
                    name: data.name,
                }
                : {}),
            ...(data.cnpj !== undefined
                ? {
                    cnpj: data.cnpj,
                }
                : {}),
            ...(data.address !== undefined
                ? {
                    address: data.address,
                }
                : {}),
            ...(data.email !== undefined
                ? {
                    email: data.email,
                }
                : {}),
            ...(data.ie !== undefined
                ? {
                    ie: data.ie,
                }
                : {}),
            ...(data.phoneNumber !== undefined
                ? {
                    phoneNumber: data.phoneNumber,
                }
                : {}),
        },
    });
}
//# sourceMappingURL=company.service.js.map