-- CreateEnum
CREATE TYPE "Subscription" AS ENUM ('CHAIN', 'STRIPE', 'UNDEFINED');

-- CreateTable
CREATE TABLE "User" (
    "discordId" TEXT NOT NULL,
    "discordName" TEXT NOT NULL,
    "twitter" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("discordId")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" SERIAL NOT NULL,
    "ownerDiscord" TEXT NOT NULL,
    "connectedDiscordServer" TEXT,
    "connectedDiscordServerName" TEXT,
    "subscription" "Subscription" NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_Follow" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_Follow_AB_unique" ON "_Follow"("A", "B");

-- CreateIndex
CREATE INDEX "_Follow_B_index" ON "_Follow"("B");

-- AddForeignKey
ALTER TABLE "Server" ADD CONSTRAINT "Server_ownerDiscord_fkey" FOREIGN KEY ("ownerDiscord") REFERENCES "User"("discordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Follow" ADD CONSTRAINT "_Follow_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("discordId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Follow" ADD CONSTRAINT "_Follow_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("discordId") ON DELETE CASCADE ON UPDATE CASCADE;
