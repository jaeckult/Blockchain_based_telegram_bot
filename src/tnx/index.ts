import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { db } from "..";
import { VM } from "../types";
import { VMType } from "../../generated/prisma";
import { addNewPayment, getUnusedSolanaKey } from "../redis";

export async function createTnx(chatId: number, vm: VM, hr: number) {
    const user = await db.user.findUnique({
        where: {
            telegramId: BigInt(chatId),
        },
    });
    if (!user) {
        console.log('User not found. Cannot create transaction.');
        return null;
    }

    const type = vm.name[0] as VMType;
    const vmData = await db.vM.create({
        data: {
            type,
            cpu: vm.cpu,
            ram: vm.ram,
            disk: vm.disk,
            price: vm.price,
            status: 'pending',
            userId: user.id,
        }
    });

    if (!vmData) {
        console.log('VM data not found. Cannot create transaction.');
        return null;
    }

    const payTo = await getUnusedSolanaKey();

    const transaction = await db.transaction.create({
        data: {
            userId: user.id,
            lamports: vmData.price * LAMPORTS_PER_SOL * hr,
            paidToAddress: payTo.publicKey,
            status: 'pending',
            type: 'payment',
            vmId: vmData.id,
        },
    });

    await addNewPayment({
        id: (transaction.id).toString(),
        userId: (user.id).toString(),
        chatId: (chatId).toString(),
        amount: transaction.lamports,
        createdAt: new Date(),
        expiryAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        paidToAddress: payTo.publicKey,
    })

    return { transaction, user, vmData };
}
