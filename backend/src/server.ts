import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { errorHandler } from './middleware/error.middleware';

import healthRoutes from './routes/health.routes';
import analyticsRoutes from './routes/analytics.routes';
import transactionRoutes from './routes/transaction.routes';
import customerRoutes from './routes/customer.routes';
import campaignRoutes from './routes/campaign.routes';

import { Merchant } from './models/Merchant';
import { seedDatabase } from './seed/seedDatabase';

export function createApp(): Express {
  const app = express();

  // Security & Core Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('short'));
  }

  // API Route Mounts
  app.use('/api', healthRoutes);
  app.use('/api/merchants/:merchantId', analyticsRoutes);
  app.use('/api/merchants/:merchantId', transactionRoutes);
  app.use('/api/merchants/:merchantId', customerRoutes);
  app.use('/api/merchants/:merchantId', campaignRoutes);

  // 404 Route Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Cannot ${req.method} ${req.originalUrl}`,
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();

// Start Server if executed directly
if (require.main === module) {
  (async () => {
    try {
      await connectDatabase();
      const existingCount = await Merchant.countDocuments();
      if (existingCount === 0) {
        console.log('ℹ️  Database is empty. Automatically initializing deterministic seed...');
        await seedDatabase(false);
      }
      const server = app.listen(env.PORT, () => {
        console.log(`🚀 Paytm Merchant Autopilot Backend running on http://localhost:${env.PORT}`);
        console.log(`📊 Health check available at: http://localhost:${env.PORT}/api/health`);
      });

      const gracefulShutdown = async (signal: string) => {
        console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
        server.close(async () => {
          await disconnectDatabase();
          console.log('✅ Server and Database disconnected successfully.');
          process.exit(0);
        });
      };

      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    } catch (err: any) {
      console.error('❌ Fatal error during server startup:', err.message);
      process.exit(1);
    }
  })();
}
