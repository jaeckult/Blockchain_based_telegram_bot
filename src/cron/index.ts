import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { bot, db } from "..";
import { allPendingPayments, allRedisVms, makeSolanaKeyUnused, removePayment, rmVm } from "../redis";
import { checkLatestPayment } from "../solana";
import { afterPayment } from "../vm/processor";
import { deleteUserVM } from "../vm";

export async function checkPayments() {
    const payments = await allPendingPayments();
    console.log(`Found ${payments.length} pending payments.`);
    if (payments.length === 0) {
        return;
    }
    const now = new Date();
    for (const payment of payments) {
        if (payment.expiryAt < now) {
            console.log(`Payment ${payment.id} has expired.`);
            await removePayment(payment.id);
            await makeSolanaKeyUnused(payment.paidToAddress);
            bot.sendMessage(payment.chatId, `*Your payment for ${(Number(payment.amount) / LAMPORTS_PER_SOL).toFixed(4)} SOL has expired.*\nPlease make a new payment.`, {
                parse_mode: 'Markdown',
            });
            await db.transaction.update({
                where: {
                    id: Number(payment.id),
                },
                data: {
                    status: 'expired',
                    updatedAt: new Date(),
                    vm: {
                        update: {
                            status: 'terminated',
                            updatedAt: new Date(),
                        },
                    }
                },
            }).catch((err) => {
                console.error(`Failed to update transaction status for payment ${payment.id}:`, err);
            })
        } else {
            const data = await checkLatestPayment(10, new PublicKey(payment.paidToAddress));
            if (data == null) {
                continue;
            }
            if (data && data.signature && data.amount > 0) {
                await removePayment(payment.id);
                await makeSolanaKeyUnused(payment.paidToAddress);
                bot.sendMessage(payment.chatId, `✅ *Your payment of ${data.amount / LAMPORTS_PER_SOL}SOL has been received!*`, {
                    parse_mode: 'Markdown',
                });
                try {
                    const transaction = await db.transaction.findUnique({
                        where: {
                            id: Number(payment.id),
                        },
                        include: {
                            vm: true,
                        },
                    });
                    if (!transaction) {
                        return;
                    }
                    if (transaction && transaction.lamports <= data.amount) {
                        await db.transaction.update({
                            where: {
                                id: transaction.id,
                            },
                            data: {
                                status: 'confirmed',
                                signature: data.signature,
                                paidFromAddress: data.paidFromAddress,
                                lamports: data.amount,
                                updatedAt: new Date(),
                                confirmedAt: new Date(),
                            },
                        });

                        bot.sendMessage(payment.chatId, `🎉 *Your payment of ${data.amount / LAMPORTS_PER_SOL}SOL has been confirmed!*\n\n*Signature:* \`${data.signature}\`\n*Paid from:* \`${data.paidFromAddress}\``, {
                            parse_mode: 'Markdown',
                        });
                        bot.sendMessage(payment.chatId, `🚀 *Starting your Virtual Machine...*`, {
                            parse_mode: 'Markdown',
                        });

                        const vm = await afterPayment({ chatId: payment.chatId, tnxId: Number(payment.id) });
                        if (vm != true) {
                            bot.sendMessage(payment.chatId, `⚠️ *Your payment has been confirmed, but there was an error processing the transaction.*`, {
                                parse_mode: 'Markdown',
                            });
                        }


                    } else {
                        console.log(`Transaction not found or amount mismatch for payment ${payment.id}.`);

                        bot.sendMessage(payment.chatId, `❌ *The payment of ${data.amount / LAMPORTS_PER_SOL}SOL is not enough to start your Virtual Machine.*\nPlease make a new payment.`, {
                            parse_mode: 'Markdown',
                        });
                        await db.transaction.update({
                            where: {
                                id: Number(payment.id),
                            },
                            data: {
                                status: 'failed',
                                type: 'refund',
                                signature: data.signature,
                                updatedAt: new Date(),
                            },
                        });
                    }
                } catch (err) {
                    console.error(`Failed to update transaction status for payment ${payment.id}:`, err);
                }
            }
        }
    }
}

export async function stopVms() {
    const vms = await allRedisVms();
    console.log(`Found ${vms.length} VMs.`);
    if (vms.length === 0) return;
    const now = new Date();
    for (const vm of vms) {
        try {
            if (vm.endTime < now) {
                console.log(`VM ${vm.id} has expired.`);
                bot.sendMessage(vm.chatId, `*Your VM has expired..*\nClosing the VM now...`, {
                    parse_mode: 'Markdown',
                });
                const delVm = await deleteUserVM(vm.instanceId);
                if (delVm != true) {
                    bot.sendMessage(vm.chatId, `*There was an error terminating your VM.*`, {
                        parse_mode: 'Markdown',
                    });
                }
                const dbVm = await db.vM.findFirst({
                    where: {
                        instanceId: vm.instanceId
                    }
                });
                if (dbVm) {
                    await db.vM.update({
                        where: {
                            id: dbVm.id
                        },
                        data: {
                            status: 'terminated',
                            updatedAt: new Date(),
                        }
                    });
                }
                bot.sendMessage(vm.chatId, `*Your Virtual Machine with instance ID ${vm.instanceId} has been deleted.*\nThankyou for using SolVM!!`, {
                    parse_mode: 'Markdown',
                });
                await rmVm(vm.id);
            }
        } catch (err) {
            console.error(`Failed to delete VM ${vm.id}:`, err);
            bot.sendMessage(vm.chatId, `*There was an error terminating your VM.*`, {
                parse_mode: 'Markdown',
            });
        }
    }
}