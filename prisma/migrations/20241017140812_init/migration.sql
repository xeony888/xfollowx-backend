-- CreateTable
CREATE TABLE "User" (
    "discordId" TEXT NOT NULL,
    "discordName" TEXT NOT NULL,
    "twitter" TEXT,
    "days" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("discordId")
);

-- CreateTable
CREATE TABLE "Guild" (
    "guildId" TEXT NOT NULL,
    "guildName" TEXT NOT NULL,
    "userDiscordId" TEXT,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "Missed" (
    "id" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "Missed_pkey" PRIMARY KEY ("id")
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
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_userDiscordId_fkey" FOREIGN KEY ("userDiscordId") REFERENCES "User"("discordId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Follow" ADD CONSTRAINT "_Follow_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("discordId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Follow" ADD CONSTRAINT "_Follow_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("discordId") ON DELETE CASCADE ON UPDATE CASCADE;
