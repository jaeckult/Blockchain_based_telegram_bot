import { VM } from "../types";

export const welcomeMessage = `Hello!\nWelcome to Solana VM Bot.\nThis bot enables you to rent a cloud VM on Google Cloud Platform (GCP) and pay it via Solana.\n\nTo get started, please choose an option from the menu below.\nUse /help to see all commands.`;

export const initOptions = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '💻 Rent VM', callback_data: 'rent' },
                { text: '📋 My VMs', callback_data: 'my_vms' }
            ],
            [
                { text: 'Available VMs', callback_data: 'available' },
                { text: '📊 Usage Stats', callback_data: 'usage' },
            ],
            [
                { text: '❓ Help', callback_data: 'help' }
            ]
        ]
    }
};

export const helpMessage = `Solana VM Bot lets you rent a GCP VM and pay with Solana.\nAvailable commands:\n\n` +
    `/start - Start a new Session\n` +
    `/end - End the current session\n` +
    `/rent - Rent a new VM\n` +
    `/my_vms - List your rented VMs\n` +
    `/available - Show available VMs\n` +
    `/usage - Show usage statistics\n` +
    `/help - Show this help message\n` +
    `\nFor more information, visit our website.`;

export const allVMs: VM[] = [
    {
        name: 'small',
        cpu: 2,
        ram: 4,
        disk: 50,
        price: 0.01,
        status: 'available'
    },
    {
        name: 'medium',
        cpu: 4,
        ram: 8,
        disk: 100,
        price: 0.02,
        status: 'available'
    },
    {
        name: 'large',
        cpu: 8,
        ram: 16,
        disk: 200,
        price: 0.03,
        status: 'available'
    }
];

export const allVMsReplyMarkup = {
    reply_markup: {
        inline_keyboard: allVMs.map(vm => [
            {
                text: `${vm.name.toUpperCase()} | ${vm.cpu} CPU | ${vm.ram}GB RAM | ${vm.disk}GB | ${vm.price}SOL`,
                callback_data: `select_vm_${vm.name}`
            }
        ])
    }
};

export function vmStartInstructions(vmDetails: { ip: string; instanceName: string }, userId: string) {
    return `
    🖥️ *Your VM is ready!*
    
    *IP Address:* \`${vmDetails.ip}\`
    *Username:* \`user\`
    
    *SSH Connection Instructions:*
    
    *For Linux/Mac:*
    1. Save the private key file
    2. Run: \`chmod 600 private_key_${userId}.pem\`
    3. Connect: \`ssh -i private_key_${userId}.pem  -o StrictHostKeyChecking=no user@${vmDetails.ip}\`
    
    *For Windows:*
    1. Use PuTTY Key Generator to convert the key
    2. In PuTTY, set host to: \`${vmDetails.ip}\`
    3. Go to Connection > SSH > Auth > Credentials
    4. Browse to your converted private key
    5. Click "Open" and use username: \`user\`
    
    *Your VM Instance Name:*\n\`${vmDetails.instanceName}\`
    `;
}

export function solDerivePath(account: number): string {
    return `m/44'/501'/${account}'/0'`;
}