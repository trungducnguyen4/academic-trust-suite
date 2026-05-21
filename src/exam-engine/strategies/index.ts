import { strategyRegistry } from "../core/strategyRegistry";
import { MatchingHeadingStrategy } from "./matchingHeading";
import { OrderedReasoningStrategy } from "./orderedReasoning";
import { SharedOptionPoolStrategy } from "./sharedOptionPool";
import { ListeningTimecodeStrategy } from "./listeningTimecode";

// register default strategies
strategyRegistry.register("matching-heading", MatchingHeadingStrategy);
strategyRegistry.register("ordered-reasoning", OrderedReasoningStrategy);
strategyRegistry.register("shared-option-pool", SharedOptionPoolStrategy);
strategyRegistry.register("listening-timecode", ListeningTimecodeStrategy);

export * from "./ShuffleStrategy";
