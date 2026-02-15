export interface EisenhowerAnswers {
  important: boolean;
  urgent: boolean;
  complex: 1 | 2 | 3;
  time: 1 | 2;
}

export function computeEisenhowerResult(answers: EisenhowerAnswers): { priority: number; difficulty: number } {
  let priority = 4;
  if (answers.important && answers.urgent) priority = 1;
  else if (answers.important && !answers.urgent) priority = 2;
  else if (!answers.important && answers.urgent) priority = 3;
  const difficulty = Math.min(5, answers.complex + answers.time);
  return { priority, difficulty };
}
