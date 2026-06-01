const NUMBER_PATTERN = /\d{4}年|\d+天|\d+%|\d+元|\d+小时|\d+次/g;

export interface ValidationResult {
  passed: boolean;
  suspiciousNumbers: string[];
}

export function validateAnswer(
  answer: string,
  chunks: Array<{ content: string }>,
): ValidationResult {
  const answerNumbers: string[] = answer.match(NUMBER_PATTERN) || [];
  const chunkText = chunks.map((c) => c.content).join('');
  const chunkNumbers: string[] = chunkText.match(NUMBER_PATTERN) || [];
  const suspicious = answerNumbers.filter((n) => !chunkNumbers.includes(n));

  return {
    passed: suspicious.length === 0,
    suspiciousNumbers: suspicious,
  };
}
