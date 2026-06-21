// 주제 정의
export interface Topic {
  id: string;
  label: string;
}

// 질문 (모범답안 포함)
export interface Question {
  id: string;
  difficulty: string;
  text: string;
  modelAnswer: string;
}

// AI 채점 결과
export interface GradeResult {
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
}

// 자기평가 등급 (모범답안 비교 경로)
export type SelfRating = "got" | "unsure" | "missed";

// 난이도 (질문 데이터·AI 생성 공통)
export type Difficulty = "쉬움" | "중간" | "어려움";
export const DIFFICULTIES: Difficulty[] = ["쉬움", "중간", "어려움"];

// 학습 이력 (history.jsonl 한 줄)
// kind=self → rating, kind=ai → score
export interface HistoryEntry {
  topic: string;
  questionId: string;
  kind: "self" | "ai";
  rating?: SelfRating;
  score?: number;
  at: string; // ISO 8601
}

export const TOPICS: Topic[] = [
  { id: "kotlin", label: "Kotlin" },
  { id: "java", label: "Java" },
  { id: "spring", label: "Spring" },
  { id: "es", label: "Elasticsearch" },
  { id: "mysql", label: "MySQL" },
  { id: "kafka", label: "Kafka" },
];
