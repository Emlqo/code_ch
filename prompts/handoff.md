# Handoff

## 2026-05-28 Firebase Battle Room Status

Code Run Battle Room now has two interchangeable services behind `battleRoomService`.

- Default import for components: `src/services/battleRoom/battleRoomService.ts`
- Factory: `src/services/battleRoom/battleRoomServiceFactory.ts`
- Firebase client: `src/services/firebase/firebaseClient.ts`
- Firebase implementation: `src/services/battleRoom/firebaseBattleRoomService.ts`
- Local fallback: `src/services/battleRoom/localBattleRoomService.ts`

Service selection:

- Uses Firebase only when `VITE_USE_FIREBASE === "true"` and all required Firebase env values are present.
- Falls back to localStorage mock when Firebase is disabled, missing config, or Firebase app initialization fails.
- Development console logs show `[BattleRoomService] using firebase` or `[BattleRoomService] using local mock`.

Firestore collections:

```text
rooms/{roomId}
rooms/{roomId}/participants/{participantId}
roomHistory/{roomId}
```

Current Firebase implementation supports:

- `createRoom`
- `getRoomByCode`
- `joinRoom`
- `leaveRoom`
- `startRoom`
- `finishRoom`
- `updateParticipantScore`
- `subscribeRoom`
- `subscribeParticipants`
- `getRoomHistory`

Important notes:

- Firestore writes are cleaned to remove `undefined` values before saving.
- Snapshot subscription errors are handled with safe callbacks and dev warnings.
- Security rules are not applied in code. Rules planning document is `docs/firebase-firestore-rules-draft.md`.
- Real browser QA still needs actual `.env.local` Firebase config and `VITE_USE_FIREBASE=true`.
- After Firebase QA, check Firebase console for `rooms`, nested `participants`, and `roomHistory`.

## 프로젝트 개요
- 프로젝트 이름: 코드 드로잉 챌린지
- 목적: 중학생이 방향 입력, 순차 실행, 반복문, 조건문을 게임으로 익히는 교육용 웹게임
- 대상 사용자: 중학생, 정보/코딩 수업 교사
- 핵심 게임 방식: 코드를 읽고 방향키, 가상 방향키, 보드 터치로 캐릭터를 움직인다. 스테이지 모드에서는 그림을 완성하고, 코드런 모드에서는 제한 시간 동안 코스를 완주한다.

## 기술 스택
- React
- TypeScript
- Vite
- Tailwind CSS
- localStorage
- Vercel 배포 예정
- Firebase Firestore 연결 예정, 현재는 config 없이 local mock service 사용

## 현재 폴더 구조 요약
```text
src/
  components/
    admin/
    battle/
    challenge/
    GameContainer.tsx
    GameLayout.tsx
    StageSelect.tsx
  data/stages.ts
  engine/
  hooks/useKeyboardInput.ts
  services/
    battleRoom/
    firebase/
  types/
    admin.ts
    battleRoom.ts
    challenge.ts
    game.ts
  utils/
```

## 현재 구현된 기능
- 스테이지 학습 모드 1~30번
- 방향키, WASD, VirtualDPad, 모바일 보드 터치 입력
- 한글 블록 코드, pseudocode, cStyle 코드 표시
- 관리자 로그인과 스테이지 순서/코드 표시 방식 설정
- 코드런 개인 챌린지 모드
- 코드런 개인 기록 저장과 기록 보기
- 코드런 배틀룸 진입
- 교사용 배틀룸 생성
- 학생 입장 코드 참여
- 배틀 대기실과 참여자 목록
- 교사 시작 버튼
- 학생 배틀 플레이 화면
- `room.currentSeed` 기반 동일 문제 생성
- 참가자 점수 업데이트
- 실시간 랭킹 화면
- 시간 종료 시 자동 방 종료
- 배틀 히스토리 저장과 지난 기록 보기
- Firebase 연결 준비용 placeholder/factory 구조

## 아직 구현되지 않은 기능
- Firebase Firestore 실제 연결
- 교사용 실시간 관리 화면 고도화
- 배틀룸 실제 다중 브라우저 수동 QA
- 배틀룸 기록 삭제 기능
- 배틀룸 화면별 세부 모바일 QA

## 최근 작업 상태
코드런 배틀룸 기능을 localStorage mock service 기준으로 최종 점검했다. `npm run build`는 통과했다. Firebase 관련 파일은 import-safe placeholder 구조이며 실제 `firebase/*` 패키지를 import하지 않는다.

## localStorage Key
- `codeDrawingChallengeStageProgress`: 스테이지 진행 기록
- `codeDrawingStageOrder`: 관리자 스테이지 순서
- `codeDrawingStageCodeDisplayModes`: 관리자 코드 표시 방식
- `codeDrawingFiveMinuteChallengeRecords`: 코드런 개인 챌린지 기록
- `codeRunBattleRooms`: 코드런 배틀룸 방 목록
- `codeRunBattleParticipants`: 코드런 배틀룸 참가자 목록
- `codeRunBattleHistory`: 코드런 배틀룸 종료 기록

## 다음에 해야 할 작업
브라우저에서 배틀룸 수동 QA를 진행한다. 추천 순서: 교사 방 생성, 입장 코드 확인, 학생 입장, 대기실 참여자 목록 확인, 교사 시작, 학생 플레이, 점수 업데이트, 랭킹 확인, 시간 종료, 지난 기록 확인.

## 주의사항
- 기존 스테이지 모드를 깨지 말 것
- 기존 개인 코드런 챌린지 모드를 깨지 말 것
- 관리자 페이지 흐름을 깨지 말 것
- 방향키 이벤트가 스테이지, 개인 코드런, 배틀룸에서 동시에 등록되지 않게 할 것
- localStorage key가 충돌하지 않게 할 것
- Firebase config가 없을 때도 앱이 build되고 실행되어야 할 것
- TypeScript any 사용을 최소화할 것
- 작업 후 `npm run build`를 확인할 것
- 작업 후 `prompts/progress.md`와 `prompts/handoff.md`를 갱신할 것

## 실행 방법
```bash
npm install
npm run dev
```

## 빌드 방법
```bash
npm run build
```

## Git 작업 권장 흐름
```bash
git status
git add .
git commit -m "작업 내용"
git push
```
