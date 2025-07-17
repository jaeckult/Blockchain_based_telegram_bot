import { config } from 'dotenv';
import { botInit, handleCallbackQuery, handleTextMessage } from './bot';
import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '../generated/prisma';
import { withAccelerate } from '@prisma/extension-accelerate';
import { createClient } from "redis";
import { setSolanaKeys } from './redis';
import cron from 'node-cron';
import { checkPayments, stopVms } from './cron';
config();

const token = process.env.TELEGRAM_BOT_TOKEN!;

export const db = new PrismaClient().$extends(withAccelerate());

export const bot = new TelegramBot(token, { polling: true });
botInit(bot);

console.log('Bot initialized');

bot.on('callback_query', async (callbackQuery) => {
    handleCallbackQuery(bot, callbackQuery);
});

bot.on('message', async (msg) => {
    handleTextMessage(bot, msg);
})

export const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
    await redisClient.connect();
    console.log('Connected to Redis');
    const solanaKeys = await db.solanaKeys.findMany();
    for (const key of solanaKeys) {
        console.log(`Setting Solana key ${key.id} to Redis`);
        await setSolanaKeys({
            id: key.id,
            publicKey: key.publicKey,
            encryptedKey: key.encryptPrivateKey,
            derivationPath: key.path,
            inUse: false
        })
    }
})();

cron.schedule('*/15 * * * * *', () => {
    console.log('Running cron job every 15 seconds');
    checkPayments();
});

cron.schedule('*/1 * * * *', () => {
    console.log('Running cron job every 1 minutes');
    stopVms();
});

