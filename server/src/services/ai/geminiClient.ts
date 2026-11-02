import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { createMockMystery } from './mock.js';
import { validateBlueprint } from './blueprintValidator.js';
import { blueprintPrompt } from './prompts/blueprint.v1.js';
import { chatPrompt } from './prompts/chats.v1.js';
import { safetyPrompt } from './prompts/safety.v1.js';
export interface GeminiClient { precheck(seed:string):Promise<boolean>; generate(seed: string, difficulty: 'easy'|'medium'|'hard'): Promise<Awaited<ReturnType<typeof createMockMystery>>>; generateImage(prompt:string):Promise<{bytes:Buffer;mimeType:string}|null>; solve(publicCase:unknown,evidence:unknown):Promise<{suspectId:string;confidence:number;reasoning:string}> }
export class MockGeminiClient implements GeminiClient { async precheck(){return true;} async generate(seed: string, difficulty: 'easy'|'medium'|'hard') { return createMockMystery(seed, difficulty); } async generateImage(){return null;} async solve(){return {suspectId:'s1',confidence:0.94,reasoning:'The time-stamped records and independent access clues converge on the culprit.'};} }
export class GoogleGeminiClient implements GeminiClient {
  private ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY! });
  async precheck(seed:string):Promise<boolean> {
    const response=await this.ai.models.generateContent({model:env.GEMINI_TEXT_MODEL!,contents:safetyPrompt(seed),config:{responseMimeType:'application/json',temperature:0.2}});
    const data=JSON.parse(response.text||'{}');
    return data.allowed===true;
  }
  async generate(seed: string, difficulty: 'easy'|'medium'|'hard') {
    const mock = await createMockMystery(seed, difficulty);
    const prompt = blueprintPrompt(seed,difficulty,mock.blueprint.suspects.length);
    try {
      const response = await this.ai.models.generateContent({ model: env.GEMINI_TEXT_MODEL!, contents: prompt, config: { responseMimeType: 'application/json', temperature: 0.9 } });
      const data = JSON.parse(response.text || '{}');
      // The client stays robust when an incomplete model response fails validation.
      const { blueprintSchema } = await import('@mystery/shared');
      const parsed = blueprintSchema.safeParse(data);
      if (parsed.success && validateBlueprint(parsed.data, difficulty).length === 0) {
        mock.blueprint = parsed.data;
        const typePositions={chat:0,image:0,cctv:0};
        mock.evidence=parsed.data.evidencePlan.map((plan,index)=>{
          const templates=mock.evidence.filter(item=>item.type===plan.type);
          const template=templates[typePositions[plan.type]++]!;
          return {...template,evidenceId:plan.evidenceId,type:plan.type,title:plan.title,description:plan.brief,order:index+1};
        });
        const cluesByEvidence = new Map<string,string[]>();
        for (const item of parsed.data.evidencePlan) cluesByEvidence.set(item.evidenceId,item.clueIds.map(clueId=>parsed.data.clues.find(clue=>clue.clueId===clueId)!.description));
        for (const item of mock.evidence) {
          const clues = cluesByEvidence.get(item.evidenceId)||[];
          if (item.type === 'image') {
            item.description = 'Scene photograph logged during the investigation.';
            item.payload.caption = clues.length ? `The photograph records a detail relevant to the timeline: ${clues.join(' ')}` : `A scene detail from ${parsed.data.setting}.`;
            item.payload.altText = `Fictional evidence photograph: ${(item.payload.caption as string).slice(0,180)}`;
          } else if (item.type === 'cctv') {
            item.description = clues.length ? `Recorded sequence showing a timeline detail: ${clues.join(' ')}` : `Camera footage from ${parsed.data.setting}.`;
            const frames=item.payload.frames as Array<Record<string,unknown>>;
            if(clues.length&&frames.length)frames[Math.floor(frames.length/2)]!.note=clues[0];
          }
        }
        try {
          const chatResponse=await this.ai.models.generateContent({model:env.GEMINI_TEXT_MODEL!,contents:chatPrompt(parsed.data,difficulty),config:{responseMimeType:'application/json',temperature:0.9}});
          const chatData=JSON.parse(chatResponse.text||'{}') as {threads:Array<{evidenceId:string;participants:Array<{name:string;isSelf:boolean}>;messages:Array<{sender:string;text:string;timestamp:string;status?:string}>}>};
          for(const thread of chatData.threads||[]) {
            const target=mock.evidence.find(item=>item.evidenceId===thread.evidenceId&&item.type==='chat');
            if(!target||thread.messages.length<8||thread.messages.length>25||thread.messages.some(message=>!thread.participants.some(person=>person.name===message.sender)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(message.timestamp)))continue;
            target.payload={platform:'whatsapp',participants:thread.participants,messages:thread.messages};
          }
        } catch(error) { console.warn('Gemini chat generation fell back to fictional fixture messages.',error instanceof Error?error.message:'unknown error'); }
      }
    } catch (error) { console.warn('Gemini generation fell back to a complete fictional fixture.', error instanceof Error ? error.message : 'unknown error'); }
    return mock;
  }
  async generateImage(prompt:string):Promise<{bytes:Buffer;mimeType:string}|null> {
    const response=await this.ai.models.generateContent({model:env.GEMINI_IMAGE_MODEL!,contents:prompt,config:{responseModalities:['IMAGE']}});
    const parts=response.candidates?.flatMap(candidate=>candidate.content?.parts||[])||[];
    const imagePart=parts.find(part=>part.inlineData?.data);
    if(!imagePart?.inlineData?.data)return null;
    return {bytes:Buffer.from(imagePart.inlineData.data,'base64'),mimeType:imagePart.inlineData.mimeType||'image/png'};
  }
  async solve(publicCase:unknown,evidence:unknown):Promise<{suspectId:string;confidence:number;reasoning:string}> {
    const response=await this.ai.models.generateContent({model:env.GEMINI_TEXT_MODEL!,contents:`Solve this fictional investigation using only the public case facts and evidence below. Do not assume facts outside the evidence. Return strict JSON {"suspectId":"listed suspect id","confidence":0.0,"reasoning":"brief explanation"}.\nPUBLIC CASE: ${JSON.stringify(publicCase)}\nEVIDENCE: ${JSON.stringify(evidence)}`,config:{responseMimeType:'application/json',temperature:0.2}});
    const data=JSON.parse(response.text||'{}');
    if(typeof data.suspectId!=='string'||typeof data.confidence!=='number'||typeof data.reasoning!=='string')throw new Error('Solver response did not match the expected schema.');
    return {suspectId:data.suspectId,confidence:Math.max(0,Math.min(1,data.confidence)),reasoning:data.reasoning};
  }
}
export const geminiClient: GeminiClient = env.GEMINI_MOCK === 'true' ? new MockGeminiClient() : new GoogleGeminiClient();


