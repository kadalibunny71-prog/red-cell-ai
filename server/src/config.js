import 'dotenv/config';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8787),
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',').map((url) => url.trim()).filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAccessToken: process.env.SUPABASE_ACCESS_TOKEN,
  supabaseProjectRef: process.env.SUPABASE_PROJECT_REF,
  jwtSecret: process.env.JWT_SECRET,
  sessionDays: Math.min(Math.max(Number(process.env.SESSION_DAYS || 30), 1), 90),
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  autoMigrate: process.env.AUTO_MIGRATE === 'true'
};

export function getMissingConfig() {
  return required.filter((key) => !process.env[key]);
}

export function isProduction() {
  return config.nodeEnv === 'production';
}
