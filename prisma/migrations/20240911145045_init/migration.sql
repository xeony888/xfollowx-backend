-- CreateTable
CREATE TABLE "User" (
    "wallet" TEXT NOT NULL,
    "discordId" TEXT,
    "discordName" TEXT,
    "twitters" TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("wallet")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "ownerWallet" TEXT,
    "connectedDiscordServer" TEXT,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Server" ADD CONSTRAINT "Server_ownerWallet_fkey" FOREIGN KEY ("ownerWallet") REFERENCES "User"("wallet") ON DELETE SET NULL ON UPDATE CASCADE;
