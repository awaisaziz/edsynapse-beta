// Shared UI types for the strengths & gaps views (student dashboard, results,
// StrengthsGapsChart). The underlying data comes from the live API
// (studentApi.getStrengthsGaps); these describe the shape the chart renders.

export type TopicMastery = "strong" | "moderate" | "needs_improvement";

export interface StrengthsGapsTopic {
  id: string;
  topic: string;
  status: TopicMastery;
  score: number; // 0-100
  lastAttempted: string;
  quizAttempts: number;
}
