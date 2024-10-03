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

-- CreateIndex
CREATE UNIQUE INDEX "User_serverId_key" ON "User"("serverId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;
