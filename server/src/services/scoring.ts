export type ScoreBreakdown = { base: number; evidenceBonus: number; hintPenalty: number; timeBonus: number };

export function scoreAttempt(isCorrect: boolean, linkedEvidenceCount: number, hintsUsed: number, timeSpentSeconds: number): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {
    base: isCorrect ? 1000 : 0,
    evidenceBonus: isCorrect ? Math.min(300, 100 * Math.max(0, linkedEvidenceCount)) : 0,
    hintPenalty: isCorrect ? 150 * Math.max(0, hintsUsed) : 0,
    timeBonus: isCorrect ? Math.max(0, 200 - Math.floor(Math.max(0, timeSpentSeconds) / 30)) : 0,
  };
  return { score: Math.max(0, breakdown.base + breakdown.evidenceBonus + breakdown.timeBonus - breakdown.hintPenalty), breakdown };
}
