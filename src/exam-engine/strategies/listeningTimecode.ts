import type { ShuffleStrategy } from "./ShuffleStrategy";

export const ListeningTimecodeStrategy: ShuffleStrategy = {
  canShuffleQuestions: () => false,
  canShuffleAnswers: () => false,
  preserveSequentialReasoning: () => true,
  preserveReferenceMapping: () => true,
  shuffleAsAtomicUnit: () => true, // groups must be moved as atomic unit relative to audio
};
