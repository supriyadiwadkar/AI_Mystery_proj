import { type Blueprint, type Difficulty } from '@mystery/shared';

export function chatPrompt(blueprint: Blueprint, difficulty: Difficulty): string {
  const chats=blueprint.evidencePlan.filter(item=>item.type==='chat');
  return `Create natural, fictional messaging threads for this mystery. Return strict JSON {"threads":[{"evidenceId":"ev_01","participants":[{"name":"...","isSelf":false}],"messages":[{"sender":"...","text":"...","timestamp":"21:04","status":"read"}]}]}. Include exactly these thread ids: ${chats.map(item=>item.evidenceId).join(', ')}. Each thread has 8 to 25 messages, realistic 24-hour timestamps, casual wording, and clues embedded indirectly. Never have anyone confess or directly name the culprit. Do not add real brands; platform is ChatApp. Use only names from suspects. Public facts and suspects: ${JSON.stringify({title:blueprint.title,setting:blueprint.setting,victim:blueprint.victim,suspects:blueprint.suspects})}. Relevant evidence descriptions: ${JSON.stringify(chats.map(item=>({evidenceId:item.evidenceId,brief:item.brief,clues:item.clueIds.map(id=>blueprint.clues.find(clue=>clue.clueId===id))})))}. Difficulty: ${difficulty}.`;
}
