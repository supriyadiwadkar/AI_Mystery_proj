import { Asset, EvidenceModel, MysteryCase } from '../models.js';
import { geminiClient } from './ai/geminiClient.js';
import { putAsset, putPlaceholder, removeStored } from './storage/localStorage.js';
import { env } from '../config/env.js';
import { cctvFramePrompt, evidenceImagePrompt } from './ai/prompts/image.v1.js';
import type { Evidence } from '@mystery/shared';

function embedClues(item: Evidence, blueprint: Awaited<ReturnType<typeof geminiClient.generate>>['blueprint']) {
  const linkedIds=blueprint.evidencePlan.find(plan=>plan.evidenceId===item.evidenceId)?.clueIds||[];
  const linked=blueprint.clues.filter(clue=>linkedIds.includes(clue.clueId));
  if(!linked.length)return;
  if(item.type==='image') {
    item.payload.caption=`${String(item.payload.caption||item.description)} ${linked.map(clue=>clue.description).join(' ')}`;
    item.payload.altText=`${String(item.payload.altText||item.title)} ${linked.map(clue=>clue.description).join(' ')}`;
  } else if(item.type==='cctv') {
    const frames=item.payload.frames as Array<Record<string,unknown>>;
    linked.forEach((clue,index)=>{if(frames.length)frames[Math.min(frames.length-1,Math.floor(frames.length/2)+index)]!.note=clue.description;});
  } else {
    const culprit=blueprint.suspects.find(person=>person.suspectId===blueprint.culpritSuspectId)!;
    const linkedSuspect=blueprint.suspects.find(person=>linked.some(clue=>clue.pointsTo===person.suspectId))||culprit;
    const witness=blueprint.suspects.find(person=>person.suspectId!==linkedSuspect.suspectId)!;
    const validNames=new Set(blueprint.suspects.map(person=>person.name));
    const existing=item.payload.messages as Array<{sender:string;text:string;timestamp:string}>|undefined;
    if(existing&&existing.length>=8&&existing.length<=25&&existing.every(message=>validNames.has(message.sender))) {
      existing[4]={...existing[4]!,sender:linkedSuspect.name,text:linked[0]!.description};
      existing[5]={...existing[5]!,sender:culprit.name};
      if(linked[1])existing[6]={...existing[6]!,sender:witness.name,text:linked[1].description};
      item.payload.participants=[{name:witness.name,isSelf:false},{name:linkedSuspect.name,isSelf:false},{name:culprit.name,isSelf:false}].filter((person,index,array)=>array.findIndex(other=>other.name===person.name)===index);
      return;
    }
    const timestamps=['20:41','20:44','20:48','20:53','21:02','21:07','21:13','21:19'];
    const messages=[
      {sender:witness.name,text:'Are they still doing the lighting check before close?',timestamp:timestamps[0]},
      {sender:linkedSuspect.name,text:'That’s what the revised schedule says. The east passage will be quiet then.',timestamp:timestamps[1]},
      {sender:witness.name,text:'I left the service folio where the inventory team asked.',timestamp:timestamps[2]},
      {sender:linkedSuspect.name,text:'Good. I’ll make sure the log is finished before guests leave.',timestamp:timestamps[3]},
      {sender:witness.name,text:linked[0]!.description,timestamp:timestamps[4]},
      {sender:linkedSuspect.name,text:'Right, that matches what I saw. Don’t move anything until the check is over.',timestamp:timestamps[5]},
      {sender:witness.name,text:linked[1]?.description||'The time on that record is later than I remembered.',timestamp:timestamps[6]},
      {sender:linkedSuspect.name,text:'Let’s compare the records in the morning.',timestamp:timestamps[7]},
    ];
    item.payload={platform:'whatsapp',participants:[{name:witness.name,isSelf:false},{name:linkedSuspect.name,isSelf:false}],messages};
  }
}
async function mapLimit<T>(items:T[],limit:number,work:(item:T)=>Promise<void>) {
  let index=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(index<items.length){const item=items[index++]!;await work(item);}}));
}
async function generateImage(prompt:string) {
  for(let attempt=0;attempt<3;attempt++)try{const image=await geminiClient.generateImage(prompt);if(image)return image;}catch(error){if(attempt===2)console.warn('Image generation exhausted retries; using placeholder.',error instanceof Error?error.message:'unknown error');}
  return null;
}
export async function runGeneration(caseId: string, seed: string, difficulty: 'easy'|'medium'|'hard', regeneration = 0) {
  const stages: [string,number][] = [['blueprint',10],['validation',25],['chat',50],['image',72],['cctv',90],['finalizing',97]];
  try { await MysteryCase.findByIdAndUpdate(caseId,{status:'generating','generation.startedAt':new Date(),'generation.error':null});
    const result = await geminiClient.generate(seed,difficulty);
    for(const [stage,progressPct] of stages) { await MysteryCase.findByIdAndUpdate(caseId,{$set:{'generation.stage':stage,'generation.progressPct':progressPct}}); await new Promise(r=>setTimeout(r,120)); }
    const c=result.blueprint;
    await MysteryCase.findByIdAndUpdate(caseId,{$set:{public:{title:c.title,setting:c.setting,briefing:c.briefing,victim:c.victim,suspects:c.suspects},blueprint:{culpritSuspectId:c.culpritSuspectId,motive:c.motive,method:c.method,timeline:c.timeline,clues:c.clues,evidencePlan:c.evidencePlan,solutionSummary:c.solutionSummary},status:'generating','generation.stage':'finalizing','generation.progressPct':97}});
    await mapLimit(result.evidence,env.IMAGE_CONCURRENCY,async e=>{
      embedClues(e,c);
      if (e.type === 'image') {
        const prompt=evidenceImagePrompt(String(e.payload.caption||e.description));
        const generated=await generateImage(prompt);const ext=generated?.mimeType==='image/jpeg'?'jpg':generated?.mimeType==='image/webp'?'webp':generated?'png':'svg';const key=`${caseId}-${e.evidenceId}-image.${ext}`;
        if(generated)await putAsset(key,generated.bytes);else await putPlaceholder(key,e.title);
        const asset = await Asset.findOneAndUpdate({caseId,storageKey:key},{$set:{caseId,kind:'image',storageKey:key,mimeType:generated?.mimeType||'image/svg+xml',width:1280,height:720,isPlaceholder:!generated,promptUsed:prompt}},{upsert:true,new:true});
        e.payload.assetId = String(asset._id);
      } else if (e.type === 'cctv') {
        const frames = (e.payload.frames as Array<Record<string,unknown>>)||[];
        for(let index=0;index<frames.length;index++) {
          const prompt=cctvFramePrompt(String(e.payload.cameraLabel),String(frames[index]?.note||'quiet corridor'));
          const generated=await generateImage(prompt);const ext=generated?.mimeType==='image/jpeg'?'jpg':generated?.mimeType==='image/webp'?'webp':generated?'png':'svg';const key=`${caseId}-${e.evidenceId}-frame-${index+1}.${ext}`;
          if(generated)await putAsset(key,generated.bytes);else await putPlaceholder(key,`${e.title} · ${frames[index]?.timestampOverlay||`FRAME ${index+1}`}`);
          const asset = await Asset.findOneAndUpdate({caseId,storageKey:key},{$set:{caseId,kind:'cctv_frame',storageKey:key,mimeType:generated?.mimeType||'image/svg+xml',width:1280,height:720,isPlaceholder:!generated,promptUsed:prompt}},{upsert:true,new:true});
          frames[index]!.assetId = String(asset._id);
        }
        e.payload.frames = frames;
      }
      await EvidenceModel.findOneAndUpdate({caseId,evidenceId:e.evidenceId},{$set:{...e,caseId,linkedClueIds:c.evidencePlan.find(plan=>plan.evidenceId===e.evidenceId)?.clueIds||[]}},{upsert:true,new:true});
    });
    const solver=await geminiClient.solve({title:c.title,setting:c.setting,briefing:c.briefing,victim:c.victim,suspects:c.suspects},result.evidence.map(item=>({evidenceId:item.evidenceId,type:item.type,title:item.title,description:item.description,payload:item.payload})));
    if(solver.suspectId!==c.culpritSuspectId||solver.confidence<0.4)throw new Error('Blind solver could not identify the planned culprit from evidence.');
    await MysteryCase.findByIdAndUpdate(caseId,{$set:{status:'ready','generation.stage':'done','generation.progressPct':100,'generation.finishedAt':new Date()}});
  } catch(error) {
    if(error instanceof Error&&error.message.startsWith('Blind solver')&&regeneration<2) {
      const oldAssets=await Asset.find({caseId});
      await Promise.all(oldAssets.map((asset:any)=>removeStored(asset.storageKey)));
      await Promise.all([Asset.deleteMany({caseId}),EvidenceModel.deleteMany({caseId})]);
      return runGeneration(caseId,seed,difficulty,regeneration+1);
    }
    await MysteryCase.findByIdAndUpdate(caseId,{$set:{status:'failed','generation.error':'We could not finish a fair case. Please retry.','generation.finishedAt':new Date()}});
    console.error('Case generation failed',error instanceof Error?error.message:'unknown error');
  }
}


