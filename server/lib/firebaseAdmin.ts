import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';
import logger from './logger';

try {
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // If provided as a JSON string in ENV
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = cert(serviceAccount);
  } else {
    // Look for a local file if ENV string is not provided
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      credential = cert(serviceAccount);
    } else {
      logger.warn('No Firebase Service Account found. Firebase Admin will not be initialized.');
    }
  }

  if (credential && !getApps().length) {
    initializeApp({
      credential,
    });
    logger.info('Firebase Admin initialized successfully.');
  }
} catch (error) {
  logger.error(error, 'Failed to initialize Firebase Admin');
}

export const authAdmin = getAuth();
