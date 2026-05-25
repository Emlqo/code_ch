# Roadmap

## 프로젝트 개요

`코드 드로잉 챌린지`는 React + TypeScript + Vite + Tailwind CSS 기반의 교육용 웹게임이다. 학생은 오른쪽 의사코드를 읽고 방향키 또는 가상 방향키를 입력한다. 왼쪽 픽셀 보드에서 캐릭터가 이동하고, 지나간 칸이 색칠되며 최종 그림을 완성한다.

핵심 목표는 중학생이 순차 실행, 반복문, 조건문, 디버깅 사고를 화면 피드백으로 익히게 하는 것이다.

## 기술 스택

- React
- TypeScript
- Vite
- Tailwind CSS
- localStorage
- Vercel 배포 예정

## 전체 게임 구조

- `src/types/game.ts`: 게임 타입 정의
- `src/data/stages.ts`: 스테이지 학습 모드 데이터
- `src/engine/codeParser.ts`: 의사코드 파싱, 실행 큐 생성, 조건 평가
- `src/engine/inputEngine.ts`: 키 입력을 방향으로 변환하고 정답 여부 판정
- `src/engine/boardEngine.ts`: 위치 이동, 보드 밖/벽 판정, 색칠 처리
- `src/engine/scoreEngine.ts`: 점수, 콤보, 별점 계산
- `src/components`: 스테이지 선택, 게임 화면, 보드, 코드 패널, 결과, 로그, 힌트, 방향키 UI
- `src/hooks/useKeyboardInput.ts`: 키보드 방향키 입력 hook
- `src/utils/storage.ts`: 스테이지 진행도 localStorage 저장
- `src/utils/stageValidator.ts`: 스테이지 데이터 검증 유틸

## 스테이지 학습 모드 설명

현재 구현된 기본 모드다.

- 총 5개 챕터, 30개 스테이지
- 챕터별 6개 스테이지
- 초반은 순차 실행 중심
- 중반은 FOR 반복문 중심
- 후반은 IF 조건문과 복합 구조 중심
- 스테이지 선택 화면에서 클리어 여부와 별점 표시
- localStorage 기반 진행 저장
- 실행 로그, 힌트, 결과 화면, 점수/콤보 지원
- 정답 경로를 미리 보여주지 않고, 정확히 이동한 칸만 색칠되도록 난이도 조정됨

## 5분 코드 챌린지 모드 설명

아직 구현되지 않은 예정 모드다.

목표는 제한 시간 5분 동안 무작위 코드 문제를 빠르게 해결하는 모드다.

예상 구조:

- 제한 시간: 5분
- 매 라운드마다 짧은 코드와 보드 생성
- 입력 성공 시 다음 문제로 이동
- 오답 시 콤보 초기화 또는 시간/점수 패널티
- 최종 결과에 점수, 콤보, 해결 문제 수, 정확도 표시
- 오늘의 챌린지는 날짜 기반 seed로 동일한 문제 세트 제공
- 결과 공유용 코드 생성
- 기록 화면에서 이전 결과 확인

## 앞으로의 개발 단계

### 1단계: 기본 프로젝트 구조

- React + TypeScript + Vite + Tailwind CSS 프로젝트 구성
- 기본 컴포넌트 폴더 구조 생성

### 2단계: 타입 정의

- Direction, Position, BoardCell, CodeNode, Stage, GameProgress 등 정의
- 챌린지 모드 타입은 추후 확장

### 3단계: 스테이지 학습 모드

- StageSelect
- GameLayout
- GameContainer
- 30개 스테이지 데이터

### 4단계: 코드 표시 패널

- CodePanel
- move, for, if 표시
- 현재 실행 줄 강조
- 완료/오답 표시

### 5단계: 방향키 입력 판정

- inputEngine
- 키보드 입력
- WASD 입력
- 모바일 가상 방향키

### 6단계: 색칠/그림 완성 시스템

- GameBoard
- boardEngine
- 지나간 칸 색칠
- 정답 경로 미리보기 숨김
- 조건문 색 단서만 표시

### 7단계: 결과 화면

- ResultPanel
- 성공/실패 메시지
- 별점
- 다시 하기/다음 스테이지/스테이지 선택

### 8단계: localStorage 저장

- 스테이지 클리어 결과 저장
- 별점, 실수, 최고 콤보 저장
- 해금 처리

### 9단계: 5분 코드 챌린지 타입 추가

- ChallengeMode 타입
- ChallengeProblem 타입
- ChallengeProgress 타입
- ChallengeResult 타입
- 기존 Stage 타입과 충돌하지 않게 설계

### 10단계: 챌린지 랜덤 문제 생성

- 날짜 seed 또는 랜덤 seed 기반 문제 생성
- move/for/if 난이도별 문제 생성
- board와 solutionInput 검증

### 11단계: 챌린지 준비 화면

- 시작 버튼
- 규칙 설명
- 오늘의 챌린지 안내
- 난이도 선택 여부 결정

### 12단계: 챌린지 플레이 화면

- 제한 시간 중 문제 풀이
- 현재 문제 보드
- 코드 패널
- 방향키 입력
- 다음 문제 전환

### 13단계: 챌린지 타이머

- 5분 카운트다운
- 일시정지 여부 결정
- 타임아웃 시 결과 화면 전환

### 14단계: 챌린지 점수/콤보

- 빠른 정답 보너스
- 콤보 보너스
- 오답 패널티
- 정확도 계산

### 15단계: 챌린지 결과 화면

- 최종 점수
- 해결 문제 수
- 최고 콤보
- 정확도
- 오늘의 결과 요약

### 16단계: 오늘의 챌린지 날짜 seed 기능

- YYYY-MM-DD 기반 seed
- 같은 날짜에는 같은 문제 세트
- 집/학교 PC에서도 동일 문제 재현 가능

### 17단계: 결과 코드 생성

- 공유용 짧은 결과 코드
- 날짜, 점수, 해결 수, 정확도 포함

### 18단계: 기록 화면

- localStorage 기반 챌린지 기록
- 날짜별 점수
- 최고 기록
- 최근 기록

### 19단계: UI/모바일 개선

- 챌린지 모드 모바일 레이아웃
- 보드 카메라/확대 구조
- 더미 색 타일/난이도 개선
- 접근성 개선

### 20단계: 빌드 점검 및 배포 준비

- `npm run build`
- README 갱신
- .gitignore 점검
- Vercel Output Directory `dist` 확인
- 배포 후 smoke test
