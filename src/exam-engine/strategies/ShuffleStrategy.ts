export interface ShuffleStrategy {
  canShuffleQuestions(): boolean;
  canShuffleAnswers(): boolean;
  preserveSequentialReasoning(): boolean;
  preserveReferenceMapping(): boolean;
  shuffleAsAtomicUnit(): boolean;
}

export const StrictNoShuffle: ShuffleStrategy = {
  canShuffleQuestions: () => false,
  canShuffleAnswers: () => false,
  preserveSequentialReasoning: () => true,
  preserveReferenceMapping: () => true,
  shuffleAsAtomicUnit: () => false,
};

export const DefaultFlexible: ShuffleStrategy = {
  canShuffleQuestions: () => true,
  canShuffleAnswers: () => true,
  preserveSequentialReasoning: () => false,
  preserveReferenceMapping: () => true,
  shuffleAsAtomicUnit: () => false,
};
