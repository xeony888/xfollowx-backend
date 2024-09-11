import express from "express";
import cors from "cors";
import { verifyBot, verifySignature } from "./middleware";
import { PrismaClient } from "@prisma/client";


const PORT = process.env.PORT || 3001;
const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();


app.get("/:user", verifySignature, async (req, res) => {
    try {
        const { user } = req.params;
        const data = await prisma.user.findUnique({
            where: {
                wallet: user,
            },
            include: {
                servers: true
            }
        });
        if (data) {
            return res.status(200).json(data);
        } else {
            const u = await prisma.user.create({
                data: {
                    wallet: user,
                }
            });
            return res.status(200).json(u);
        }
    } catch (e) {
        console.error(e);
        return res.status(500).send("Error");
    }
});
app.post("/:user/twitter/add", verifySignature, async (req, res) => {
    try {
        const { twitter } = req.body;
        const { user } = req.params;
        const u = await prisma.user.update({
            where: {
                wallet: user
            },
            data: {
                twitters: {
                    push: twitter,
                }
            }
        });
        if (u) {
            return res.status(200).send("Success");
        } else {
            return res.status(404).send("Not found");
        }
    } catch (e) {
        console.error(e);
        return res.status(500).send("Error");
    }
});
app.post("/:user/twitter/remove", verifySignature, async (req, res) => {
    try {
        const { twitter } = req.body;
        const { user } = req.params;
        const u = await prisma.user.findUnique({
            where: {
                wallet: user, // Replace with the actual wallet value
            },
        });
        if (!u) return res.status(404).send("Not found");
        const updatedTwitters = u.twitters.filter((t) => t !== twitter);
        const updatedUser = await prisma.user.update({
            where: {
                wallet: user,
            },
            data: {
                twitters: updatedTwitters
            },
        });
        if (updatedUser) {
            return res.status(200).send("Success");
        } else {
            return res.status(404).send("Not found");
        }
    } catch (e) {
        console.error(e);
        return res.status(500).send("Error");
    }
});
app.post("/:user/discord", verifySignature, async (req, res) => {
    try {
        const { user } = req.params;
        const { discord_id, discord_name } = req.body;
        const updated = await prisma.user.update({
            where: {
                wallet: user,
            },
            data: {
                discordId: discord_id,
                discordName: discord_name
            }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).send("Error");
    }
});
app.post("/server", verifySignature, async (req, res) => {
    try {
        const { pubkey } = req.body;
        const server = await prisma.server.create({
            data: {
                owner: {
                    connect: {
                        wallet: pubkey
                    }
                }
            }
        });
        return res.status(200).json(server);
    } catch (e) {
        console.error(e);
        return res.status(500).send("Error");
    }
});
app.post("/bot/link", verifyBot, async (req, res) => {
    try {
        const { guildId, userId, serverId } = req.body;
        const user = await prisma.user.findFirst({
            where: {
                discordId: userId,
            }
        });
        if (!user) return res.status(404).send("Not found");
        const server = await prisma.server.update({
            where: {
                id: serverId,
                ownerWallet: user.wallet,
            },
            data: {
                connectedDiscordServer: guildId,
            }
        });
        if (server) {
            return res.status(200).send("Success");
        } else {
            return res.status(404).send("Not found");
        }
    } catch (e) {
        console.error(e);
        return res.status(500).send("Error");
    }
});

app.get("/bot/link", verifyBot, async (req, res) => {
    try {
        const { guildId } = req.query;
        const server = await prisma.server.findFirst({
            where: {
                connectedDiscordServer: guildId as string
            }
        });
        if (server) {
            return res.status(200).json(server);
        } else {
            return res.status(404).send("Not found");
        }
    } catch (e) {
        console.error(e);
        return res.status(500).send("Error");
    }
});
app.get("/bot/twitters", verifyBot, async (req, res) => {
    try {
        const { memberIds } = req.query;
        const users = await prisma.user.findMany({
            where: {
                discordId: {
                    in: (memberIds as string).split(",")
                }
            }
        });
        return res.status(200).json(users);
    } catch (e) {
        console.error(e);
        return res.status(500).send("Error");
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});