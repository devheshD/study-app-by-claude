// 백엔드 API 호출 모음. vite 프록시 덕분에 /api 로만 부르면 된다.

export interface Topic {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  text: string;
  difficulty: string;
  modelAnswer: string;
  source?: "bank" | "ai";
}

export interface GradeResult {
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
}

export type SelfRating = "got" | "unsure" | "missed";

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `요청 실패 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const getTopics = () => req<Topic[]>("/api/topics");

export const getQuestions = (topic: string) =>
  req<Question[]>(`/api/questions/${topic}`);

// AI 새 질문 생성 (모범답안 포함) — API 키 필요
// exclude: 이미 받은 질문 텍스트들. 같은 질문이 반복되지 않게 서버로 넘긴다.
export const generateQuestion = (topic: string, exclude: string[] = []) =>
  req<Question>("/api/questions/generate", {
    method: "POST",
    body: JSON.stringify({ topic, exclude }),
  });

// AI 채점 — API 키 필요
export const gradeAnswer = (
  topic: string,
  questionId: string,
  question: string,
  answer: string
) =>
  req<GradeResult>("/api/answers/grade", {
    method: "POST",
    body: JSON.stringify({ topic, questionId, question, answer }),
  });

// 자기평가 기록 (모범답안 비교 경로, 무료) — 실패해도 흐름은 막지 않음
export const saveProgress = (topic: string, questionId: string, rating: SelfRating) =>
  req<{ ok: boolean }>("/api/progress", {
    method: "POST",
    body: JSON.stringify({ topic, questionId, rating }),
  });
