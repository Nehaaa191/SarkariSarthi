// env.ts MUST be the first import — it calls dotenv.config() before any
// other module reads process.env (including passport.ts).
import './env';

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import './config/passport';
import authRoutes from './routes/auth';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Allow both Vite development ports + production frontend URL
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  // Production frontend URL from env (set this on Render)
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

// Shared CORS options
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
};

// Apply CORS to all routes (handles both simple and preflight requests)
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Authentication routes
app.use('/auth', authRoutes);

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`[SarkariSaathi Backend] Server running on http://localhost:${PORT}`);
    console.log(`[SarkariSaathi Backend] Allowed frontend origins:`, allowedOrigins);
    console.log(`[SarkariSaathi Backend] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[SarkariSaathi Backend] Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅ configured' : '⚠️  missing'}`);
  });

  // Gracefully handle port already in use errors
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\n[SarkariSaathi Backend] ❌ Port ${PORT} is already in use.\n` +
        `  → Stop the existing process first: lsof -ti :${PORT} | xargs kill -9\n` +
        `  → Or set a different PORT in backend/.env\n`
      );
    } else {
      console.error('[SarkariSaathi Backend] Server error:', err);
    }
    process.exit(1);
  });
}

export default app;
