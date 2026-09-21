-- AlterTable
ALTER TABLE `CompanyCustomer` ADD COLUMN `RegisteredByEmployee_idCompanyEmployee` INTEGER UNSIGNED NULL;

-- AlterTable
ALTER TABLE `Purchase` ADD COLUMN `RegisteredByEmployee_idCompanyEmployee` INTEGER UNSIGNED NULL;

-- CreateIndex
CREATE INDEX `CompanyCustomer_RegisteredByEmployee_idCompanyEmployee_idx` ON `CompanyCustomer`(`RegisteredByEmployee_idCompanyEmployee`);

-- CreateIndex
CREATE INDEX `Purchase_RegisteredByEmployee_idCompanyEmployee_idx` ON `Purchase`(`RegisteredByEmployee_idCompanyEmployee`);

-- AddForeignKey
ALTER TABLE `CompanyCustomer` ADD CONSTRAINT `CompanyCustomer_RegisteredByEmployee_idCompanyEmployee_fkey` FOREIGN KEY (`RegisteredByEmployee_idCompanyEmployee`) REFERENCES `CompanyEmployee`(`idCompanyEmployee`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_RegisteredByEmployee_idCompanyEmployee_fkey` FOREIGN KEY (`RegisteredByEmployee_idCompanyEmployee`) REFERENCES `CompanyEmployee`(`idCompanyEmployee`) ON DELETE SET NULL ON UPDATE CASCADE;
