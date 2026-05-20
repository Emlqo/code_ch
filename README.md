# 코드 드로잉 챌린지

React, TypeScript, Vite, Tailwind CSS로 만든 교육용 웹게임입니다.

## 게임 설명

오른쪽에 표시된 의사코드를 보고 방향키를 입력하면, 왼쪽 픽셀 보드에서 캐릭터가 이동합니다. 캐릭터가 지나간 칸은 색칠되고, 모든 명령을 정확히 실행하면 하나의 그림이 완성됩니다.

게임은 순차 실행, 반복문, 조건문을 단계적으로 익힐 수 있도록 구성되어 있습니다.

## 실행 방법

```bash
npm install
npm run dev
```

개발 서버가 실행되면 터미널에 표시되는 로컬 주소로 접속합니다.

## 빌드 방법

```bash
npm run build
```

빌드 결과물은 `dist` 폴더에 생성됩니다.

## 미리보기

```bash
npm run preview
```

## 배포 방법

### GitHub

1. 저장소를 생성합니다.
2. 프로젝트 파일을 커밋합니다.
3. GitHub 원격 저장소에 push합니다.

### Vercel

Vercel에서 GitHub 저장소를 연결한 뒤 다음 설정을 사용합니다.

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## 사용 기술

- React
- TypeScript
- Vite
- Tailwind CSS
- localStorage

## 교육적 목적

이 프로젝트는 중학생이 코드의 실행 흐름을 시각적으로 이해하도록 돕기 위해 만들어졌습니다.

- 순차 실행 이해
- 방향 입력과 명령 실행 연결
- FOR 반복문 이해
- IF 조건문 이해
- 실행 로그를 통한 디버깅 사고 연습
- 픽셀 그림 완성을 통한 학습 동기 강화
