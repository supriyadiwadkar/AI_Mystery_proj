import { z } from 'zod';

export const suspectSchema=z.object({suspectId:z.string(),name:z.string(),age:z.number(),occupation:z.string(),relationToVictim:z.string(),description:z.string(),appearance:z.string().optional()});
export const timelineEventSchema=z.object({time:z.string(),event:z.string(),suspectIds:z.array(z.string()),location:z.string()});
export const clueSchema=z.object({clueId:z.string(),description:z.string(),pointsTo:z.string().nullable(),type:z.enum(['incriminating','exculpatory','red_herring']),explanation:z.string(),evidenceType:z.enum(['chat','image','cctv'])});
export const evidencePlanItemSchema=z.object({evidenceId:z.string(),type:z.enum(['chat','image','cctv']),title:z.string(),brief:z.string(),clueIds:z.array(z.string())});
export const blueprintSchema=z.object({
  title:z.string(),setting:z.string(),briefing:z.string(),victim:z.object({name:z.string(),description:z.string()}),
  suspects:z.array(suspectSchema),culpritSuspectId:z.string(),motive:z.string(),method:z.string(),timeline:z.array(timelineEventSchema),
  clues:z.array(clueSchema),evidencePlan:z.array(evidencePlanItemSchema),solutionSummary:z.string(),
});
export type Blueprint=z.infer<typeof blueprintSchema>;
export type EvidencePlanItem=z.infer<typeof evidencePlanItemSchema>;
