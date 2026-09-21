-- CreateTable
CREATE TABLE `Company` (
    `idCompany` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `cnpj` CHAR(14) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Company_cnpj_key`(`cnpj`),
    PRIMARY KEY (`idCompany`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Person` (
    `idPerson` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `cpf` CHAR(11) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(150) NULL,
    `phoneNumber` VARCHAR(20) NULL,
    `dateOfBirth` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Person_cpf_key`(`cpf`),
    PRIMARY KEY (`idPerson`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
