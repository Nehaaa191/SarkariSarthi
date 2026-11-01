/**
 * This module must be the FIRST import in index.ts.
 * It calls dotenv.config() before any other module reads process.env.
 *
 * Background: ES/CJS static imports are hoisted and resolved before any
 * code in the importing file executes. If passport.ts (or any module that
 * reads process.env) is imported before dotenv.config() runs, environment
 * variables will be undefined — causing "credentials are missing" errors
 * even when .env is correctly configured.
 */
import dotenv from 'dotenv';
dotenv.config();
