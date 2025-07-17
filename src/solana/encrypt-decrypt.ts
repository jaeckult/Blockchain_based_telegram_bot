import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { config } from "dotenv";
config();

const encryptionSecret = process.env.ENCRYPTION_SECRET!
const ENCRYPTION_KEY = Buffer.from(encryptionSecret, "hex");

export function encryptKey(secretKey: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(secretKey, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptKey(encryptedData: string): string {
    const data = Buffer.from(encryptedData, "base64");

    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const encrypted = data.slice(28);

    const decipher = createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
}
