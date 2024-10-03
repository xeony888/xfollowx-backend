import express from "express";
import cors from "cors";
import { verifyBot, verifyPayment, verifySignature, verifyUser, verifyUserOwnsServer } from "./middleware";
import { PrismaClient, Subscription } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();
const PORT = process.env.PORT || 3001;
const app = express();
app.use(cors());
app.use(express.json());

export const prisma = new PrismaClient();


app.get("/:user", verifyUser, async (req, res) => {
    try {
        const { user } = req.params;
        const data = await prisma.user.findUnique({
            where: {
                discordId: user,
            },
            include: {
                server: true
            }
        });
        if (data) {
            return res.status(200).json(data);
        } else {
            const u = await prisma.user.create({
                data: {
                    discordId: user,
                    discordName: req.query.discordName as string,
                }
            });
            return res.status(200).json(u);
        }
    } catch (e) {
        console.error(e);
        return res.status(500).send("Error");
    }
});
app.post("/:user/twitter/add", verifyUser, async (req, res) => {
    try {
        const { twitter } = req.body;
        const { user } = req.params;
        const u = await prisma.user.update({
            where: {
                discordId: user
            },
            data: {
                twitter,
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
app.post("/:user/twitter/remove", verifyUser, async (req, res) => {
    try {
        const { user } = req.params;
        const updatedUser = await prisma.user.update({
            where: {
                discordId: user,
            },
            data: {
                twitter: null
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
app.post("/server/:id/set/", verifyUser, verifyUserOwnsServer, async (req, res) => {
    try {
        const { type } = req.body;
        const { id } = req.params;
        let subscription = type === "chain" ? Subscription.CHAIN : Subscription.STRIPE;
        await prisma.server.update({
            where: {
                id: Number(id),
            },
            data: {
                subscription,
            }
        });
        return res.status(200).send("Success");
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
});
app.post("/server", verifyUser, async (req, res) => {
    try {
        const { discordId } = req.body;
        const server = await prisma.server.create({
            data: {
                owner: {
                    connect: {
                        discordId,
                    }
                },
                subscription: Subscription.UNDEFINED,
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
        const user = await prisma.user.findUnique({
            where: {
                discordId: userId,
            }
        });
        if (!user) return res.status(404).send("Not found");
        const server = await prisma.server.update({
            where: {
                id: Number(serverId),
                ownerDiscord: user.discordId,
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
app.get("/bot/twitters", verifyBot, verifyPayment, async (req, res) => {
    try {
        // add guild field to req
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