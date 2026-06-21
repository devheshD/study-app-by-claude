import { promises as fs } from "fs";
import path from "path";
import { Question, HistoryEntry, TOPICS } from "./types.js";

const DATA_DIR = path.join(process.cwd(), "data");
const QUESTIONS_DIR = path.join(DATA_DIR, "questions");
const HISTORY_FILE = path.join(DATA_DIR, "history.jsonl");

const validTopics = new Set(TOPICS.map((t) => t.id));

// 주제별 질문 세트를 JSON 파일에서 읽는다 (모범답안 포함, 읽기 전용)
export async function loadQuestions(topic: string): Promise<Question[]> {
  if (!validTopics.has(topic)) {
    throw new Error(`알 수 없는 주제: ${topic}`);
  }
  const file = path.join(QUESTIONS_DIR, `${topic}.json`);
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw) as Question[];
}

// 학습 이력을 JSONL에 한 줄씩 추가한다.
// 통째로 다시 쓰지 않고 append만 하므로 동시 쓰기 충돌 위험이 적다.
export async function appendHistory(entry: HistoryEntry): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.appendFile(HISTORY_FILE, JSON.stringify(entry) + "\n", "utf-8");
}

// 최근 이력 읽기 (없으면 빈 배열)
export async function readHistory(limit = 100): Promise<HistoryEntry[]> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf-8");
    return raw
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((l) => JSON.parse(l) as HistoryEntry)
      .reverse();
  } catch (e: any) {
    if (e.code === "ENOENT") return []; // 아직 이력 파일이 없음
    throw e;
  }
}
