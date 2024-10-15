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
    console.log("created webhook");
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
if (process.env.ENVIRONMENT !== "devnet") webhook();
app.get("/auth/twitter", async (req, res) => {
    try {
        const { state, code } = req.query;
        console.log({ state, code });
        const TWITTER_OAUTH_CLIENT_ID = process.env.TWITTER_CLIENT;
        const TWITTER_OAUTH_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

        // the url where we get the twitter access token from
        const TWITTER_OAUTH_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

        // we need to encrypt our twitter client id and secret here in base 64 (stated in twitter documentation)
        const BasicAuthToken = Buffer.from(`${TWITTER_OAUTH_CLIENT_ID}:${TWITTER_OAUTH_CLIENT_SECRET}`, "utf8").toString(
            "base64"
        );

        // filling up the query parameters needed to request for getting the token
        const twitterOauthTokenParams = {
            client_id: TWITTER_OAUTH_CLIENT_ID,
            code_verifier: "8KxxO-RPl0bLSxX5AWwgdiFbMnry_VOKzFeIlVA7NoA",
            redirect_uri: process.env.TWITTER_REDIRECT_URI,
            grant_type: "authorization_code",
        };
        const response = await axios.post(
            TWITTER_OAUTH_TOKEN_URL,
            new URLSearchParams({ ...twitterOauthTokenParams, code: code as string }).toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${BasicAuthToken}`,
                },
            }
        );
        const accessToken = response.data.access_token;
        const userResponse = await axios.get("https://api.twitter.com/2/users/me", {
            headers: {
                "Content-type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const user = userResponse.data.data;
        console.log(user);
        if (user) {
            await prisma.user.update({
                where: {
                    discordId: state as string
                },
                data: {
                    twitter: `@${user.username}`
                }
            });
            return res.redirect(process.env.REDIRECT_URL);
        } else {
            return res.status(404).json({ error: "User not found" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
});
app.get("/auth/discord", async (req, res) => {
    try {
        const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
        const code = req.query.code;
        const REDIRECT_URL = `${process.env.MINI_REDIRECT_URL}/auth/discord`;
        const formData = new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: "authorization_code",
            code: code.toString(),
            redirect_uri: REDIRECT_URL,
        });
        const response = await fetch('https://discord.com/api/v10/oauth2/token', {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }); //
        const json = await response.json();
        //console.log(json);
        const access = json.access_token;
        const refresh = json.refresh_token;
        const userInfo = await axios.get("https://discord.com/api/v10/users/@me",
            {
                headers: {
                    "Authorization": `Bearer ${access}`
                }
            }
        );
        const redirect = `${process.env.REDIRECT_URL}?username=${userInfo.data.username}&id=${userInfo.data.id}&access=${access}&refresh=${refresh})}`;
        console.log(redirect);
        return res.redirect(redirect);
        // sessionStorage.setItem("discord", JSON.stringify(userInfo.data));
        // sessionStorage.setItem("discord_access_token", access);
        // sessionStorage.setItem("discord_refresh_token", refresh);
        // window.location.href = "/";
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
});
app.post("/helio", async (req, res) => {
    try {
        console.log("called");
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
                console.log(`Server not found: ${serverId}`);
                return res.status(404).json({ error: "Not found" });
            }
            if (server.owner.discordName !== discordUser.username) {
                console.log(`Incorrect owner: ${server.owner.discordName}, ${discordUser.username}`);
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