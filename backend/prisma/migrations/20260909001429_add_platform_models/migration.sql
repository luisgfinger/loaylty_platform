-- AlterTable
ALTER TABLE `Company` ADD COLUMN `address` VARCHAR(255) NULL,
    ADD COLUMN `email` VARCHAR(150) NULL,
    ADD COLUMN `ie` VARCHAR(30) NULL,
    ADD COLUMN `phoneNumber` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `CompanyPerson` (
    `idCompanyPerson` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `Company_idCompany` INTEGER UNSIGNED NOT NULL,
    `Person_idPerson` INTEGER UNSIGNED NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CompanyPerson_Person_idPerson_idx`(`Person_idPerson`),
    UNIQUE INDEX `uq_company_person`(`Company_idCompany`, `Person_idPerson`),
    PRIMARY KEY (`idCompanyPerson`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRoles` (
    `idRole` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `role` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `UserRoles_role_key`(`role`),
    PRIMARY KEY (`idRole`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyEmployee` (
    `idCompanyEmployee` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `CompanyPerson_idCompanyPerson` INTEGER UNSIGNED NOT NULL,
    `UserRoles_idRole` INTEGER UNSIGNED NULL,
    `admissionDate` DATE NULL,
    `terminationDate` DATE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CompanyEmployee_CompanyPerson_idCompanyPerson_key`(`CompanyPerson_idCompanyPerson`),
    INDEX `CompanyEmployee_UserRoles_idRole_idx`(`UserRoles_idRole`),
    PRIMARY KEY (`idCompanyEmployee`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyCustomer` (
    `idCompanyCustomer` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `CompanyPerson_idCompanyPerson` INTEGER UNSIGNED NOT NULL,
    `registrationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `whatsappOptIn` BOOLEAN NOT NULL DEFAULT false,
    `whatsappOptInAt` DATETIME(3) NULL,

    UNIQUE INDEX `CompanyCustomer_CompanyPerson_idCompanyPerson_key`(`CompanyPerson_idCompanyPerson`),
    PRIMARY KEY (`idCompanyCustomer`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `idUser` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `Person_idPerson` INTEGER UNSIGNED NOT NULL,
    `userName` VARCHAR(100) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_Person_idPerson_key`(`Person_idPerson`),
    UNIQUE INDEX `User_userName_key`(`userName`),
    PRIMARY KEY (`idUser`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Purchase` (
    `idPurchase` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `CompanyCustomer_idCompanyCustomer` INTEGER UNSIGNED NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `purchaseDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Purchase_CompanyCustomer_idCompanyCustomer_idx`(`CompanyCustomer_idCompanyCustomer`),
    PRIMARY KEY (`idPurchase`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerJourney` (
    `idCustomerJourney` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `CompanyCustomer_idCompanyCustomer` INTEGER UNSIGNED NOT NULL,
    `progress` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CustomerJourney_CompanyCustomer_idCompanyCustomer_key`(`CompanyCustomer_idCompanyCustomer`),
    PRIMARY KEY (`idCustomerJourney`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RewardCategory` (
    `idRewardCategory` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `Company_idCompany` INTEGER UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_rewardcategory_company_name`(`Company_idCompany`, `name`),
    PRIMARY KEY (`idRewardCategory`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reward` (
    `idReward` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `Company_idCompany` INTEGER UNSIGNED NOT NULL,
    `RewardCategory_idRewardCategory` INTEGER UNSIGNED NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Reward_Company_idCompany_idx`(`Company_idCompany`),
    INDEX `Reward_RewardCategory_idRewardCategory_idx`(`RewardCategory_idRewardCategory`),
    PRIMARY KEY (`idReward`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerReward` (
    `idCustomerReward` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `CompanyCustomer_idCompanyCustomer` INTEGER UNSIGNED NOT NULL,
    `RewardCategory_idRewardCategory` INTEGER UNSIGNED NULL,
    `Reward_idReward` INTEGER UNSIGNED NULL,
    `rewardType` ENUM('DIRECT', 'CHOICE') NOT NULL,
    `status` ENUM('AVAILABLE', 'REDEEMED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'AVAILABLE',
    `earnedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `selectedAt` DATETIME(3) NULL,
    `redeemedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,

    INDEX `CustomerReward_CompanyCustomer_idCompanyCustomer_idx`(`CompanyCustomer_idCompanyCustomer`),
    INDEX `CustomerReward_RewardCategory_idRewardCategory_idx`(`RewardCategory_idRewardCategory`),
    INDEX `CustomerReward_Reward_idReward_idx`(`Reward_idReward`),
    PRIMARY KEY (`idCustomerReward`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CompanyPerson` ADD CONSTRAINT `CompanyPerson_Company_idCompany_fkey` FOREIGN KEY (`Company_idCompany`) REFERENCES `Company`(`idCompany`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyPerson` ADD CONSTRAINT `CompanyPerson_Person_idPerson_fkey` FOREIGN KEY (`Person_idPerson`) REFERENCES `Person`(`idPerson`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyEmployee` ADD CONSTRAINT `CompanyEmployee_CompanyPerson_idCompanyPerson_fkey` FOREIGN KEY (`CompanyPerson_idCompanyPerson`) REFERENCES `CompanyPerson`(`idCompanyPerson`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyEmployee` ADD CONSTRAINT `CompanyEmployee_UserRoles_idRole_fkey` FOREIGN KEY (`UserRoles_idRole`) REFERENCES `UserRoles`(`idRole`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyCustomer` ADD CONSTRAINT `CompanyCustomer_CompanyPerson_idCompanyPerson_fkey` FOREIGN KEY (`CompanyPerson_idCompanyPerson`) REFERENCES `CompanyPerson`(`idCompanyPerson`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_Person_idPerson_fkey` FOREIGN KEY (`Person_idPerson`) REFERENCES `Person`(`idPerson`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_CompanyCustomer_idCompanyCustomer_fkey` FOREIGN KEY (`CompanyCustomer_idCompanyCustomer`) REFERENCES `CompanyCustomer`(`idCompanyCustomer`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerJourney` ADD CONSTRAINT `CustomerJourney_CompanyCustomer_idCompanyCustomer_fkey` FOREIGN KEY (`CompanyCustomer_idCompanyCustomer`) REFERENCES `CompanyCustomer`(`idCompanyCustomer`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RewardCategory` ADD CONSTRAINT `RewardCategory_Company_idCompany_fkey` FOREIGN KEY (`Company_idCompany`) REFERENCES `Company`(`idCompany`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reward` ADD CONSTRAINT `Reward_Company_idCompany_fkey` FOREIGN KEY (`Company_idCompany`) REFERENCES `Company`(`idCompany`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reward` ADD CONSTRAINT `Reward_RewardCategory_idRewardCategory_fkey` FOREIGN KEY (`RewardCategory_idRewardCategory`) REFERENCES `RewardCategory`(`idRewardCategory`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerReward` ADD CONSTRAINT `CustomerReward_CompanyCustomer_idCompanyCustomer_fkey` FOREIGN KEY (`CompanyCustomer_idCompanyCustomer`) REFERENCES `CompanyCustomer`(`idCompanyCustomer`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerReward` ADD CONSTRAINT `CustomerReward_RewardCategory_idRewardCategory_fkey` FOREIGN KEY (`RewardCategory_idRewardCategory`) REFERENCES `RewardCategory`(`idRewardCategory`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerReward` ADD CONSTRAINT `CustomerReward_Reward_idReward_fkey` FOREIGN KEY (`Reward_idReward`) REFERENCES `Reward`(`idReward`) ON DELETE SET NULL ON UPDATE CASCADE;
