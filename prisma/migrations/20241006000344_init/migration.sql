-- CreateEnum
CREATE TYPE "Subscription" AS ENUM ('CHAIN', 'STRIPE', 'UNDEFINED');

-- CreateTable
CREATE TABLE "User" (
    "discordId" TEXT NOT NULL,
    "discordName" TEXT NOT NULL,
    "twitter" TEXT,
    "serverId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("discordId")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" SERIAL NOT NULL,
    "ownerDiscord" TEXT NOT NULL,
    "connectedDiscordServer" TEXT,
    "subscription" "Subscription" NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_Follow" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_serverId_key" ON "User"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "_Follow_AB_unique" ON "_Follow"("A", "B");

-- CreateIndex
CREATE INDEX "_Follow_B_index" ON "_Follow"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Follow" ADD CONSTRAINT "_Follow_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("discordId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Follow" ADD CONSTRAINT "_Follow_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("discordId") ON DELETE CASCADE ON UPDATE CASCADE;
