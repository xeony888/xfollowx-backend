import { Request, Response, NextFunction } from 'express';
import { assertIsDiscordBot, verifyMessage } from './utils';
import { PublicKey } from '@solana/web3.js';


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