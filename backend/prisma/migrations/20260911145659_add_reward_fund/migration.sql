-- AlterTable
ALTER TABLE `Company` ADD COLUMN `rewardFundBalance` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    ADD COLUMN `rewardFundTotalContributed` DECIMAL(14, 4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Purchase` ADD COLUMN `rewardFundContribution` DECIMAL(14, 4) NOT NULL DEFAULT 0;
