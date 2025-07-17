import TelegramBot from "node-telegram-bot-api";
import { allVMs, allVMsReplyMarkup, helpMessage, initOptions, welcomeMessage } from "../const";
import { db } from "..";
import { createTnx } from "../tnx";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function botInit(bot: TelegramBot) {
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        try {
            const telegramId = msg.from?.id;
            const firstName = msg.from?.first_name;
            const lastName = msg.from?.last_name;
            const username = msg.from?.username;
            const user = await db.user.upsert({
                where: { telegramId: BigInt(telegramId!) },
                update: {},
                create: {
                    telegramId: BigInt(telegramId!),
                    firstName: firstName!,
                    lastName: lastName!,
                    username: username!,
                },
            })
            console.log("User created or updated:", user);
            await bot.sendMessage(chatId, welcomeMessage, initOptions);

        } catch (error) {
            console.error("Error in /start command:", error);
            await bot.sendMessage(chatId, "An error occurred while processing your request. Please try again later.");
        }
    });

    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, helpMessage);
    });
}

export async function handleCallbackQuery(bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery) {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    console.log("Callback query data:", action);

    if (!msg) return;
    const chatId = msg.chat.id;
    switchConditions(action!, chatId, bot);

    bot.answerCallbackQuery(callbackQuery.id);
}

export async function handleTextMessage(bot: TelegramBot, msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) {
        await bot.sendMessage(chatId, "I couldn't understand that message. Try using /help to see available commands.");
        return;
    }

    if (!text.startsWith('/')) {
        await bot.sendMessage(chatId, "I only understand commands that start with '/'. Try /help to see available options.");
        return;
    }

    let command = text.slice(1).toLowerCase();
    command = command.split(' ')[0];
    switchConditions(command, chatId, bot, text);
}

async function selectMachineMsg(chatId: number, bot: TelegramBot, vmName: string) {
    const vm = allVMs.find(vm => vm.name === vmName);
    const newTnx = await createTnx(chatId, vm!, 2);
    if (newTnx === null) {
        await bot.sendMessage(chatId, "Kindly use /start and start over.");
        return;
    }
    const { transaction, vmData } = newTnx;

    const solAmount = Number(transaction.lamports) / LAMPORTS_PER_SOL;

    await bot.sendMessage(chatId,
        (`*🖥️ VM Configuration Details*
                
                ━━━━━━━━━━━━━━━━━━
                🔹 *Type:* \`${vmData.type.toUpperCase()}\`
                🔸 *CPU:* \`${vmData.cpu} cores\`
                🔸 *RAM:* \`${vmData.ram} GB\`
                🔸 *Disk:* \`${vmData.disk} GB\`
                💰 *Hourly Price:* \`${vmData.price.toFixed(2)}SOL/hr\`
                ⏳ *Rental Period:* \`2 hours\`
                💵 *Total Cost:* \`${(vmData.price * 2).toFixed(2)}SOL\`
                ━━━━━━━━━━━━━━━━━━
                `), { parse_mode: 'Markdown' });


    await bot.sendMessage(chatId,
        (`*✅ Transaction Created!*
                    
━━━━━━━━━━━━━━━━━━
💰 *Amount to Send:*  
\`${solAmount.toFixed(9)} SOL\`
                    
🏦 *Recipient Address:*  
\`${transaction.paidToAddress}\`

━━━━━━━━━━━━━━━━━━                    
⚠️ _Send the exact amount only._
                    
⏳ _After payment confirmation on the blockchain, your virtual machine will be activated automatically._
                    
⏰ *You have 10 minutes to complete this transaction. After that, it will be canceled and you’ll need to start over.*
        `), { parse_mode: 'Markdown' });

    await bot.sendMessage(chatId, `Send the amount to the address below:\n\`${transaction.paidToAddress}\`\n\n*Amount to send:* \`${solAmount.toFixed(9)} SOL\``,
        { parse_mode: 'Markdown' });

    return;
}

