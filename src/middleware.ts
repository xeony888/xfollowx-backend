import { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import { prisma } from './server';

function assertIsDiscordBot(key: string) {
    return key === process.env.DISCORD_BOT_TOKEN;
}
export async function verifyUser(req: Request, res: Response, next: NextFunction) {
    try {
        const target = req.method === "POST" ? req.body : req.query;
        const { discordId, access } = target;
        const response = await fetch("https://discord.com/api/v10/users/@me",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${access}`
                }
            }
        );
        if (response.ok) {
            const userInfo = await response.json();
            if (userInfo.id === discordId) {
                return next();
            } else {
                return res.status(403).json({ error: "Unauthorized" });
            }
        } else {
            return res.status(404).json({ error: "Not found" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
}
// export async function verifyUserOwnsServer(req: Request, res: Response, next: NextFunction) {
//     try {
//         const { id } = req.params;
//         let target = req.method === "POST" ? req.body : req.query;
//         const { discordId } = target;
//         const server = await prisma.server.findUnique({
//             where: {
//                 id,
//             },
//             include: {
//                 owner: true
//             }
//         });
//         if (!server) {
//             return res.status(404).json({ error: "Not found" });
//         }
//         if (server.owner && server.owner.discordId === discordId) {
//             return next();
//         } else {
//             return res.status(401).json({ error: "Not found" });
//         }
//     } catch (e) {
//         console.error(e);
//         return res.status(500).json({ error: "Internal server error" });
//     }
// }
export async function verifyBot(req: Request, res: Response, next: NextFunction) {
    try {
        const { key } = req.query;
        const status = assertIsDiscordBot(key as string);
        if (status) {
            next();
        } else {
            return res.status(401).json({ error: "Bot unauthorized" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
        const { guildId } = req.query;
        const guild = await prisma.guild.findUnique({
            where: {
                guildId: guildId as string,
            },
            include: {
                User: true
            }
        });
        if (!guild) {
            return res.status(404).json({ error: "Not found" });
        }
        if (guild.User.days > 0) {
            return next();
        } else {
            return res.status(401).json({ error: "You haven't paid" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
}