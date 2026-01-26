// Configuration loader with validation
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load .env file
dotenvConfig({ path: resolve(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  apiVersion: string;

  database: {
    url: string;
  };

  redis: {
    url: string;
  };

  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };

  stripe: {
    secretKey: string;
    webhookSecret: string;
  };

  sendgrid: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };

  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };

  cors: {
    origin: string[];
  };

  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

function getEnvVarInt(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required`);
    }
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

export const config: Config = {
  env: getEnvVar('NODE_ENV', 'development'),
  port: getEnvVarInt('PORT', 3000),
  apiVersion: getEnvVar('API_VERSION', 'v1'),

  database: {
    url: getEnvVar('DATABASE_URL'),
  },

  redis: {
    url: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  },

  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    expiresIn: getEnvVar('JWT_EXPIRES_IN', '15m'),
    refreshSecret: getEnvVar('JWT_REFRESH_SECRET'),
    refreshExpiresIn: getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  stripe: {
    secretKey: getEnvVar('STRIPE_SECRET_KEY', ''),
    webhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET', ''),
  },

  sendgrid: {
    apiKey: getEnvVar('SENDGRID_API_KEY', ''),
    fromEmail: getEnvVar('SENDGRID_FROM_EMAIL', 'noreply@vaulta.com'),
    fromName: getEnvVar('SENDGRID_FROM_NAME', 'Vaulta'),
  },

  twilio: {
    accountSid: getEnvVar('TWILIO_ACCOUNT_SID', ''),
    authToken: getEnvVar('TWILIO_AUTH_TOKEN', ''),
    phoneNumber: getEnvVar('TWILIO_PHONE_NUMBER', ''),
  },

  cors: {
    origin: getEnvVar('CORS_ORIGIN', 'http://localhost:5173').split(','),
  },

  rateLimit: {
    windowMs: getEnvVarInt('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getEnvVarInt('RATE_LIMIT_MAX_REQUESTS', 100),
  },
};

export const isProduction = config.env === 'production';
export const isDevelopment = config.env === 'development';
export const isTest = config.env === 'test';
