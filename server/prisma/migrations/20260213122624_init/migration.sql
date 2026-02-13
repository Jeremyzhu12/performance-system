-- CreateTable
CREATE TABLE `employees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empNo` VARCHAR(20) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `position` VARCHAR(50) NULL,
    `station` VARCHAR(50) NULL,
    `area` VARCHAR(50) NULL,
    `workshop` VARCHAR(50) NULL,
    `center` VARCHAR(50) NULL,
    `company` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employees_empNo_key`(`empNo`),
    INDEX `employees_empNo_idx`(`empNo`),
    INDEX `employees_area_idx`(`area`),
    INDEX `employees_workshop_idx`(`workshop`),
    INDEX `employees_center_idx`(`center`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `center` VARCHAR(50) NOT NULL,
    `company` VARCHAR(50) NULL,
    `department` VARCHAR(50) NULL,
    `paperCode` VARCHAR(50) NULL,
    `itemCode` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `category` VARCHAR(50) NULL,
    `score` DOUBLE NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT '启用',
    `groupName` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `items_itemCode_key`(`itemCode`),
    INDEX `items_center_idx`(`center`),
    INDEX `items_itemCode_idx`(`itemCode`),
    INDEX `items_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empNo` VARCHAR(20) NOT NULL,
    `itemCode` VARCHAR(50) NULL,
    `year` INTEGER NOT NULL,
    `month` TINYINT NOT NULL,
    `score` DOUBLE NOT NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `records_empNo_idx`(`empNo`),
    INDEX `records_itemCode_idx`(`itemCode`),
    INDEX `records_year_month_idx`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empNo` VARCHAR(20) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('EMPLOYEE', 'AREA_ADMIN', 'WORKSHOP_ADMIN', 'CENTER_ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'EMPLOYEE',
    `scopeArea` VARCHAR(50) NULL,
    `scopeWorkshop` VARCHAR(50) NULL,
    `scopeCenter` VARCHAR(50) NULL,
    `lastLogin` DATETIME(3) NULL,
    `refreshToken` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_empNo_key`(`empNo`),
    UNIQUE INDEX `users_username_key`(`username`),
    INDEX `users_empNo_idx`(`empNo`),
    INDEX `users_username_idx`(`username`),
    INDEX `users_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipientNo` VARCHAR(20) NOT NULL,
    `senderNo` VARCHAR(20) NULL,
    `type` ENUM('APPEAL_SUBMITTED', 'APPEAL_PROCESSED', 'TRANSFER_NOTIFY', 'RECORD_CHANGED', 'ROLE_CHANGED') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `relatedId` INTEGER NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_recipientNo_isRead_idx`(`recipientNo`, `isRead`),
    INDEX `notifications_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appeals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empNo` VARCHAR(20) NOT NULL,
    `recordId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `month` TINYINT NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `processorNo` VARCHAR(20) NULL,
    `response` TEXT NULL,

    INDEX `appeals_empNo_idx`(`empNo`),
    INDEX `appeals_status_idx`(`status`),
    INDEX `appeals_year_month_idx`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appeal_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appealId` INTEGER NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `operator` VARCHAR(20) NOT NULL,
    `details` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `appeal_history_appealId_idx`(`appealId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appeal_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `month` TINYINT NOT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `isOpen` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `appeal_settings_year_month_idx`(`year`, `month`),
    UNIQUE INDEX `appeal_settings_year_month_key`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `operatorNo` VARCHAR(20) NOT NULL,
    `actionType` VARCHAR(50) NOT NULL,
    `targetType` VARCHAR(50) NOT NULL,
    `targetId` VARCHAR(50) NOT NULL,
    `details` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_operatorNo_idx`(`operatorNo`),
    INDEX `audit_logs_actionType_idx`(`actionType`),
    INDEX `audit_logs_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `records` ADD CONSTRAINT `records_empNo_fkey` FOREIGN KEY (`empNo`) REFERENCES `employees`(`empNo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `records` ADD CONSTRAINT `records_itemCode_fkey` FOREIGN KEY (`itemCode`) REFERENCES `items`(`itemCode`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_empNo_fkey` FOREIGN KEY (`empNo`) REFERENCES `employees`(`empNo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipientNo_fkey` FOREIGN KEY (`recipientNo`) REFERENCES `users`(`empNo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_senderNo_fkey` FOREIGN KEY (`senderNo`) REFERENCES `users`(`empNo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appeals` ADD CONSTRAINT `appeals_empNo_fkey` FOREIGN KEY (`empNo`) REFERENCES `employees`(`empNo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appeals` ADD CONSTRAINT `appeals_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appeals` ADD CONSTRAINT `appeals_processorNo_fkey` FOREIGN KEY (`processorNo`) REFERENCES `users`(`empNo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appeal_history` ADD CONSTRAINT `appeal_history_appealId_fkey` FOREIGN KEY (`appealId`) REFERENCES `appeals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_operatorNo_fkey` FOREIGN KEY (`operatorNo`) REFERENCES `users`(`empNo`) ON DELETE CASCADE ON UPDATE CASCADE;
