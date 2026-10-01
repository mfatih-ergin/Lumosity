/**
 * BPI (Brain Performance Index) Calculation Service
 * Normalizes cognitive performance across 5 domains (0-1500 scale)
 * using accuracy, reaction time (ms), max level achieved, and historical baseline.
 */

export interface SessionMetrics {
  gameId: string;
  score: number;
  rawAccuracy: number;    // 0.0 to 1.0
  avgReactionMs: number;  // e.g. 350ms
  maxLevel: number;
}

export interface DomainBpiUpdate {
  category: string;
  previousBpi: number;
  newBpi: number;
  delta: number;
  overallBpi: number;
}

export function calculateSessionPerformance(metrics: SessionMetrics): number {
  const { score, rawAccuracy, avgReactionMs, maxLevel } = metrics;

  // Base score contribution (40%)
  const scoreFactor = Math.min(score / 5000, 1.5) * 400;

  // Accuracy multiplier (30%)
  const accuracyFactor = Math.pow(Math.max(0, Math.min(rawAccuracy, 1.0)), 1.5) * 300;

  // Speed / Reaction Time efficiency bonus (20%)
  // Faster reaction (< 400ms is elite, 700ms is average, > 1200ms slow)
  const speedNormalized = Math.max(0, Math.min(1.0, (1200 - Math.max(200, avgReactionMs)) / 1000));
  const speedFactor = speedNormalized * 200;

  // Level depth bonus (10%)
  const levelFactor = Math.min(maxLevel * 20, 100);

  // Raw performance rating on a 100-1500 scale
  const rawRating = Math.round(100 + scoreFactor + accuracyFactor + speedFactor + levelFactor);

  return Math.min(1500, Math.max(100, rawRating));
}

export function updateCognitiveBpi(
  currentCategoryBpi: number,
  sessionRating: number,
  allCategoryBpis: { memory: number; attention: number; speed: number; flex: number; logic: number },
  categoryKey: 'memory' | 'attention' | 'speed' | 'flex' | 'logic'
): { newCategoryBpi: number; newOverallBpi: number; delta: number } {
  // Learning rate: adjust 15% towards session performance to allow smooth, realistic progression
  const learningRate = 0.15;
  const delta = Math.round((sessionRating - currentCategoryBpi) * learningRate);
  const newCategoryBpi = Math.min(1500, Math.max(100, currentCategoryBpi + delta));

  const updatedCategories = {
    ...allCategoryBpis,
    [categoryKey]: newCategoryBpi,
  };

  const newOverallBpi = Math.round(
    (updatedCategories.memory +
      updatedCategories.attention +
      updatedCategories.speed +
      updatedCategories.flex +
      updatedCategories.logic) /
      5
  );

  return {
    newCategoryBpi,
    newOverallBpi,
    delta,
  };
}
