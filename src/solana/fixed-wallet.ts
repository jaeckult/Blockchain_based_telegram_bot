export function getStaticSolanaKey() {
    const address = process.env.SOLANA_RECEIVER_ADDRESS;
    if (!address) throw new Error("SOLANA_RECEIVER_ADDRESS is not set in .env");

    return {
        id: "static",
        publicKey: address,
        encryptedKey: "unused",
        derivationPath: "m/44'/501'/0'/0'",
        inUse: true,
    };
}
