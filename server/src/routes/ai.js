import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { generateHelp } from '../services/gemini.js';
import { asyncHandler } from '../utils/http.js';

const router = express.Router();
const schema = z.object({
  action: z.enum(['draft', 'summarize', 'checklist']),
  details: z.object({
    bloodGroup: z.string().max(10).optional(),
    component: z.string().max(50).optional(),
    unitsNeeded: z.union([z.string(), z.number()]).optional(),
    hospitalName: z.string().max(150).optional(),
    location: z.string().max(200).optional(),
    urgency: z.string().max(20).optional(),
    neededBy: z.string().max(50).optional(),
    description: z.string().max(2000).optional()
  })
});

router.post('/generate', requireAuth, asyncHandler(async (req, res) => {
  const input = schema.parse(req.body);
  const text = await generateHelp(input);
  res.json({ text });
}));

export default router;
