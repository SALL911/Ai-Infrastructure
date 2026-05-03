import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: Number(process.env.PORT) || 3000,
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'user',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'symcio',
    },
    api: {
        baseUrl: process.env.API_BASE_URL || '/api',
    },
    hubspot: {
        accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
    },
    email: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        fromAddress: process.env.EMAIL_FROM,
        internalRecipient: process.env.EMAIL_INTERNAL_RECIPIENT,
    },
    webhooks: {
        slackUrl: process.env.SLACK_WEBHOOK_URL,
        discordUrl: process.env.DISCORD_WEBHOOK_URL,
    },
};

export default config;
