# Progress

## 완료됨

- [x] React + TypeScript + Vite + Tailwind CSS 기본 프로젝트 구조
- [x] `src/types/game.ts` 중심의 기본 게임 타입 정의
- [x] Direction, Position, BoardCell, CodeNode, Stage, GameProgress 타입 정의
- [x] move, for, if CodeNode 구조 정의
- [x] `checkDirection` 기반 IF 조건 구조 추가
- [x] 스테이지 데이터 `src/data/stages.ts` 정리
- [x] 5개 챕터, 총 30개 스테이지 데이터 생성
- [x] 각 스테이지 `solutionInput` 포함
- [x] 스테이지 데이터 검증 유틸 `src/utils/stageValidator.ts` 구현
- [x] 메인 게임 컨테이너 `GameContainer` 구성
- [x] 스테이지 선택 화면 `StageSelect` 구현
- [x] 메인 게임 화면 `GameLayout` 구현
- [x] 픽셀 보드 `GameBoard` 구현
- [x] 정답 경로 미리보기 숨김 처리
- [x] IF 조건문용 색 단서 표시
- [x] 코드 표시 패널 `CodePanel` 구현
- [x] FOR 반복문 표시 및 parentInfo 피드백
- [x] IF 조건문 표시 및 조건 평가 결과 표시
- [x] 코드 파서 `codeParser.ts` 구현
- [x] move/for 실행 큐 변환
- [x] IF 조건 평가 기반 실행 큐 생성
- [x] 입력 판정 엔진 `inputEngine.ts` 구현
- [x] 보드 이동 엔진 `boardEngine.ts` 구현
- [x] 점수 엔진 `scoreEngine.ts` 구현
- [x] 점수, 콤보, 최종 점수, 별점 계산
- [x] 실행 로그 패널 `ExecutionLog` 구현
- [x] 힌트 패널 `HintPanel` 구현
- [x] 결과 패널 `ResultPanel` 구현
- [x] 가상 방향키 `VirtualDPad` 구현
- [x] 키보드 입력 hook `useKeyboardInput` 구현
- [x] localStorage 기반 스테이지 진행 저장
- [x] 관리자 로그인 화면 구현
- [x] 관리자 비밀번호 `0327` 기반 임시 입장 처리
- [x] 관리자 페이지 기본 레이아웃 구현
- [x] 관리자 페이지 스테이지 순서 변경 UI 구현
- [x] 스테이지 순서 localStorage 저장 및 초기화 구현
- [x] 스테이지별 코드 표시 방식 설정 UI 구현
- [x] 코드 표시 방식 localStorage 저장 및 초기화 구현
- [x] `pseudocode` / `cStyle` 코드 표시 포맷터 구현
- [x] 관리자 페이지 선택 스테이지 코드 미리보기 구현
- [x] 게임 화면 `CodePanel`에 관리자 코드 표시 방식 반영
- [x] 관리자 기능 안정화 점검 및 `npm run build` 통과 확인
- [x] 27~30번 심화 스테이지 전면 교체
- [x] `currentTileIsYellow`, `currentTileIsBlue`, `currentTileIsRed` 색상 조건 추가
- [x] 27~30번 대형 픽셀 보드와 FOR 내부 IF 조건 실행 검증
- [x] 난이도별 실패 처리 기초 구현
- [x] 모바일 반응형 기본 레이아웃 구현
- [x] README 기본 배포 설명 작성
- [x] `.gitignore` 배포 기본 항목 정리
- [x] `npm run build` 통과 확인

## 진행 예정

- [ ] 5분 코드 챌린지 타입 추가
- [ ] 챌린지 문제 생성 엔진 구현
- [ ] 챌린지 준비 화면 구현
- [ ] 챌린지 플레이 화면 구현
- [ ] 챌린지 타이머 구현
- [ ] 챌린지 점수/콤보 시스템 구현
- [ ] 챌린지 결과 화면 구현
- [ ] 오늘의 챌린지 날짜 seed 기능 구현
- [ ] 결과 공유 코드 생성
- [ ] 챌린지 기록 화면 구현
- [ ] 챌린지 localStorage key 설계
- [ ] `components/challenge` 폴더 생성 및 챌린지 UI 분리
- [ ] 큰 보드용 카메라/뷰포트 이동 구조 구현
- [ ] 체크포인트 모드 정식 구현 확인 필요
- [ ] 더미 색 타일을 활용한 고난도 스테이지 개선 확인 필요
- [ ] 배포 후 Vercel smoke test 확인 필요

## 현재 우선순위

1. 5분 코드 챌린지 타입 추가
2. 챌린지 랜덤 문제 생성 엔진 설계
3. 챌린지 준비 화면 구현
4. 챌린지 플레이 화면과 타이머 구현
5. 챌린지 결과/기록 저장 구현
 
## 2026-05-24 추가 갱신

- [x] 27~30번 심화 스테이지를 균일한 좌우 반복 패턴에서 실제 픽셀아트 실루엣 경로로 재구성
- [x] 27번: 번개 화살표, 28번: 로봇 얼굴, 29번: 큰 방패, 30번: 로봇 보스 트로피
- [x] 27~30번 코드와 `solutionInput` 검증 및 `npm run build` 통과 확인
