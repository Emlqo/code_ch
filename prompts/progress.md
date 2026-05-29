# Progress

## 2026-05-28 Firebase Battle Room Update

## 완료됨
- [x] `firebase` dependency installed and build-safe.
- [x] `.env.example` includes Firebase Vite env keys and `VITE_USE_FIREBASE=false`.
- [x] `src/services/firebase/firebaseClient.ts` initializes Firebase App and Firestore only when env config is complete.
- [x] `battleRoomServiceFactory` selects Firebase only when `VITE_USE_FIREBASE === "true"` and Firebase config is complete.
- [x] Local mock service remains the fallback when Firebase is disabled or missing config.
- [x] `firebaseBattleRoomService` implements create/join/start/finish/update/subscribe/history with Firestore.
- [x] Firestore writes are cleaned so `undefined` fields do not break writes.
- [x] Firestore snapshot subscription errors are handled with development warnings and safe callbacks.
- [x] Firestore rules draft document added at `docs/firebase-firestore-rules-draft.md`.
- [x] `npm run build` passes after Firebase integration.

## 진행 예정
- [ ] Add real `.env.local` Firebase config locally and run browser smoke test with `VITE_USE_FIREBASE=true`.
- [ ] Verify Firebase console documents are created under `rooms`, nested `participants`, and `roomHistory`.
- [ ] Configure Firestore security rules before public deployment.
- [ ] Add Firebase Authentication later before real classroom operation.

## 현재 우선순위
1. Put real Firebase values in `.env.local` and test teacher room creation.
2. Join the room from a second browser/device and verify live participant and score updates.
3. Confirm automatic finish and `roomHistory/{roomId}` creation in Firebase console.

## 완료됨
- [x] React + TypeScript + Vite + Tailwind CSS 기본 프로젝트 구조
- [x] 스테이지 학습 모드, 1~30번 스테이지 데이터, 보드/코드/결과 UI 구현
- [x] `move`, `for`, `if`, 색상 조건 IF 실행 구조 구현
- [x] 키보드, VirtualDPad, 모바일 보드 터치 입력 구현
- [x] 점수, 콤보, 힌트, 실행 로그, 난이도별 실패 처리 구현
- [x] localStorage 기반 스테이지 진행 저장 구현
- [x] 관리자 로그인, 관리자 페이지, 스테이지 순서 변경 구현
- [x] 관리자 페이지의 스테이지별 코드 표시 방식 설정 구현
- [x] 한글 블록 코드, pseudocode, cStyle 코드 표시 구조 구현
- [x] 코드런 챌린지 개인 모드 구현
- [x] 코드런 챌린지 설정, 플레이, 타이머, 점수, 결과, 기록 화면 구현
- [x] 코드런 챌린지 localStorage 기록 저장 구현
- [x] 코드런 배틀룸 타입 정의 구현
- [x] localStorage 기반 배틀룸 mock service 구현
- [x] 배틀룸 진입 버튼과 `BattleRoomContainer` 연결 구현
- [x] 교사용 방 만들기 화면 구현
- [x] 학생 입장 코드 화면 구현
- [x] 배틀 대기실, 참여자 목록, 교사 시작 버튼 구현
- [x] 배틀 플레이 화면 구현
- [x] `room.currentSeed` 기반 동일 문제 목록 생성 구조 구현
- [x] 배틀 플레이 점수 업데이트 구현
- [x] 실시간 랭킹 화면과 교사용 방 종료 구현
- [x] 시간 종료 시 방 자동 `finished` 처리 구현
- [x] 배틀 기록 저장, winner 저장, 지난 기록 보기 구현
- [x] Firebase Firestore 연결 준비용 placeholder/factory 구조 구현
- [x] Firebase config 없이 local service fallback 유지
- [x] `npm run build` 통과 확인

## 진행 예정
- [ ] 실제 브라우저에서 배틀룸 2명 이상 참여 흐름 수동 QA
- [ ] 교사용 실시간 관리 화면 고도화
- [ ] 배틀룸 랭킹 화면 모바일 세부 QA
- [ ] Firebase config 수령 후 Firebase service 실제 구현
- [ ] Vercel 배포 전 전체 smoke test

## 현재 우선순위
1. 브라우저에서 교사 방 생성, 학생 입장, 시작, 플레이, 랭킹, 기록 저장 흐름을 수동 QA
2. Firebase 연결 전 local mock service의 수업 환경 사용성 점검
3. Firebase config가 준비되면 `firebaseBattleRoomService` 실제 구현
