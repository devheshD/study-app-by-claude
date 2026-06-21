import "dotenv/config";
import express from "express";
import cors from "cors";
import { TOPICS, SelfRating } from "./types.js";
import { loadQuestions, appendHistory, readHistory } from "./store.js";
import { generateQuestion, gradeAnswer } from "./claude.js";

const app = express();
app.use(cors());
app.use(express.json());

const topicLabel = (id: string) => TOPICS.find((t) => t.id === id)?.label;

const wrap =
  (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// 주제 목록
app.get("/api/topics", (_req, res) => {
  res.json(TOPICS);
});

// 주제별 질문 세트 (모범답안 포함)
app.get(
  "/api/questions/:topic",
  wrap(async (req, res) => {
    res.json(await loadQuestions(req.params.topic));
  })
);

// AI 새 질문 생성 (모범답안 포함)
app.post(
  "/api/questions/generate",
  wrap(async (req, res) => {
    const { topic } = req.body as { topic: string };
    const label = topicLabel(topic);
    if (!label) return res.status(400).json({ error: "알 수 없는 주제입니다." });
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({
        error: "API 키가 없어 AI 기능을 쓸 수 없어요. 모범답안 비교(무료)를 이용하거나 server/.env에 ANTHROPIC_API_KEY를 넣어주세요.",
      });
    }

    const existing = (await loadQuestions(topic)).map((q) => q.text);
    const g = await generateQuestion(label, existing);
    res.json({
      id: `${topic}-ai-${Date.now()}`,
      text: g.question,
      difficulty: g.difficulty ?? "보통",
      modelAnswer: g.modelAnswer ?? "",
    });
  })
);

// AI 채점 (+ 이력 기록)
app.post(
  "/api/answers/grade",
  wrap(async (req, res) => {
    const { topic, questionId, question, answer } = req.body as {
      topic: string;
      questionId: string;
      question: string;
      answer: string;
    };
    const label = topicLabel(topic);
    if (!label) return res.status(400).json({ error: "알 수 없는 주제입니다." });
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({
        error: "API 키가 없어 AI 채점을 쓸 수 없어요. 모범답안 비교(무료)를 이용하거나 server/.env에 ANTHROPIC_API_KEY를 넣어주세요.",
      });
    }
    if (!answer?.trim()) return res.status(400).json({ error: "답변이 비어 있습니다." });

    const result = await gradeAnswer(label, question, answer);
    appendHistory({
      topic,
      questionId: questionId ?? "(ai)",
      kind: "ai",
      score: result.score,
      at: new Date().toISOString(),
    }).catch((e) => console.error("이력 저장 실패:", e));

    res.json(result);
  })
);

// 자기평가 기록 (모범답안 비교 경로)
const VALID_RATINGS: SelfRating[] = ["got", "unsure", "missed"];
app.post(
  "/api/progress",
  wrap(async (req, res) => {
    const { topic, questionId, rating } = req.body as {
      topic: string;
      questionId: string;
      rating: SelfRating;
    };
    if (!VALID_RATINGS.includes(rating)) {
      return res.status(400).json({ error: "잘못된 평가 값입니다." });
    }
    await appendHistory({ topic, questionId, kind: "self", rating, at: new Date().toISOString() });
    res.json({ ok: true });
  })
);

// 최근 학습 이력
app.get(
  "/api/history",
  wrap(async (_req, res) => {
    res.json(await readHistory());
  })
);

app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || "서버 오류" });
  }
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✓ 서버 실행 중: http://localhost:${PORT}`);
});
