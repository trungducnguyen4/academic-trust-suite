import type { ShuffleStrategy } from "./ShuffleStrategy";

export const SharedOptionPoolStrategy: ShuffleStrategy = {
  canShuffleQuestions: () => true,
  canShuffleAnswers: () => true,
  preserveSequentialReasoning: () => false,
  preserveReferenceMapping: () => true,
  shuffleAsAtomicUnit: () => false,
};
