# Firestore Security Rules Draft

이 문서는 코드런 배틀룸 기능을 Firestore로 운영하기 전에 필요한 보안 규칙 방향을 정리한 초안입니다.

현재 프로젝트에는 교사 로그인과 학생 로그인 기능이 아직 없습니다. 따라서 아래 내용은 실제 배포용 rules 파일이 아니라, 인증 구조를 붙이기 전까지 어떤 위험이 있고 어떤 방향으로 설계해야 하는지 정리한 운영 메모입니다.

## 1. 현재 Firestore 데이터 구조

현재 코드런 배틀룸은 다음 컬렉션 구조를 사용합니다.

```text
rooms/{roomId}
rooms/{roomId}/participants/{participantId}
roomHistory/{roomId}
```

`rooms/{roomId}`에는 방 코드, 방 상태, 제한 시간, 난이도, seed, 참여 인원 수가 저장됩니다.

`rooms/{roomId}/participants/{participantId}`에는 학생 닉네임, 점수, 정답/오답 수, 완료한 코스 수, 정확도, 최고 연속 입력, 온라인 여부가 저장됩니다.

`roomHistory/{roomId}`에는 종료된 배틀룸의 최종 랭킹과 우승자 정보가 저장됩니다.

## 2. 개발용 임시 규칙의 위험성

개발 중에는 편의를 위해 모든 읽기/쓰기를 허용하는 규칙을 사용할 수 있지만, 실제 배포에는 매우 위험합니다.

예시 위험:

- 아무 사용자가 방을 만들거나 삭제할 수 있음
- 학생이 다른 학생의 점수를 수정할 수 있음
- 이미 종료된 방 기록을 임의로 조작할 수 있음
- 방 상태를 `playing` 또는 `finished`로 마음대로 변경할 수 있음
- `roomHistory`에 가짜 랭킹을 저장할 수 있음

개발용 전체 허용 규칙은 수업 테스트용 임시 환경에서만 사용해야 하며, 공개 배포 전에는 반드시 제거해야 합니다.

## 3. 실제 배포 시 필요한 인증 구조

실제 배포에서는 최소한 다음 중 하나가 필요합니다.

1. Firebase Anonymous Authentication
2. 교사용 로그인
3. 교사용 관리자 코드 + 서버 검증
4. Firebase Auth custom claims 기반 teacher/student role

초기 운영에서는 익명 인증을 먼저 도입하는 방식이 현실적입니다.

익명 인증을 사용하면 학생이 별도 회원가입 없이 참여할 수 있고, Firestore rules에서 `request.auth.uid`를 기준으로 자신의 participant 문서만 수정하도록 제한할 수 있습니다.

## 4. 학생이 수정할 수 있는 필드 제한

학생은 자신이 입장한 방의 자신의 participant 문서만 수정할 수 있어야 합니다.

학생이 수정 가능해야 하는 필드:

- `score`
- `correctInputs`
- `wrongInputs`
- `solvedProblems`
- `maxCombo`
- `currentCombo`
- `accuracy`
- `finishedAt`
- `resultCode`
- `isOnline`

학생이 수정하면 안 되는 필드:

- `id`
- `roomId`
- `nickname`
- `joinedAt`

권장 방향:

- participant 문서에 `ownerUid` 필드를 추가합니다.
- 학생 입장 시 `ownerUid: request.auth.uid`를 저장합니다.
- Firestore rules에서 `request.auth.uid == resource.data.ownerUid`인 경우에만 자신의 participant 문서를 수정할 수 있게 합니다.
- update 시 변경 가능한 key 목록을 제한합니다.

## 5. 교사만 할 수 있어야 하는 작업

아래 작업은 학생이 할 수 없어야 합니다.

- `createRoom`
- `startRoom`
- `finishRoom`
- `roomHistory` 생성
- 방 설정 변경
- 방 상태 변경
- 강제 종료

권장 방향:

