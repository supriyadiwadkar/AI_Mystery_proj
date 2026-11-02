import { z } from 'zod';

export const difficultySchema = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof difficultySchema>;
export const difficultyCounts: Record<Difficulty, { suspects: number; evidence: number; chats: number; images: number; cctv: number; redHerrings: number }> = {
  easy: { suspects: 4, evidence: 6, chats: 2, images: 2, cctv: 2, redHerrings: 1 },
  medium: { suspects: 5, evidence: 9, chats: 3, images: 3, cctv: 3, redHerrings: 2 },
  hard: { suspects: 6, evidence: 12, chats: 4, images: 4, cctv: 4, redHerrings: 3 },
};
export const seedSchema = z.object({ seedText: z.string().trim().min(20).max(600), difficulty: difficultySchema });
export { blueprintSchema, clueSchema, evidencePlanItemSchema, suspectSchema, timelineEventSchema } from './schemas/blueprint.js';
export type { Blueprint, EvidencePlanItem } from './schemas/blueprint.js';
export { chatEvidencePayloadSchema, imageEvidencePayloadSchema, cctvEvidencePayloadSchema, evidenceItemSchema } from './schemas/evidence.js';
export type { EvidenceItem } from './schemas/evidence.js';
export type Evidence = { evidenceId: string; type: 'chat'|'image'|'cctv'; title: string; description: string; discoveredAt: string; order: number; payload: Record<string, unknown> };
