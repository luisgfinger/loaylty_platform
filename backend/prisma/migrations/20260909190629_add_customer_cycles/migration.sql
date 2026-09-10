-- AlterTable
ALTER TABLE `CustomerJourney` ADD COLUMN `regularity` DECIMAL(2, 1) NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `CompanyLoyaltySettings` (
    `idCompanyLoyaltySettings` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `Company_idCompany` INTEGER UNSIGNED NOT NULL,
    `minimumMedianCustomers` INTEGER NOT NULL DEFAULT 20,
    `fallbackMedian` DECIMAL(12, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyLoyaltySettings_Company_idCompany_key`(`Company_idCompany`),
    PRIMARY KEY (`idCompanyLoyaltySettings`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerCycle` (
    `idCustomerCycle` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `CompanyCustomer_idCompanyCustomer` INTEGER UNSIGNED NOT NULL,
    `cycleStart` DATETIME(3) NOT NULL,
    `cycleEnd` DATETIME(3) NOT NULL,
    `purchaseDays` INTEGER NULL,
    `totalAmount` DECIMAL(12, 2) NULL,
    `frequencyLevel` ENUM('LOW', 'MEDIUM', 'HIGH') NULL,
    `valueLevel` ENUM('LOW', 'MEDIUM', 'HIGH') NULL,
    `regularityLevel` DECIMAL(2, 1) NULL,
    `companyMedian` DECIMAL(12, 2) NULL,
    `medianPercentage` DECIMAL(8, 2) NULL,
    `medianSampleSize` INTEGER NULL,
    `progressEarned` DECIMAL(4, 2) NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CustomerCycle_status_cycleEnd_idx`(`status`, `cycleEnd`),
    UNIQUE INDEX `uq_customer_cycle_start`(`CompanyCustomer_idCompanyCustomer`, `cycleStart`),
    PRIMARY KEY (`idCustomerCycle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Purchase_purchaseDate_idx` ON `Purchase`(`purchaseDate`);

-- AddForeignKey
ALTER TABLE `CompanyLoyaltySettings` ADD CONSTRAINT `CompanyLoyaltySettings_Company_idCompany_fkey` FOREIGN KEY (`Company_idCompany`) REFERENCES `Company`(`idCompany`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerCycle` ADD CONSTRAINT `CustomerCycle_CompanyCustomer_idCompanyCustomer_fkey` FOREIGN KEY (`CompanyCustomer_idCompanyCustomer`) REFERENCES `CompanyCustomer`(`idCompanyCustomer`) ON DELETE RESTRICT ON UPDATE CASCADE;
