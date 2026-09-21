/*
  Warnings:

  - A unique constraint covering the columns `[CompanyCustomer_idCompanyCustomer,progressMilestone]` on the table `CustomerReward` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `CustomerReward` ADD COLUMN `ReviewedByEmployee_idCompanyEmployee` INTEGER UNSIGNED NULL,
    ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `decisionNote` VARCHAR(255) NULL,
    ADD COLUMN `finalTier` ENUM('LOW', 'MEDIUM', 'HIGH') NULL,
    ADD COLUMN `progressMilestone` DECIMAL(10, 2) NULL,
    ADD COLUMN `redemptionTiming` ENUM('IMMEDIATE', 'NEXT_PURCHASE', 'NEXT_PURCHASE_DAY') NULL,
    ADD COLUMN `regularityAtEarned` DECIMAL(2, 1) NULL,
    ADD COLUMN `reservedAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `suggestedTier` ENUM('LOW', 'MEDIUM', 'HIGH') NULL,
    MODIFY `rewardType` ENUM('DIRECT', 'CHOICE') NULL,
    MODIFY `status` ENUM('PENDING', 'AVAILABLE', 'REDEEMED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX `CustomerReward_ReviewedByEmployee_idCompanyEmployee_idx` ON `CustomerReward`(`ReviewedByEmployee_idCompanyEmployee`);

-- CreateIndex
CREATE INDEX `CustomerReward_status_earnedAt_idx` ON `CustomerReward`(`status`, `earnedAt`);

-- CreateIndex
CREATE INDEX `CustomerReward_status_expiresAt_idx` ON `CustomerReward`(`status`, `expiresAt`);

-- CreateIndex
CREATE UNIQUE INDEX `uq_customer_reward_progress_milestone` ON `CustomerReward`(`CompanyCustomer_idCompanyCustomer`, `progressMilestone`);

-- AddForeignKey
ALTER TABLE `CustomerReward` ADD CONSTRAINT `CustomerReward_ReviewedByEmployee_idCompanyEmployee_fkey` FOREIGN KEY (`ReviewedByEmployee_idCompanyEmployee`) REFERENCES `CompanyEmployee`(`idCompanyEmployee`) ON DELETE SET NULL ON UPDATE CASCADE;
