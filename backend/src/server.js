import app from './app.js';
import dotenv from 'dotenv';
import prisma from './config/db.js';
import { execSync } from 'child_process';

dotenv.config();

const PORT = process.env.PORT || 5000;
let server;

async function startServer() {
  try {
    // In production, ensure database schema is applied and seeded
    if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
      try {
        console.log('🔄 Checking database schema and running migrations...');
        execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
        console.log('🌱 Checking seed data...');
        execSync('node prisma/seed.js', { stdio: 'inherit' });
      } catch (syncErr) {
        console.warn('⚠️ Auto-sync note:', syncErr.message);
      }
    }

    // Verify database connectivity
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully via Prisma.');

    server = app.listen(PORT, () => {
      console.log(`🚀 CREDITGUARD Backend Server running on http://localhost:${PORT}`);
      console.log(`📡 Health endpoint: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to the database or start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('🔌 HTTP server closed.');
      try {
        await prisma.$disconnect();
        console.log('📦 Database connections released via Prisma.');
        process.exit(0);
      } catch (err) {
        console.error('Error disconnecting Prisma on shutdown:', err);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
