import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw, Sparkles, Eye, Send, BookOpen, Loader2, Award,
  CheckCircle2, AlertTriangle, ThumbsUp, Minus, ThumbsDown,
} from "lucide-react";
import {
  getTopics, getQuestions, generateQuestion, gradeAnswer, saveProgress,
  type Topic, type Question, type GradeResult, type SelfRating,
} from "./api";

// ── 디자인 토큰 ──
const C = {
  bg: "#0F1721", surface: "#18222E", surface2: "#1F2C3A", line: "#2B3A4B",
  text: "#E6EDF3", sub: "#8B9CB0", amber: "#E8A33D", green: "#4CB782",
  red: "#E5746B", blue: "#5AA9E6",
};
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";
const SANS = "'Pretendard', -apple-system, 'Segoe UI', 'Apple SD Gothic Neo', sans-serif";

const TOPIC_COLORS: Record<string, string> = {
  kotlin: "#A97BFF", java: "#E8A33D", spring: "#4CB782",
  es: "#F4C430", mysql: "#5AA9E6", kafka: "#E5746B",
};

const RATINGS: { key: SelfRating; label: string; color: string; icon: React.ReactNode }[] = [
  { key: "got", label: "알았음", color: C.green, icon: <ThumbsUp size={15} /> },
  { key: "unsure", label: "헷갈림", color: C.amber, icon: <Minus size={15} /> },
  { key: "missed", label: "몰랐음", color: C.red, icon: <ThumbsDown size={15} /> },
];

type Loading = "gen" | "grade" | null;
// idle: 답 작성 중 / revealed: 모범답안 펼침 / graded: AI 채점 결과
type Phase = "idle" | "revealed" | "graded";

