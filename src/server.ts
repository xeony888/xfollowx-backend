import express from "express";
import cors from "cors";
import { verifyBot, verifyPayment, verifySignature, verifyUser, verifyUserOwnsServer } from "./middleware";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();
const PORT = process.env.PORT || 3001;
const app = express();
app.use(cors());
app.use(express.json());
export const prisma = new PrismaClient();
let SHARED_TOKEN: string = "";
let WEBHOOK_ID: string = "";
async function webhook() {
    const options = {
        method: 'POST',
        url: 'https://api.hel.io/v1/webhook/stream/transaction',
        params: { apiKey: process.env.HELIO_PUBLIC_API }, // << update
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.HELIO_SECRET_API}` // << update
        },
        data: {
            streamId: '670a6f12cc50d45bfb6e101f',  // << update
            targetUrl: 'https://xfollowx-backend-production.up.railway.app/helio', // << update
            events: ['STARTED', 'ENDED']
        }
    };

    try {
        const { data: { id, sharedToken } } = await axios.request(options);
        console.log({ sharedToken, id });
        SHARED_TOKEN = sharedToken;
        WEBHOOK_ID = id;
    } catch (error) {
        console.error(error);
    }
}
if (!process.env.RPC_URL.includes("devnet")) webhook();
app.post("/helio", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${SHARED_TOKEN}`) {
            console.log("Unauthorized: ", req.body.event);
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { event, transaction: { meta: { customerDetails: { discordUser }, productDetails } } } = req.body;
        if (productDetails.name === "Server ID") {
            const serverId = productDetails.value;
            const server = await prisma.server.findUnique({
                where: {
                    id: serverId
                },
                include: {
                    owner: true
                }
            });
            if (!server) {
                return res.status(404).json({ error: "Not found" });
            }
            if (server.owner.discordName !== discordUser.username) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            let updatedServer: any;
            if (event === "STARTED") {
                console.log(`Subscribed ${serverId}`);
                updatedServer = await prisma.server.update({
                    where: {
                        id: serverId,
                    },
                    data: {
                        subscribed: true,
                    }
                });
                // authorize a subscription
            } else if (event === "ENDED") {
                console.log(`Ended ${serverId}`);
                updatedServer = await prisma.server.update({
                    where: {
                        id: serverId
                    },
                    data: {
                        subscribed: false
                    }
                });
                // deauthorize a subscription
            } else {
                return res.status(404).json({ error: "Invalid event type" });
            }
            return res.status(200).send("Success");
        } else {
            return res.status(401).json({ error: "Invalid product details" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
});
app.get("/:user", verifyUser, async (req, res) => {
    try {
        const { user } = req.params;
        const data = await prisma.user.findUnique({
            where: {
                discordId: user,
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
// app.post("/server/:id/set", verifyUser, verifyUserOwnsServer, async (req, res) => {
//     try {
//         const { type } = req.body;
//         const { id } = req.params;
//         let subscription = type === "chain" ? Subscription.CHAIN : Subscription.STRIPE;
//         await prisma.server.update({
//             where: {
//                 id,
//             },
//             data: {
//                 subscription,
//             }
//         });
//         return res.status(200).send("Success");
//     } catch (e) {
//         console.error(e);
//         return res.status(500).json({ error: "Internal server error" });
//     }
// });
app.post("/server/:id", verifyUser, verifyUserOwnsServer, async (req, res) => {
    try {
        const { id } = req.params;
        // console.log({ id });
        const server = await prisma.server.findUnique({
            where: { id }
        });
        if (server) {
            return res.status(200).json(server);
        } else {
            return res.status(404).json({ error: "Not found" });
        }
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
                subscribed: false,
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
        const { guildId, userId, serverId, guildName } = req.body;
        const user = await prisma.user.findUnique({
            where: {
                discordId: userId,
            }
        });
        if (!user) return res.status(404).send("Not found");
        const server = await prisma.server.update({
            where: {
                id: serverId,
                ownerDiscord: user.discordId,
            },
            data: {
                connectedDiscordServer: guildId,
                connectedDiscordServerName: guildName
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
app.get("/bot/:user/followed", verifyBot, async (req, res) => {
    try {
        const { user } = req.params;
        const data = await prisma.user.findUnique({
            where: {
                discordId: user
            },
            include: {
                following: true
            }
        });
        if (!data) {
            return res.status(404).json({ error: "Not found" });
        }
        res.status(200).json(data.following.map(d => d.discordId));
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
});
app.get("/bot/action/follow", verifyBot, async (req, res) => {
    try {
        const { follower, followee, url } = req.query;

        if (!follower || !followee) {
            return res.status(400).json({ error: "Missing follower or followee parameter" });
        }

        // Find the follower and followee users
        const followerUser = await prisma.user.findUnique({
            where: {
                discordId: follower as string,
            },
        });

        const followeeUser = await prisma.user.findUnique({
            where: {
                discordId: followee as string,
            },
        });

        if (!followerUser || !followeeUser) {
            return res.status(404).json({ error: "Follower or followee user not found" });
        }

        // Update follower's following list and followee's followedBy list
        await prisma.user.update({
            where: {
                discordId: follower as string,
            },
            data: {
                following: {
                    connect: {
                        discordId: followee as string,
                    },
                },
            },
        });

        await prisma.user.update({
            where: {
                discordId: followee as string,
            },
            data: {
                followedBy: {
                    connect: {
                        discordId: follower as string,
                    },
                },
            },
        });

        return res.redirect(`https://x.com/${url}`);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});