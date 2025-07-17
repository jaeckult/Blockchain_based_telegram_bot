import { db, redisClient } from "..";
import { generateNewAccount } from "../solana";
import { encryptKey } from "../solana/encrypt-decrypt";
import { Payment, SolRedisData, VMRedisData } from "../types";
import { getStaticSolanaKey } from "../solana/fixed-wallet";

export async function setSolanaKeys({ id, publicKey, encryptedKey, derivationPath, inUse }: SolRedisData) {
    const key = `solana:keys:${id}`;

    await redisClient.hSet(key, {
        publicKey,
        encryptedKey,
        derivationPath,
        inUse: inUse.toString(),
    });

    const indexKey = "solana:keys:inUse:false";
    if (!inUse) {
        await redisClient.sAdd(indexKey, key);
    } else {
        await redisClient.sRem(indexKey, key);
    }

    // we can also push it our prisma db
    await db.solanaKeys.upsert({
        where: { id: Number(id) },
        update: {
            id: Number(id),
            publicKey,
            encryptPrivateKey: encryptedKey,
            path: derivationPath,
        },
        create: {
            id: Number(id),
            publicKey,
            encryptPrivateKey: encryptedKey,
            path: derivationPath,
        },
    });

}


export async function getUnusedSolanaKey() {
    return getStaticSolanaKey(); // always return the same key
}


export async function makeSolanaKeyUnused(publicKey: string) {
    console.log(`Looking for key with publicKey: ${publicKey}`);

    const inUseKeys = await redisClient.sMembers("solana:keys:inUse:true");
    console.log(`Found ${inUseKeys.length} keys in use`);

    let matchedKey = null;

    for (const key of inUseKeys) {
        const data = await redisClient.hGetAll(key);

        if (data && data.publicKey === publicKey) {
            matchedKey = key;
            console.log(`Found matching key: ${key}`);
            break;
        }
    }

    if (!matchedKey) {
        const notInUseKeys = await redisClient.sMembers("solana:keys:inUse:false");
        for (const key of notInUseKeys) {
            const data = await redisClient.hGetAll(key);
            if (data && data.publicKey === publicKey) {
                return;
            }
        }
        return;
    }
    await redisClient.sRem("solana:keys:inUse:true", matchedKey);
    await redisClient.sAdd("solana:keys:inUse:false", matchedKey);
    await redisClient.hSet(matchedKey, "inUse", "false");
}

export async function addNewPayment(payment: Payment) {
    const key = `payment:${payment.id}`;
    await redisClient.hSet(key, {
        userId: payment.userId,
        chatId: payment.chatId,
        amount: payment.amount.toString(),
        createdAt: payment.createdAt.toISOString(),
        expiryAt: payment.expiryAt.toISOString(),
        paidToAddress: payment.paidToAddress,
    });
    await redisClient.sAdd("payments", key);
}

export async function allPendingPayments() {
    const keys = await redisClient.sMembers("payments");
    const payments: Payment[] = [];

    for (const key of keys) {
        const data = await redisClient.hGetAll(key);
        if (data) {
            payments.push({
                id: key.split(":")[1],
                userId: String(data.userId),
                chatId: String(data.chatId),
                amount: BigInt(String(data.amount)),
                createdAt: new Date(String(data.createdAt)),
                expiryAt: new Date(String(data.expiryAt)),
                paidToAddress: String(data.paidToAddress),
            });
        }
    }
    return payments;
}

export async function removePayment(id: string) {
    const key = `payment:${id}`;
    await redisClient.del(key);
    await redisClient.sRem("payments", key);
}

export async function addVm(vm: VMRedisData) {
    const key = `vm:${vm.id}`;
    await redisClient.hSet(key, {
        instanceId: vm.instanceId,
        startTime: vm.startTime.toISOString(),
        endTime: vm.endTime.toISOString(),
        chatId: vm.chatId,
    });
    await redisClient.sAdd("vms", key);
}

export async function allRedisVms() {
    const keys = await redisClient.sMembers("vms");
    const vms: VMRedisData[] = [];

    for (const key of keys) {
        const data = await redisClient.hGetAll(key);
        if (data) {
            vms.push({
                id: key.split(":")[1],
                instanceId: String(data.instanceId),
                startTime: new Date(String(data.startTime)),
                endTime: new Date(String(data.endTime)),
                chatId: String(data.chatId),
            });
        }
    }
    return vms;
}

export async function rmVm(id: string){
    const key = `vm:${id}`;
    await redisClient.del(key);
    await redisClient.sRem("vms", key);
}