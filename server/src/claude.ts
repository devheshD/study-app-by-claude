import Anthropic from "@anthropic-ai/sdk";
import { GradeResult } from "./types.js";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 채점/생성에는 비용 효율이 좋은 Haiku를 사용
// 더 높은 품질이 필요하면 "claude-sonnet-4-6" 로 바꾸세요.
const MODEL = "claude-haiku-4-5-20251001";

function extractText(message: Anthropic.Message): string {
  return message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

// 모델이 ```json 펜스나 잡설을 붙여도 안전하게 JSON만 파싱
function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("모델 응답에서 JSON을 찾지 못했습니다.");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

export interface GeneratedQuestion {
  question: string;
  difficulty: string;
  modelAnswer: string;
}

// 주제로 새 면접 질문 1개 생성 (모범답안 포함). existing은 중복 회피용.
export async function generateQuestion(
  topicLabel: string,
  existing: string[]
): Promise<GeneratedQuestion> {
  const prompt = `당신은 백엔드 기술 면접관입니다. "${topicLabel}" 주제로 실무형 기술 면접 질문을 1개 만들어 주세요.
- 너무 쉽지 않고, 꼬리질문이 가능한 깊이 있는 질문으로
- 아래 질문들과는 겹치지 않게: ${existing.join(" / ")}
- 모범답안은 핵심만 3~5문장으로 간결하게
반드시 아래 JSON 형식으로만, 다른 텍스트 없이 응답하세요:
{"question": "질문 내용", "difficulty": "쉬움|보통|어려움", "modelAnswer": "모범답안"}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    temperature: 1, // 매번 새 질문이 나오도록 다양성 ↑
    messages: [{ role: "user", content: prompt }],
  });
  return parseJSON<GeneratedQuestion>(extractText(message));
}

// 답변 채점
export async function gradeAnswer(
  topicLabel: string,
  question: string,
  answer: string
): Promise<GradeResult> {
  const prompt = `당신은 깐깐하지만 공정한 백엔드 기술 면접관입니다. 아래 질문에 대한 지원자의 답변을 평가하세요.

[주제] ${topicLabel}
[질문] ${question}
[지원자 답변] ${answer}

100점 만점으로 채점하고, 정확성·깊이·설명력을 기준으로 평가하세요. 모범답안은 핵심만 간결하게.
반드시 아래 JSON 형식으로만, 다른 텍스트 없이 응답하세요:
{"score": 0-100 정수, "verdict": "한 줄 총평", "strengths": ["잘한 점", ...], "improvements": ["보완할 점", ...], "modelAnswer": "모범답안"}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });
  return parseJSON<GradeResult>(extractText(message));
}
