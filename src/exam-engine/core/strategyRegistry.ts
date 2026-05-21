import type { ShuffleStrategy } from "../strategies/ShuffleStrategy";

class StrategyRegistry {
  private registry: Map<string, ShuffleStrategy> = new Map();

  register(key: string, strat: ShuffleStrategy) {
    this.registry.set(key, strat);
  }

  resolve(key: string): ShuffleStrategy | undefined {
    return this.registry.get(key);
  }
}

export const strategyRegistry = new StrategyRegistry();
