
import { PrismaClient } from "../generated/prisma";
import { generateNewAccount } from "../src/solana";
import { encryptKey } from "../src/solana/encrypt-decrypt";

async function main() {
    const db = new PrismaClient()
    for (let i = 1; i <= 3; i++) {
        const { walletNumber, derivePath, keysValue } = await generateNewAccount(i);
        const encryptedKey = await encryptKey(keysValue.secretKey);

        await db.solanaKeys.upsert({
            where: {
                id: walletNumber
            },
            create: {
                id: walletNumber,
                path: derivePath.solana,
                publicKey: keysValue.publicKey,
                encryptPrivateKey: encryptedKey
            },
            update: {
                path: derivePath.solana,
                publicKey: keysValue.publicKey,
                encryptPrivateKey: encryptedKey
            }
        })
    }
}

main()