# Handoff

## 프로젝트 개요

- 프로젝트 이름: 코드 드로잉 챌린지
- 목적: 중학생이 코드 실행 흐름을 픽셀 보드와 캐릭터 이동으로 이해하도록 돕는 교육용 웹게임
- 대상 사용자: 중학생, 정보/코딩 수업 학습자
- 핵심 게임 방식: 오른쪽 의사코드를 읽고 방향키 또는 가상 방향키를 입력하면 왼쪽 보드에서 캐릭터가 이동한다. 캐릭터가 지나간 칸이 색칠되고, 모든 명령을 정확히 실행하면 그림이 완성된다.

## 기술 스택

- React
- TypeScript
- Vite
- Tailwind CSS
- localStorage
- Vercel 배포 예정

## 현재 폴더 구조

```text
src/
  App.tsx
  main.tsx
  styles.css
  types/
    game.ts
    admin.ts
  data/
    stages.ts
  engine/
    boardEngine.ts
    codeParser.ts
    codeFormatter.ts
    inputEngine.ts
    scoreEngine.ts
  hooks/
    useKeyboardInput.ts
  utils/
    direction.ts
    adminStorage.ts
    stageOrder.ts
    stageValidator.ts
    storage.ts
  components/
    GameContainer.tsx
    GameLayout.tsx
    GameBoard.tsx
    CodePanel.tsx
    StageInfo.tsx
    StageSelect.tsx
    ControlGuide.tsx
    VirtualDPad.tsx
    ResultPanel.tsx
    HintPanel.tsx
    ExecutionLog.tsx
    admin/
      AdminLogin.tsx
      AdminPage.tsx
      StageOrderManager.tsx
      StageCodeDisplayManager.tsx
```

프로젝트 루트에는 `README.md`, `.gitignore`, `package.json`, `tailwind.config.js`, `postcss.config.js`, `tsconfig` 파일들이 있다.

## 현재 구현된 기능

- React + TypeScript + Vite + Tailwind CSS 기본 앱
- 스테이지 선택 화면
- 스테이지 학습 모드
- 5개 챕터, 30개 스테이지 데이터
- `solutionInput` 기반 개발 검증 데이터
- 스테이지 데이터 검증 유틸
- 픽셀 보드 렌더링
- 정답 경로 미리보기 숨김
- IF 조건 색 단서 표시
- 캐릭터 이동 및 색칠
- 코드 패널
- move, FOR, IF 코드 표시
- FOR 반복 parentInfo 표시
- IF 조건 평가 결과 표시
- 방향키/WASD 입력
- 모바일 가상 방향키
- 입력 정답/오답 판정
- 보드 밖/벽 이동 판정
- 점수, 콤보, 별점
- 실행 로그
- 힌트 시스템
- 성공/실패 결과 화면
- localStorage 기반 스테이지 진행 저장
- 스테이지 해금
- 27~30번 대형 심화 스테이지
- `currentTileIsYellow`, `currentTileIsBlue`, `currentTileIsRed` 색상 조건
- `nextTileIsBlue`, `nextTileIsYellow` 기반 후반부 IF/ELSE 스테이지
- 관리자 로그인 화면
- 관리자 비밀번호 `0327` 기반 임시 입장 처리
- 관리자 페이지 스테이지 순서 변경 및 localStorage 저장
- 관리자 페이지 스테이지별 코드 표시 방식 설정 및 localStorage 저장
- `pseudocode` / `cStyle` 코드 표시 포맷터
- 관리자 페이지 선택 스테이지 코드 미리보기
- 게임 화면 `CodePanel`의 관리자 코드 표시 방식 반영
- 개발 모드 콘솔 스테이지 검증
- README와 배포 기본 설명

## 아직 구현되지 않은 기능

- 5분 코드 챌린지 모드
- 챌린지 전용 타입
- 챌린지 문제 생성 엔진
- 챌린지 준비 화면
- 챌린지 플레이 화면
- 5분 타이머
- 챌린지 점수/콤보/정확도 계산
- 챌린지 결과 화면
- 오늘의 챌린지 날짜 seed
- 결과 공유 코드
- 챌린지 기록 화면
- 챌린지 localStorage 저장
- 큰 보드용 카메라/뷰포트 이동
- 체크포인트 모드 정식 구현

## 최근 작업 상태

최근 작업은 배포 전 안정화와 인수인계 문서 시스템 구축이다. 그 직전에는 스테이지 학습 모드 리팩토링, 키보드 입력 hook 분리, `GameContainer` 분리, 스테이지 검증 유틸 추가, README/.gitignore 배포 점검이 진행되었다.

현재 코드 기준으로 스테이지 학습 모드는 기본 플레이가 가능한 상태다. 최근 작업은 27~30번 후반부 심화 스테이지 교체와 색상 조건 확장이다. 27~30번은 25~26번처럼 더 큰 픽셀 보드를 사용하며, FOR 내부 IF와 current/next 색상 조건을 실제 실행 큐 생성에 반영한다. 관리자 로그인, 스테이지 순서 관리, 코드 표시 방식 관리, 선택 스테이지 코드 미리보기, localStorage 저장 흐름도 구현되어 있다. `npm run build` 기준 TypeScript 빌드는 통과했다.

브라우저 도구에서 localhost 직접 접속은 환경 제한으로 확인하지 못했지만, dev 서버는 PowerShell HTTP 요청 기준 `200` 응답을 확인했다. 다음 큰 개발 축은 5분 코드 챌린지 모드다.

## 다음에 해야 할 작업

다음 Codex 세션에서는 `9단계: 5분 코드 챌린지 타입 추가`만 진행한다.

구체적으로는 `src/types/game.ts`에 기존 Stage 모드를 깨지 않는 방식으로 챌린지 전용 타입을 추가한다.

예상 타입:

- `ChallengeMode`
- `ChallengeProblem`
- `ChallengeProgress`
- `ChallengeResult`
- `ChallengeDifficulty`
- `ChallengeStorageRecord`

아직 UI나 엔진은 만들지 말고 타입만 설계한다.

## 주의사항

- 기존 스테이지 모드를 깨지 말 것
- 방향키 이벤트가 스테이지 모드와 챌린지 모드에서 충돌하지 않게 할 것
- localStorage key가 충돌하지 않게 할 것
- TypeScript any 사용을 최소화할 것
- 작업 후 npm run build를 확인할 것
- 작업 후 progress.md와 handoff.md를 갱신할 것
- 챌린지 모드는 `components/challenge` 폴더 중심으로 분리할 것
- 엔진 로직과 UI 로직을 분리할 것
- 불필요한 리팩토링은 피할 것

## 실행 방법

```bash
npm install
npm run dev
```

## 빌드 방법

```bash
npm run build
```

## 2026-05-24 최근 갱신

- 27~30번 스테이지를 균일한 좌우 반복 패턴에서 실제 픽셀아트 실루엣 중심으로 다시 구성했다.
- 27번은 번개 화살표, 28번은 로봇 얼굴, 29번은 큰 방패, 30번은 로봇 보스 트로피 컨셉이다.
- 27~30번은 `currentTileIsYellow`, `currentTileIsBlue`, `currentTileIsRed`, `nextTileIsBlue`, `nextTileIsYellow` 조건을 실제 실행 큐 생성에 사용한다.
- `npm run build` 기준으로 TypeScript/Vite 빌드가 통과했다.

## Git 작업 권장 흐름

```bash
git status
git add .
git commit -m "작업 내용"
git push
```