- `rooms/{roomId}` 문서에 `teacherUid` 필드를 추가합니다.
- 방 생성 시 `teacherUid: request.auth.uid`를 저장합니다.
- Firestore rules에서 `request.auth.uid == resource.data.teacherUid`인 경우에만 방 상태를 변경할 수 있게 합니다.
- `roomHistory/{roomId}` 생성은 해당 방의 `teacherUid`와 일치하는 사용자만 허용합니다.

## 6. 익명 인증 도입 제안

학생용 초기 인증은 Firebase Anonymous Authentication을 추천합니다.

장점:

- 학생이 회원가입 없이 바로 참여 가능
- 각 학생에게 고유 `uid`가 생김
- 자신의 participant 문서만 수정하도록 제한 가능
- 나중에 닉네임 중복이나 재접속 처리에도 활용 가능

추가로 필요한 데이터:

```text
rooms/{roomId}/participants/{participantId}
  ownerUid: string
```

학생 입장 흐름:

1. 앱 시작 시 익명 로그인
2. 입장 코드와 닉네임 입력
3. participant 문서 생성 시 `ownerUid` 저장
4. 이후 점수 업데이트는 `ownerUid`가 같은 문서만 허용

## 7. 교사 관리자 인증 도입 제안

교사용 기능은 학생보다 더 강하게 보호해야 합니다.

가능한 방식:

- Firebase 이메일 로그인
- Google 로그인
- 학교 계정 기반 로그인
- custom claims로 `teacher: true` 부여

권장 최종 구조:

```text
users/{uid}
  role: "teacher" | "student"
```

또는 Firebase custom claims:

```text
request.auth.token.teacher == true
```

교사 권한이 필요한 작업:

- 방 생성
- 방 시작
- 방 종료
- 지난 기록 조회
- 모든 참가자 점수 조회

## 8. 보안 규칙 방향 예시

아래는 실제 적용용이 아니라 방향을 설명하기 위한 예시입니다.

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.teacherUid == request.auth.uid;
      allow update: if request.auth != null && resource.data.teacherUid == request.auth.uid;

      match /participants/{participantId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && request.resource.data.ownerUid == request.auth.uid;
        allow update: if request.auth != null
          && resource.data.ownerUid == request.auth.uid
          && request.resource.data.diff(resource.data).changedKeys().hasOnly([
            'score',
            'correctInputs',
            'wrongInputs',
            'solvedProblems',
            'maxCombo',
            'currentCombo',
            'accuracy',
            'finishedAt',
            'resultCode',
            'isOnline'
          ]);
      }
    }

    match /roomHistory/{roomId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null;
    }
  }
}
```

주의: 위 예시는 `teacherUid`, `ownerUid`가 실제 데이터에 추가된 뒤에만 의미가 있습니다. 현재 코드에는 아직 해당 필드가 없으므로 그대로 적용하면 안 됩니다.

## 9. 운영 전 체크리스트

- [ ] Firebase Anonymous Authentication 도입 여부 결정
- [ ] 교사 로그인 방식 결정
- [ ] `rooms/{roomId}`에 `teacherUid` 추가
- [ ] `participants/{participantId}`에 `ownerUid` 추가
- [ ] 학생이 수정 가능한 participant 필드 목록 확정
- [ ] 학생이 다른 학생 점수를 수정할 수 없는지 테스트
- [ ] 학생이 room 상태를 변경할 수 없는지 테스트
- [ ] 학생이 roomHistory를 생성하거나 수정할 수 없는지 테스트
- [ ] 교사만 startRoom, finishRoom을 실행할 수 있는지 테스트
- [ ] 개발용 전체 허용 rules 제거
- [ ] Firebase 사용량 제한과 예산 알림 설정
- [ ] 수업 테스트용 프로젝트와 실제 운영 프로젝트 분리 검토

## 10. 현재 단계 권장 결론

현재는 로그인 기능이 없으므로, Firestore 연결은 개발/수업 테스트 수준으로만 사용해야 합니다.

공개 배포 전에 최소한 익명 인증을 도입하고, participant 문서에 `ownerUid`를 추가한 뒤 학생의 점수 업데이트 범위를 제한해야 합니다.

교사 방 만들기와 방 종료 기능은 교사용 인증이 들어간 뒤에 Firestore rules로 보호하는 것이 안전합니다.
