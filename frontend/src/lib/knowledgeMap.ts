// Shared UI types for the knowledge-map views (student dashboard, results,
// KnowledgeMapChart). The underlying data comes from the live API
// (studentApi.getKnowledgeMap); these describe the shape the chart renders.

export type TopicMastery = "strong" | "moderate" | "needs_improvement";

export interface KnowledgeMapTopic {
  id: string;
  topic: string;
  status: TopicMastery;
  score: number; // 0-100
  lastAttempted: string;
  quizAttempts: number;
}
