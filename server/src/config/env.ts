import 'dotenv/config';
import { z } from 'zod';
const envSchema = z.object({ NODE_ENV: z.enum(['development','test','production']).default('development'), PORT: z.coerce.number().default(5000), MONGODB_URI: z.string().default('mongodb://localhost:27017/ai-mystery-room'), JWT_SECRET: z.string().min(32,'JWT_SECRET must contain at least 32 characters.'), CLIENT_ORIGIN: z.string().default('http://localhost:5173'), GEMINI_API_KEY: z.string().optional(), GEMINI_TEXT_MODEL: z.string().optional(), GEMINI_IMAGE_MODEL: z.string().optional(), GEMINI_MOCK: z.string().default('true'), GENERATION_ENABLED: z.string().default('true'), MAX_CASES_PER_USER_PER_DAY: z.coerce.number().default(5), IMAGE_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(2), STORAGE_DIR: z.string().default('../storage') });
export const env = envSchema.parse(process.env);
if (env.GEMINI_MOCK !== 'true' && !env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required unless GEMINI_MOCK=true.');
if (env.GEMINI_MOCK !== 'true' && (!env.GEMINI_TEXT_MODEL || !env.GEMINI_IMAGE_MODEL)) throw new Error('GEMINI_TEXT_MODEL and GEMINI_IMAGE_MODEL are required when GEMINI_MOCK=false.');
