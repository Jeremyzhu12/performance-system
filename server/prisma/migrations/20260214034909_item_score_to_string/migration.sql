/*
  Warnings:

  - You are about to alter the column `score` on the `items` table. The data in that column could be lost. The data in that column will be cast from `Double` to `VarChar(50)`.

*/
-- AlterTable
ALTER TABLE `items` MODIFY `score` VARCHAR(50) NOT NULL;
