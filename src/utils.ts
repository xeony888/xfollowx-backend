import bs58 from "bs58";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import idl from "./lens_payment.json";
import dotenv from "dotenv";

dotenv.config();

export const GROUP_ID: number = 26;
export const LEVEL: number = 1;
export const connection = new Connection(process.env.RPC_URL!);
const wallet = new Wallet(Keypair.generate());
export const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
export const program: any = new Program(idl as any, provider);

export function verifyMessage(message: any, signature: any, pubkey: PublicKey): boolean {
    const m = bs58.decode(message);
    const sig = bs58.decode(signature);
    return nacl.sign.detached.verify(m, sig, pubkey.toBuffer());
}
export function assertIsDiscordBot(key: string) {
    return key === process.env.DISCORD_BOT_TOKEN;
}
export async function verifyServerPaidChain(id: number): Promise<boolean> {

    const [paymentAccountAddress] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("payment"),
            new BN(GROUP_ID).toArrayLike(Buffer, "le", 8),
            new BN(id).toArrayLike(Buffer, "le", 8),
            new BN(LEVEL).toArrayLike(Buffer, "le", 1)
        ],
        program.programId
    );
    try {
        const paymentAccount = await program.account.paymentAccount.fetch(paymentAccountAddress);
        const until = paymentAccount.until.toNumber() * 1000;
        return until > Date.now();
    } catch (e) {
        console.error(e);
        return false;
    }
}
