import { difficultyCounts, type Blueprint, type Difficulty } from '@mystery/shared';

export function validateBlueprint(blueprint: Blueprint, difficulty: Difficulty): string[] {
  const problems: string[] = [];
  const counts = difficultyCounts[difficulty];
  const ids = new Set(blueprint.suspects.map(s => s.suspectId));
  if (blueprint.suspects.length !== counts.suspects) problems.push('suspect count does not match difficulty');
  if (!ids.has(blueprint.culpritSuspectId)) problems.push('culprit is not a listed suspect');
  const clues = blueprint.clues;
  if(blueprint.evidencePlan.length!==counts.evidence)problems.push('evidence count does not match difficulty');
  for(const type of ['chat','image','cctv'] as const)if(blueprint.evidencePlan.filter(item=>item.type===type).length!==counts[type==='chat'?'chats':type==='image'?'images':'cctv'])problems.push(`${type} evidence count does not match difficulty`);
  const evidenceIds=new Set(blueprint.evidencePlan.map(item=>item.evidenceId));
  const clueIds=new Set(clues.map(clue=>clue.clueId));
  const culpritClues = clues.filter(c => c.pointsTo === blueprint.culpritSuspectId && c.type === 'incriminating');
  if (culpritClues.length < 3) problems.push('fewer than three independent culprit clues');
  if (clues.filter(c => c.type === 'red_herring').length < counts.redHerrings) problems.push('not enough red herrings');
  for (const suspect of blueprint.suspects) {
    if (suspect.suspectId !== blueprint.culpritSuspectId && !clues.some(c => c.pointsTo === suspect.suspectId && c.type === 'exculpatory')) problems.push(`missing exculpatory clue for ${suspect.suspectId}`);
  }
  for (const clue of clues) {
    if (clue.pointsTo && !ids.has(clue.pointsTo)) problems.push(`unknown suspect in clue ${clue.clueId}`);
    if (!blueprint.evidencePlan.some(item=>item.clueIds.includes(clue.clueId))) problems.push(`clue ${clue.clueId} has no evidence`);
    if (!blueprint.evidencePlan.some(item=>item.clueIds.includes(clue.clueId)&&item.type===clue.evidenceType)) problems.push(`clue ${clue.clueId} evidence type does not match`);
  }
  for(const item of blueprint.evidencePlan){if(!/^ev_\d{2}$/.test(item.evidenceId)||Number(item.evidenceId.slice(3))<1||Number(item.evidenceId.slice(3))>counts.evidence)problems.push('evidence plan references an unknown id');if(item.clueIds.some(id=>!clueIds.has(id)))problems.push(`evidence ${item.evidenceId} references an unknown clue`);}
  if(evidenceIds.size!==blueprint.evidencePlan.length)problems.push('evidence ids are duplicated');
  const minutes = (time: string) => { const match = /^(\d{2}):(\d{2})$/.exec(time); return match ? Number(match[1]) * 60 + Number(match[2]) : NaN; };
  let previous = -1;
  for (const event of blueprint.timeline) {
    const current = minutes(event.time);
    if (!Number.isFinite(current) || current < previous) problems.push('timeline is not in ascending 24-hour time');
    previous = current;
    if (event.suspectIds.some(id => !ids.has(id))) problems.push('timeline references an unknown suspect');
  }
  return [...new Set(problems)];
}
