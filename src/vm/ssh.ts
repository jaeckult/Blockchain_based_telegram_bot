import { generateKeyPairSync } from 'crypto';
import * as sshpk from 'sshpk';

export function generateSSHKeyPair() {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    const pemKey = sshpk.parseKey(publicKey, 'pem');
    const sshPublicKey = pemKey.toString('ssh');

    return {
        privateKey,
        publicKey: sshPublicKey
    };
}