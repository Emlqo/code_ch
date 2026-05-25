# Working Rules

## 기본 원칙

- 작업 시작 전 `prompts/handoff.md`와 `prompts/progress.md`를 먼저 읽기
- 필요하면 `prompts/roadmap.md`와 `prompts/working-rules.md`도 함께 읽기
- 한 번에 하나의 작업 단위만 진행하기
- 기존 스테이지 모드 보존하기
- 불필요한 리팩토링 금지하기
- 작업 범위를 작게 유지하기

## 구조 규칙

- 타입은 가능한 `src/types/game.ts`에 정리하기
- 스테이지 데이터는 `src/data/stages.ts`에 유지하기
- 코드 해석은 `src/engine/codeParser.ts`에 유지하기
- 입력 판정은 `src/engine/inputEngine.ts`에 유지하기
- 보드 이동은 `src/engine/boardEngine.ts`에 유지하기
- 점수 계산은 `src/engine/scoreEngine.ts`에 유지하기
- localStorage는 `src/utils/storage.ts` 또는 별도 hook으로 분리하기
- 챌린지 모드는 `components/challenge` 폴더 중심으로 분리하기
- 엔진 로직과 UI 로직 분리하기

## 입력/이벤트 규칙

- 방향키 이벤트 중복 등록 방지하기
- 기존 `useKeyboardInput` hook을 우선 재사용하기
- 스테이지 모드와 챌린지 모드의 방향키 이벤트가 동시에 반응하지 않게 하기
- React `useEffect` cleanup 철저히 하기
- 타이머, interval, timeout은 unmount 시 반드시 정리하기

## 저장소 규칙

- localStorage key 충돌 방지하기
- 스테이지 진행 저장과 챌린지 기록 저장 key를 분리하기
- 저장 데이터는 JSON parse 에러에 안전하게 처리하기
- SSR 또는 정적 배포 환경을 고려해 `window` 접근은 방어적으로 처리하기

## TypeScript 규칙

- TypeScript `any` 최소화하기
- 가능한 union type과 interface를 명확히 사용하기
- 데이터 구조가 늘어나면 타입부터 정의하기
- 빌드 오류를 남긴 채 작업을 끝내지 않기

## UI 규칙

- 중학생 대상 교육용 게임 톤 유지하기
- 너무 유치하지 않은 밝고 깔끔한 UI 유지하기
- 모바일에서도 플레이 가능해야 함
- 챌린지 UI는 기존 스테이지 UI와 시각적으로 연결되되 코드 구조는 분리하기
- 보드, 코드 패널, 조작 패널이 서로 겹치지 않게 하기

## 검증 규칙

- 작업 후 가능하면 `npm run build` 확인하기
- 스테이지 데이터 변경 시 `stageValidator` 기준을 고려하기
- 기존 스테이지 모드가 깨지지 않았는지 확인하기
- 배포 관련 변경 후 README와 .gitignore를 확인하기

## 문서 갱신 규칙

- 작업 후 `prompts/progress.md` 갱신하기
- 작업 후 `prompts/handoff.md` 갱신하기
- 다음 작업이 바뀌면 `prompts/codex-next-prompt.md` 갱신하기
- 새로 만든 구조나 중요한 결정은 문서에 남기기