export default function App() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topic, setTopic] = useState("");
  const [bank, setBank] = useState<Question[]>([]);
  const [bankIdx, setBankIdx] = useState(-1);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [loading, setLoading] = useState<Loading>(null);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ count: 0 });

  const activeColor = TOPIC_COLORS[topic] ?? C.amber;
  const activeLabel = useMemo(
    () => topics.find((t) => t.id === topic)?.label ?? "",
    [topics, topic]
  );

  useEffect(() => {
    getTopics()
      .then((ts) => { setTopics(ts); if (ts[0]) setTopic(ts[0].id); })
      .catch((e) => setError(`주제를 불러오지 못했어요: ${e.message}`));
  }, []);

  useEffect(() => {
    if (!topic) return;
    resetTo(null);
    setBankIdx(-1);
    getQuestions(topic)
      .then(setBank)
      .catch((e) => setError(`질문을 불러오지 못했어요: ${e.message}`));
  }, [topic]);

  function resetTo(q: Question | null) {
    setQuestion(q);
    setAnswer("");
    setPhase("idle");
    setResult(null);
    setError("");
  }

  function nextFromBank() {
    if (!bank.length) return;
    const idx = (bankIdx + 1) % bank.length;
    setBankIdx(idx);
    resetTo({ ...bank[idx], source: "bank" });
  }

  async function onGenerate() {
    setLoading("gen");
    setError("");
    try {
      const q = await generateQuestion(topic);
      resetTo({ ...q, source: "ai" });
    } catch (e: any) {
      setError(`질문 생성에 실패했어요: ${e.message}`);
    } finally {
      setLoading(null);
    }
  }

  // 무료: 로컬 모범답안 펼치기
  function reveal() {
    setError("");
    setPhase("revealed");
  }

  // 무료: 자기평가 → 기록 후 다음
  function rate(rating: SelfRating) {
    if (!question) return;
    if (question.source !== "ai") {
      saveProgress(topic, question.id, rating).catch(() => {});
    }
    setStats((s) => ({ count: s.count + 1 }));
    goNext();
  }

  // API: AI 채점
  async function onGrade() {
    if (!question) return;
    if (!answer.trim()) { setError("먼저 답변을 작성해 주세요."); return; }
    setLoading("grade");
    setError("");
    try {
      const r = await gradeAnswer(topic, question.id, question.text, answer);
      setResult(r);
      setPhase("graded");
      setStats((s) => ({ count: s.count + 1 }));
    } catch (e: any) {
      setError(`채점에 실패했어요: ${e.message}`);
    } finally {
      setLoading(null);
    }
  }

  function goNext() {
    if (question?.source === "ai") onGenerate();
    else nextFromBank();
  }

  const scoreColor = (s: number) => (s >= 80 ? C.green : s >= 60 ? C.amber : C.red);

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: SANS, minHeight: "100vh" }}>
      <div style={{ maxWidth: 768, margin: "0 auto", padding: "32px 20px" }}>
        {/* 헤더 */}
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ color: C.amber, fontFamily: MONO, fontSize: 12, letterSpacing: 2 }}>
              TECH&nbsp;INTERVIEW&nbsp;//&nbsp;연습실
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>기술 스택 학습</h1>
          </div>
          <div style={{ textAlign: "right", fontFamily: MONO }}>
            <div style={{ fontSize: 11, color: C.sub }}>이번 세션</div>
            <div style={{ fontSize: 22 }}>{stats.count}<span style={{ color: C.sub, fontSize: 13 }}>문제</span></div>
          </div>
        </header>

        {/* 주제 선택 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {topics.map((t) => {
            const on = t.id === topic;
            const col = TOPIC_COLORS[t.id] ?? C.amber;
            return (
              <button key={t.id} onClick={() => setTopic(t.id)}
                style={{
                  fontFamily: MONO, fontSize: 13, padding: "7px 14px", borderRadius: 8,
                  border: `1px solid ${on ? col : C.line}`,
                  background: on ? col + "22" : "transparent",
                  color: on ? col : C.sub, cursor: "pointer",
                }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 질문 받기 */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={nextFromBank} style={btn(C.line, C.text, C.surface)}>
            <RefreshCw size={15} /> 기본 질문
          </button>
          <button onClick={onGenerate} disabled={loading === "gen"} style={btn(C.amber, "#1A1206", C.amber)}>
            {loading === "gen" ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
            AI 새 질문 생성
          </button>
          {bank.length > 0 && !question && (
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.sub, alignSelf: "center" }}>
              {activeLabel} · 총 {bank.length}문제
            </span>
          )}
        </div>

        {/* 질문 카드 */}
        {!question ? (
          <div style={{ border: `1px dashed ${C.line}`, borderRadius: 12, padding: "44px 20px", textAlign: "center", color: C.sub }}>
            <BookOpen size={26} style={{ margin: "0 auto 10px", opacity: 0.6 }} />
            <div>주제를 고르고 질문을 받아보세요.</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              답을 적은 뒤 <span style={{ color: C.blue }}>모범답안 비교</span>(무료) 또는 <span style={{ color: C.green }}>AI 채점</span>(API)을 고를 수 있어요.
            </div>
          </div>
        ) : (
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontFamily: MONO, fontSize: 11 }}>
              <span style={{ color: activeColor }}>{activeLabel}</span>
              <span style={{ color: C.line }}>|</span>
              <span style={{ color: C.sub }}>
                {question.source === "ai" ? "AI 생성" : "기본 세트"} · 난이도 {question.difficulty}
              </span>
            </div>
            <p style={{ fontSize: 17, lineHeight: 1.6 }}>{question.text}</p>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="여기에 답을 적어보세요. 실제 면접처럼 말하듯 적어도 좋아요."
              rows={6}
              disabled={loading === "grade" || phase === "graded"}
              style={{
                width: "100%", marginTop: 16, boxSizing: "border-box",
                background: C.bg, color: C.text, border: `1px solid ${C.line}`,
                borderRadius: 8, padding: 12, fontSize: 14, lineHeight: 1.6,
                resize: "vertical", outline: "none", fontFamily: SANS,
              }}
            />

            {/* idle: 두 경로 버튼 */}
            {phase === "idle" && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button onClick={reveal} style={btn(C.blue, C.blue, "transparent")}>
                  <Eye size={15} /> 모범답안 보기 (무료)
                </button>
                <button onClick={onGrade} disabled={loading === "grade"} style={btn(C.green, "#06140C", C.green)}>
                  {loading === "grade" ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                  AI 채점받기
                </button>
              </div>
            )}

            {/* revealed: 무료 모범답안 + 내 답 + 자기평가 */}
            {phase === "revealed" && (
              <>
                <AnswerBlock title="모범답안" color={C.blue} text={question.modelAnswer} bg={C.bg} />
                {answer.trim() && <AnswerBlock title="내가 쓴 답" color={C.sub} text={answer} bg={C.surface2} />}
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: C.sub, marginBottom: 10 }}>
                    스스로 평가해 보세요 (선택하면 다음 문제로)
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {RATINGS.map((r) => (
                      <button key={r.key} onClick={() => rate(r.key)} style={btn(r.color, r.color, "transparent")}>
                        {r.icon} {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* graded: AI 채점 결과 */}
            {phase === "graded" && result && (
              <div style={{ marginTop: 18, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex" }}>
                  <div style={{ background: scoreColor(result.score) + "1A", borderRight: `1px solid ${C.line}`, padding: "18px 24px", textAlign: "center", minWidth: 120 }}>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.sub, letterSpacing: 1 }}>SCORE</div>
                    <div style={{ fontFamily: MONO, fontSize: 42, fontWeight: 700, color: scoreColor(result.score), lineHeight: 1.1 }}>{result.score}</div>
                    <div style={{ fontSize: 11, color: C.sub }}>/ 100</div>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Award size={18} style={{ color: scoreColor(result.score) }} />
                      <span style={{ fontSize: 15 }}>{result.verdict}</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: 20, borderTop: `1px solid ${C.line}` }}>
                  <Feedback icon={<CheckCircle2 size={15} />} color={C.green} title="잘한 점" items={result.strengths} />
                  <Feedback icon={<AlertTriangle size={15} />} color={C.amber} title="보완할 점" items={result.improvements} />
                  <AnswerBlock title="모범답안" color={C.blue} text={result.modelAnswer} bg={C.bg} />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                    <button onClick={goNext} style={btn(C.line, C.text, C.surface2)}>
                      <RefreshCw size={15} /> 다음 질문
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 14, background: C.red + "1A", border: `1px solid ${C.red}55`, color: C.red, borderRadius: 8, padding: "10px 14px", fontSize: 14 }}>
            {error}
          </div>
        )}

        <footer style={{ marginTop: 26, fontFamily: MONO, fontSize: 11, color: C.sub, textAlign: "center" }}>
          모범답안 비교는 무료 · AI 채점/생성은 Anthropic API 키가 필요합니다
        </footer>
      </div>

      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        button:disabled{opacity:.6;cursor:not-allowed}`}</style>
    </div>
  );
}

function AnswerBlock({ title, color, text, bg }: { title: string; color: string; text: string; bg: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color, fontFamily: MONO, fontSize: 12 }}>
        {title === "모범답안" && <BookOpen size={15} />} {title}
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.7, background: bg, padding: 14, borderRadius: 8, border: `1px solid ${C.line}`, whiteSpace: "pre-wrap", color: "#D2DBE5", margin: 0 }}>
        {text}
      </p>
    </div>
  );
}

function Feedback({ icon, color, title, items }: { icon: React.ReactNode; color: string; title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color, fontFamily: MONO, fontSize: 12 }}>
        {icon} {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 14, lineHeight: 1.65, color: "#D2DBE5", marginBottom: 3 }}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function btn(border: string, fg: string, bg: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontFamily: MONO, fontSize: 13, fontWeight: 600, padding: "9px 16px",
    borderRadius: 8, border: `1px solid ${border}`,
    background: bg === "transparent" ? "transparent" : bg, color: fg,
    cursor: "pointer",
  };
}
