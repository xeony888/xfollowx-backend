import { Request, Response, NextFunction } from 'express';
import { assertIsDiscordBot, verifyMessage, verifyServerPaidChain } from './utils';
import { PublicKey } from '@solana/web3.js';
import { prisma } from './server';
import { Subscription } from '@prisma/client';


export async function verifySignature(req: Request, res: Response, next: NextFunction) {
    try {
        let target = req.method === "POST" ? req.body : req.query;
        const { pubkey, signature, message } = target;
        const publicKey = new PublicKey(pubkey);

        const status = verifyMessage(message, signature, publicKey);
        if (status) {
            next();
        } else {
            return res.status(401).json({ error: "Unauthorized" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
}
export async function verifyUserOwnsServer(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        let target = req.method === "POST" ? req.body : req.query;
        const { pubkey } = target;
        const server = await prisma.server.findUnique({
            where: {
                id: Number(id),
            },
            include: {
                owner: true
            }
        });
        if (!server) {
            return res.status(404).json({ error: "Not found" });
        }
        if (server.owner && server.owner.wallet === pubkey) {
            return next();
        } else {
            return res.status(401).json({ error: "Not found" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
}
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
        const server = await prisma.server.findFirst({
            where: {
                connectedDiscordServer: guildId as string
            }
        });
        if (!server) {
            return res.status(404).json({ error: "Not found" });
        }
        if (server.subscription === Subscription.CHAIN) {
            const status = await verifyServerPaidChain(server.id);
            if (status) {
                return next();
            } else {
                return res.status(401).json({ error: "Unauthorized" });
            }
        } else if (server.subscription === Subscription.STRIPE) {
            // add stripe verification
            return next();
        } else {
            return res.status(401).json({ error: "Server not set up" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Internal server error" });
    }
}