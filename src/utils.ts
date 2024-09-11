import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

export function verifyMessage(message: any, signature: any, pubkey: PublicKey): boolean {
    const m = bs58.decode(message);
    const sig = bs58.decode(signature);
    return nacl.sign.detached.verify(m, sig, pubkey.toBuffer());
}
export function assertIsDiscordBot(key: string) {
    return key === process.env.DISCORD_BOT_TOKEN;
}