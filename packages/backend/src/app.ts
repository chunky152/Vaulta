import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';
import { defaultRateLimiter } from './middleware/rateLimit.middleware.js';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Compression
  app.use(compression());

  // Request logging
  if (config.env !== 'test') {
    app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  }

  // Body parsing (skip for Stripe webhook which needs raw body)
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/v1/payments/webhook') {
      next();
    } else {
      express.json({ limit: '10mb' })(req, res, next);
    }
  });
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  app.use(defaultRateLimiter);

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // API routes
  app.use(`/api/${config.apiVersion}`, routes);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      name: 'Unbur API',
      version: '1.0.0',
      documentation: `/api/${config.apiVersion}/docs`,
      health: `/api/${config.apiVersion}/health`,
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
