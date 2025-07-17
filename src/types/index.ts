export interface VM {
    name: string;
    cpu: number;
    ram: number;
    disk: number;
    price: number;
    status: 'available' | 'rented' | 'terminated';
}

export interface SolRedisData {
    id: string | number;
    publicKey: string;
    encryptedKey: string;
    derivationPath: string;
    inUse: boolean;
}

export interface VMRedisData {
    id: string;
    instanceId: string;
    startTime: Date;
    endTime: Date;
    chatId: string;
}

export interface Payment {
    id: string;
    amount: bigint;
    createdAt: Date;
    expiryAt: Date;
    paidToAddress: string;
    userId: string;
    chatId: string;
}