async function switchConditions(cmd: string, chatId: number, bot: TelegramBot, msg?: string) {
    switch (cmd) {
        case 'help':
            await bot.sendMessage(chatId, helpMessage);
            return;

        case 'rent':
            await bot.sendMessage(chatId, 'Please choose a VM configuration to rent:', allVMsReplyMarkup);
            return;

        case 'my_vms':
            try {
                const user = await db.user.findUnique({
                    where: { telegramId: BigInt(chatId!) },
                    include: {
                        vms: true,
                    }
                });
                if (!user) {
                    await bot.sendMessage(chatId, "You need to register first. Use /start to register.");
                    break;
                }
                if (user.vms.length === 0) {
                    await bot.sendMessage(chatId, "You don't have any VMs rented. Use /rent to rent a new VM.");
                    break;
                }
                let message = `*Your VMs:*\n\n`;
                user.vms.forEach((vm) => {
                    message += `*${vm.name ? vm.name.toUpperCase() : 'UNKNOWN'}*\n`;
                    message += `• CPU: ${vm.cpu} cores\n`;
                    message += `• RAM: ${vm.ram} GB\n`;
                    message += `• IP: ${vm.ipAddress || 'Not assigned'}\n`;
                    message += `• Rented since: ${vm.rentedAt ? new Date(vm.rentedAt).toLocaleString() : 'Unknown'}\n`;
                    message += `• Expires at: ${vm.expiresAt ? new Date(vm.expiresAt).toLocaleString() : 'Not set'}\n`;
                });
                message += `*Total VMs rented: ${user.vms.length}*\n`;
                message += `*Total spent: ${user.vms.reduce((sum, vm) => sum + vm.price, 0).toFixed(2)}SOL*\n`;
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

            } catch (error) {
                console.error("Error fetching VMs:", error);
                await bot.sendMessage(chatId, "An error occurred while fetching your VMs. Please try again later.");
            }
            break;

        case 'available':
            const message = `*Available VM Configurations:*\n\n${allVMs.map((vm) => `*${vm.name.toUpperCase()}* \n• CPU: ${vm.cpu} cores \n• RAM: ${vm.ram} GB \n• Disk: ${vm.disk} GB \n• Price: $${vm.price.toFixed(2)}/hr \n• Status: ${vm.status}`).join('\n\n')}`;

            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            break;

        case 'usage':
            try {
                const user = await db.user.findUnique({
                    where: { telegramId: BigInt(chatId!) },
                    include: {
                        vms: true,
                        transactions: {
                            where: { status: 'confirmed' },
                            orderBy: { createdAt: 'desc' }
                        }
                    }
                });

                if (!user) {
                    await bot.sendMessage(chatId, "You need to register first. Use /start to register.");
                    break;
                }

                let usageMessage = `*Your Usage Statistics*\n\n`;
                usageMessage += `Active VMs: ${user.vms.filter(vm => vm.status === 'active').length}\n`;
                usageMessage += `Total VMs (all time): ${user.vms.length}\n`;
                usageMessage += `Total spent: ${user.transactions.reduce((sum, tnx) => {
                    return sum + Number(tnx.lamports) / Number(BigInt(LAMPORTS_PER_SOL));
                }, 0).toFixed(2)}SOL\n\n`;

                if (user.vms.length > 0) {
                    user.vms.forEach(vm => {
                        usageMessage += `*${vm.name ? vm.name.toUpperCase() : 'UNKNOWN'}*\n`;
                        usageMessage += `• CPU: ${vm.cpu} cores\n`;
                        usageMessage += `• RAM: ${vm.ram} GB\n`;
                        usageMessage += `• IP: ${vm.ipAddress || 'Not assigned'}\n`;
                        usageMessage += `• Rented since: ${vm.rentedAt ? new Date(vm.rentedAt).toLocaleString() : 'Unknown'}\n`;
                    });
                } else {
                    usageMessage += `You don't have any active VMs right now.\n`;
                    usageMessage += `Use /rent to rent a new VM.`;
                }
                await bot.sendMessage(chatId, usageMessage, { parse_mode: 'Markdown' });

            } catch (error) {
                console.error("Error fetching usage statistics:", error);
                await bot.sendMessage(chatId, "An error occurred while fetching your usage statistics. Please try again later.");
            }
            break;

        case 'select_vm_small':
            selectMachineMsg(chatId, bot, 'small');
            break;

        case 'select_vm_medium':
            selectMachineMsg(chatId, bot, 'medium');
            break;

        case 'select_vm_large':
            selectMachineMsg(chatId, bot, 'large');
            break;
    }
}