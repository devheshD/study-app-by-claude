# 기술 스택 학습하기

백엔드 기술 스택(Kotlin / Java / Spring / Elasticsearch / MySQL / Kafka) 연습용 스터디 앱.
답을 적은 뒤 **모범답안과 비교**(무료)하거나 **AI 채점**(API)을 받을 수 있습니다.

- **server** — Node + TypeScript (Express). 질문·모범답안은 로컬 JSON, 이력은 JSONL에 저장. AI 채점/생성은 Claude 호출.
- **client** — React + TypeScript (Vite).

## 두 가지 사용 방식
| 기능 | 비용 | API 키 |
|---|---|---|
| 기본 질문 48개 + **모범답안 비교** + 자기평가 | 무료 | 불필요 |
| **AI 채점**(점수·피드백) + **AI 새 질문 생성** | 토큰 사용량만큼 | 필요 |

API 키 없이도 모범답안 비교로 충분히 연습할 수 있고, 키를 넣으면 AI 채점이 추가로 켜집니다.

## 실행 방법

루트 폴더(이 README가 있는 곳)에서:

```bash
npm run install:all     # 처음 한 번만 — server/client 의존성 설치

# (AI 기능을 쓸 경우에만) 키 설정
cp server/.env.example server/.env     # Windows: copy server\.env.example server\.env
#   → server/.env 의 ANTHROPIC_API_KEY 에 실제 키 입력 (https://console.anthropic.com)

npm run dev             # 서버(4000) + 클라이언트(5173) 동시 실행
```

브라우저에서 **http://localhost:5173** 접속. `Ctrl + C` 한 번이면 둘 다 종료됩니다.

> 키를 안 넣어도 앱은 켜지며, AI 버튼을 누르면 "모범답안 비교를 쓰라"는 안내가 나옵니다.

### 따로 실행
```bash
cd server && npm run dev     # 터미널 1
cd client && npm run dev     # 터미널 2
```

## 비용 참고 (AI 채점/생성)
종량제라 쓴 만큼만 과금됩니다(월 구독 아님). 무료 경로(모범답안 비교)는 과금이 전혀 없고, AI 채점/생성을 쓸 때만 토큰 사용량만큼 부과됩니다.

모델은 `server/src/claude.ts` 의 `MODEL` 한 곳에서 바꿉니다. 현재 기본값은 **Haiku 4.5**(가장 저렴).

| 모델 | 모델 ID | 입력 ($/1M 토큰) | 출력 ($/1M 토큰) | 특징 |
|---|---|---|---|---|
| **Haiku 4.5** (기본) | `claude-haiku-4-5-20251001` | $1 | $5 | 가장 빠르고 저렴 |
| Sonnet 4.6 | `claude-sonnet-4-6` | $3 | $15 | 속도·품질 균형 |
| Opus 4.8 | `claude-opus-4-8` | $5 | $25 | 최고 품질 |

채점/생성 1회는 입력·출력 합쳐 대략 1~2천 토큰 수준이라, Haiku 기준 1회당 1센트 안팎입니다. 더 깊이 있는 피드백이 필요하면 Sonnet이나 Opus로 올리면 됩니다.

## 질문 추가/수정
`server/data/questions/<주제>.json` 에 항목 추가:
```json
{ "id": "kafka-09", "difficulty": "쉬움|중간|어려움", "text": "질문 내용", "modelAnswer": "모범답안" }
```

## API
| 메서드 | 경로 | 설명 | 키 |
|---|---|---|---|
| GET | `/api/topics` | 주제 목록 | - |
| GET | `/api/questions/:topic` | 질문 + 모범답안 | - |
| POST | `/api/progress` | 자기평가 기록 `{topic, questionId, rating}` | - |
| POST | `/api/questions/generate` | AI 새 질문 생성 `{topic}` | 필요 |
| POST | `/api/answers/grade` | AI 채점 `{topic, questionId, question, answer}` | 필요 |
| GET | `/api/history` | 학습 이력 | - |
