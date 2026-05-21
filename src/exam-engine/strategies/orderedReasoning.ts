import type { ShuffleStrategy } from "./ShuffleStrategy";

export const OrderedReasoningStrategy: ShuffleStrategy = {
  canShuffleQuestions: () => false,
  canShuffleAnswers: () => false,
  preserveSequentialReasoning: () => true,
  preserveReferenceMapping: () => true,
  shuffleAsAtomicUnit: () => false,
};
