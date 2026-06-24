// ═══════════════════════════════════════════════════════════════
// Prisma Client Singleton — IELTSPRACTICE
//
// ALL files MUST use this singleton instead of `new PrismaClient()`.
// This prevents connection pool exhaustion from multiple instances.
//
// Usage:
//   const prisma = require('../models/prisma');
// ═══════════════════════════════════════════════════════════════

'use strict';

const { PrismaClient } = require('@prisma/client');

// Use a global variable to prevent multiple instances during hot-reload
const globalForPrisma = globalThis;

if (!globalForPrisma.__prisma) {
  globalForPrisma.__prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error'],
  });
}

const prisma = globalForPrisma.__prisma;

module.exports = prisma;
