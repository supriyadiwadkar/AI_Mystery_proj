import { z } from 'zod';

export const chatEvidencePayloadSchema=z.object({platform:z.literal('whatsapp'),participants:z.array(z.object({name:z.string(),isSelf:z.boolean()})),messages:z.array(z.object({sender:z.string(),text:z.string(),timestamp:z.string(),status:z.string().optional()}))});
export const imageEvidencePayloadSchema=z.object({assetId:z.string(),altText:z.string(),caption:z.string()});
export const cctvEvidencePayloadSchema=z.object({cameraLabel:z.string(),location:z.string(),frames:z.array(z.object({assetId:z.string(),timestampOverlay:z.string(),note:z.string().optional()})),durationSeconds:z.number()});
const evidenceBase=z.object({evidenceId:z.string(),title:z.string(),description:z.string(),discoveredAt:z.string(),order:z.number()});
export const evidenceItemSchema=z.discriminatedUnion('type',[
  evidenceBase.extend({type:z.literal('chat'),payload:chatEvidencePayloadSchema}),
  evidenceBase.extend({type:z.literal('image'),payload:imageEvidencePayloadSchema}),
  evidenceBase.extend({type:z.literal('cctv'),payload:cctvEvidencePayloadSchema}),
]);
export type EvidenceItem=z.infer<typeof evidenceItemSchema>;
