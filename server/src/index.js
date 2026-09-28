import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { config, getMissingConfig } from './config.js';
import { applySchema } from './services/schema.js';
import { verifyDatabaseConnection } from './services/supabase.js';
import authRoutes from './routes/auth.js';
import itemRoutes from './routes/items.js';
import aiRoutes from './routes/ai.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const missing = getMissingConfig();
if (missing.length) console.warn(`Configuration warning: missing ${missing.join(', ')}. Requests that need these services will fail until configured.`);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.clientUrls.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '250kb' }));
app.use(cookieParser());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: { message: 'Too many attempts. Please wait a few minutes and try again.', code: 'RATE_LIMITED' } } });
const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: { message: 'AI assist limit reached. Please try again shortly.', code: 'RATE_LIMITED' } } });

app.get('/api/health', async (req, res) => {
  if (missing.length) return res.status(503).json({ ok: false, service: 'red-cell.ai API', missing });
  try {
    await verifyDatabaseConnection();
    return res.json({ ok: true, service: 'red-cell.ai API', time: new Date().toISOString() });
  } catch (error) {
    return res.status(503).json({ ok: false, service: 'red-cell.ai API', database: 'unavailable' });
  }
});
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: { message: 'API route not found.', code: 'NOT_FOUND' } }));

app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    return res.status(400).json({ error: { message: issue?.message || 'Please check the submitted information.', code: 'VALIDATION_ERROR', field: issue?.path?.join('.') } });
  }
  if (err?.message === 'Origin is not allowed by CORS.') return res.status(403).json({ error: { message: 'This site is not allowed to call the API.', code: 'CORS_DENIED' } });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  return res.status(status).json({ error: { message: status >= 500 ? 'Something went wrong on our side. Please try again.' : err.message, code: err.code || 'INTERNAL_ERROR' } });
});

async function start() {
  if (config.autoMigrate && !missing.length) {
    try { await applySchema(); console.log('Database schema checked and applied.'); }
    catch (error) { console.error(`Automatic migration failed: ${error.message}`); process.exit(1); }
  }
  app.listen(config.port, '0.0.0.0', () => console.log(`red cell.ai API listening on port ${config.port}`));
}

start();
