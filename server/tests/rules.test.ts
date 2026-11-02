import { describe, expect, it } from 'vitest';
import { blueprintSchema, difficultyCounts } from '@mystery/shared';
import { createMockMystery } from '../src/services/ai/mock.js';
import { validateBlueprint } from '../src/services/ai/blueprintValidator.js';
import { scoreAttempt } from '../src/services/scoring.js';

describe('mock mystery fixture', () => {
  it.each(['easy','medium','hard'] as const)('satisfies the %s case counts and fairness rules', async difficulty => {
    const result = await createMockMystery('A rare manuscript disappears from a locked archive during a storm.', difficulty);
    expect(result.blueprint.suspects).toHaveLength(difficultyCounts[difficulty].suspects);
    expect(result.evidence).toHaveLength(difficultyCounts[difficulty].evidence);
    expect(result.evidence.filter(item => item.type === 'chat')).toHaveLength(difficultyCounts[difficulty].chats);
    expect(result.evidence.filter(item => item.type === 'image')).toHaveLength(difficultyCounts[difficulty].images);
    expect(result.evidence.filter(item => item.type === 'cctv')).toHaveLength(difficultyCounts[difficulty].cctv);
    expect(blueprintSchema.safeParse(result.blueprint).success).toBe(true);
    expect(validateBlueprint(result.blueprint, difficulty)).toEqual([]);
  });
});

describe('scoreAttempt', () => {
  it.each([
    [true,0,0,0,1200],
    [true,2,1,60,1248],
    [true,9,3,6000,850],
    [false,4,0,0,0],
  ] as const)('scores correct=%s, linked=%s, hints=%s, seconds=%s', (correct,linked,hints,seconds,expected) => {
    expect(scoreAttempt(correct,linked,hints,seconds).score).toBe(expected);
  });
});

