-- AlterTable
ALTER TABLE `CustomerReward` ADD COLUMN `costAmountSnapshot` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `Reward` ADD COLUMN `costAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0;
