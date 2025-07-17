import { createUserVM } from ".";
import { bot, db } from "..";
import { vmStartInstructions } from "../const";
import * as fs from 'fs';
import { addVm } from "../redis";

export async function afterPayment({ chatId, tnxId }: { chatId: string, tnxId: number }) {
    try {
        const instanceName = `${chatId}-${Date.now()}`;
        const vmDetails = await createUserVM(`${instanceName}`);
        if (!vmDetails) {
            await bot.sendMessage(chatId, `We ran into an issue while creating your VM. \nContact support for assistance.`);
            return false;
        }

        await db.transaction.update({
            where: {
                id: tnxId
            },
            data: {
                vmStatus: 'started',
                vm: {
                    update: {
                        instanceId: vmDetails.instanceName,
                        ipAddress: vmDetails.ip,
                        status: 'active',
                        zone: vmDetails.zone,
                        sshKey: vmDetails.privateKey,
                        rentedAt: new Date(),
                        expiresAt: new Date(Date.now() + 60 * 60 * 1000 * 2),
                    }
                }
            }
        })

        await addVm({
            id: instanceName,
            instanceId: vmDetails.instanceName,
            startTime: new Date(),
            endTime: new Date(Date.now() + 60 * 60 * 1000 * 2),
            chatId: chatId,
        })

        await bot.sendDocument(chatId,
            fs.readFileSync(vmDetails.keyFilePath),
            {
                caption: `Save this private key file securely. Never share it with anyone. Filename: private_key_${chatId}.pem`,
            }, {
            filename: `private_key_${chatId}.pem`,
            contentType: 'application/x-pem-file',
        }
        );

        fs.unlinkSync(vmDetails.keyFilePath);

        await bot.sendMessage(chatId, vmStartInstructions(vmDetails, chatId), {
            parse_mode: 'Markdown',
        });
        return true;
    } catch (error) {
        console.error('Error processing after payment:', error);
        return false;
    }

}