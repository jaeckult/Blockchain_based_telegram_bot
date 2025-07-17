import { mnemonicToSeedSync } from "bip39";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import { solDerivePath } from "../const";
import { derivePath } from "ed25519-hd-key";
import bs58 from "bs58";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export async function generateNewAccount(account: number) {
    const seed = process.env.SOLANA_SEED!;
    const seedBuffer = mnemonicToSeedSync(seed);
    const solanaPath = solDerivePath(account - 1);
    const solanaDerivedSeed = derivePath(
        solanaPath,
        seedBuffer.toString("hex"),
    ).key;

    const solanaKeypair = Keypair.fromSeed(solanaDerivedSeed);
    const solanaPublicKey = solanaKeypair.publicKey.toBase58();
    const solanaSecretKey = bs58.encode(solanaKeypair.secretKey);

    return {
        walletNumber: account,
        derivePath: {
            solana: solanaPath,
        },
        keysValue: {
            publicKey: solanaPublicKey,
            secretKey: solanaSecretKey,
        },
    };
}

export async function signTnx(message: string, signatureBase64: string, solAddr: string) {
    const msg = new TextEncoder().encode(message);
    const signature = Uint8Array.from(Buffer.from(signatureBase64, 'base64'));
    const publicKey = new PublicKey(solAddr);

    return nacl.sign.detached.verify(
        msg,
        signature,
        publicKey.toBuffer()
    );
}

export function isValidSolanaAddress(address: string): boolean {
    try {
        const pubkey = new PublicKey(address);
        return PublicKey.isOnCurve(pubkey.toBuffer());
    } catch (e) {
        return false;
    }
}

export async function checkLatestPayment(minutesAgo: number, walletAddress: PublicKey) {

    const [latestSignature] = await connection.getSignaturesForAddress(walletAddress, { limit: 1 });
    console.log(`Latest signature: ${latestSignature?.signature}`);

    if (!latestSignature) {
        return null;
    }

    const tx = await connection.getTransaction(latestSignature.signature, {
        commitment: "confirmed"
    });


    if (!tx || !tx.meta || !tx.blockTime) {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeLimit = now - minutesAgo * 60;

    if (tx.blockTime < timeLimit) {
        return null;
    }

    const pre = tx.meta.preBalances[0];
    const post = tx.meta.postBalances[0];
    const fees = tx.meta.fee;
    const diff = pre - post - fees;

    if (diff > 0) {
        return {
            amount: diff,
            time: new Date(tx.blockTime * 1000).toISOString(),
            signature: latestSignature.signature,
            paidFromAddress: tx.transaction.message.accountKeys[0].toBase58(),
        }
    } else {
        return null;
    }
};
