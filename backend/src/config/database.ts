import mongoose from 'mongoose';
import { env } from './env';

let mongoMemoryServer: any = null;

export async function connectDatabase(customUri?: string): Promise<typeof mongoose> {
  const targetUri = customUri || env.MONGODB_URI;

  if (env.USE_MEMORY_DB) {
    console.log('ℹ️  USE_MEMORY_DB enabled: starting in-memory MongoDB instance...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create();
    const uri = mongoMemoryServer.getUri();
    console.log(`✅ In-memory MongoDB started at: ${uri}`);
    await mongoose.connect(uri);
    return mongoose;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`✅ Connected to MongoDB at: ${targetUri}`);
    return mongoose;
  } catch (err: any) {
    if (env.NODE_ENV !== 'production') {
      console.warn(`⚠️  Could not connect to external MongoDB at ${targetUri} (${err.message}).`);
      console.log('🔄 Falling back to embedded in-memory MongoDB for local development/testing...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongoMemoryServer = await MongoMemoryServer.create();
        const memoryUri = mongoMemoryServer.getUri();
        console.log(`✅ Embedded in-memory MongoDB initialized at: ${memoryUri}`);
        await mongoose.connect(memoryUri);
        return mongoose;
      } catch (memErr: any) {
        console.error('❌ Failed to start embedded in-memory MongoDB:', memErr.message);
        throw err;
      }
    }
    console.error('❌ MongoDB Connection error:', err);
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
}
