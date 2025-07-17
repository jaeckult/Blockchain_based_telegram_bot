# SolVM: Virtual Machine Rental with Solana Payments using

A Telegram bot that lets users rent Google Cloud Platform (GCP) virtual machines and pay with Solana (SOL) cryptocurrency.
<br/>
[**Try it now!**](https://solvmbot.vercel.app/)  
<br/>
This Project currenly works on Devnet. Make sure to change your Wallet RPC before payment.

## Demo Video
[![Demo Video](https://img.youtube.com/vi/rxWnLnO8p5w/0.jpg)](https://youtu.be/rxWnLnO8p5w)

## Project Overview

SolVM is a complete solution for renting cloud-based virtual machines through a Telegram interface. Users can:

- Browse available VM configurations
- Rent VMs with different resource tiers
- Pay for VM usage using Solana cryptocurrency
- Manage their active VMs
- Access VM usage statistics

The system automatically handles payment processing on the Solana blockchain, VM provisioning in Google Cloud, and expiration of VMs based on the rental period.

## Architecture
![solvm-architecture excalidraw](https://github.com/user-attachments/assets/a6ba4c3f-f360-45d6-a5ef-9753f17550f3)


The project is built with:

- **TypeScript**: Core language for the entire application
- **Solana Web3.js**: For blockchain interaction
- **Google Cloud Compute API**: For VM provisioning and management
- **Node.js**: Runtime environment
- **Prisma**: ORM for database management
- **Redis**: In-memory data store for payment processing and VM state
- **Telegram Bot API**: For user interface

## Key Components

1. **Bot Interface**: Handles all user interactions via TelegramThanks for the clarification.
2. **Payment Strategy to Resolve Conflicts**: Uses HD wallets to generate new addresses only when all cached addresses are in use
3. **Payment System**: Processes Solana cryptocurrency payments
4. **VM Management**: Creates, configures and terminates GCP VMs
5. **Cron Jobs**: Handles automated tasks like payment verification and VM expiration
6. **Security**: Includes private key encryption for secure wallet management

## Setup and Installation

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up environment variables (see `.env.example`)
4. Run database migrations with `npx prisma migrate dev`
5. Seed the database with `npm run db:seed`
6. Run the application with `npm run dev`

## Usage Flow

1. User starts the bot and gets registered
2. User selects a VM configuration to rent
3. System generates a Solana payment address
4. User sends SOL to the provided address
5. System verifies payment on the blockchain
6. VM is provisioned in Google Cloud
7. SSH access details are sent to the user
8. VM runs until the rental period expires
9. System automatically terminates expired VMs

## Development

- Run in development mode: `npm run dev`
- Reset the database and seed data: `npx prisma migrate reset`
- Add a new database migration: `npx prisma migrate dev --name migration_name`

## Security Considerations

- Private keys are encrypted using AES-256-GCM
- SSH keys are generated on-demand for each VM
- Users can only access their own VMs
