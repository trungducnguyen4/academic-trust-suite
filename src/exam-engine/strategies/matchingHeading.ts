import type { ShuffleStrategy } from "./ShuffleStrategy";

export const MatchingHeadingStrategy: ShuffleStrategy = {
  canShuffleQuestions: () => true,
  canShuffleAnswers: () => false, // answers are heading pool — keep mapping
  preserveSequentialReasoning: () => false,
  preserveReferenceMapping: () => true,
  shuffleAsAtomicUnit: () => false,
};
