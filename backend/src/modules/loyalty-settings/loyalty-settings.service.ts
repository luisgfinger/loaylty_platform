import { prisma } from "../../lib/prisma.js";

import type {
  LoyaltySettingsInput,
} from "./loyalty-settings.schema.js";


export async function updateLoyaltySettings(
  companyId: number,
  data: LoyaltySettingsInput
) {
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


  return prisma
    .companyLoyaltySettings
    .upsert({
      where: {
        Company_idCompany:
          companyId,
      },

      create: {
        Company_idCompany:
          companyId,

        minimumMedianCustomers:
          data
            .minimumMedianCustomers,

        fallbackMedian:
          data
            .fallbackMedian,
      },

      update: {
        minimumMedianCustomers:
          data
            .minimumMedianCustomers,

        fallbackMedian:
          data
            .fallbackMedian,
      },
    });
}


export async function getLoyaltySettings(
  companyId: number
) {
  return prisma
    .companyLoyaltySettings
    .findUnique({
      where: {
        Company_idCompany:
          companyId,
      },
    });
}