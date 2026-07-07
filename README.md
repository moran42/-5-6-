# 제주 여행 코스 (5박 6일)

해쭈 유튜브 · 네이버/카카오맵 저장 장소 기반 제주 일정 플래너입니다.  
**GitHub Pages 링크 하나로 여행 메이트와 실시간 공동 편집**이 가능합니다.

## GitHub Pages 배포

1. 이 repo를 GitHub에 push
2. **Settings → Pages → Source**: `main` 브랜치 / `/ (root)`
3. 몇 분 후 `https://<username>.github.io/<repo>/` 에서 접속

## Firebase 실시간 동기화 (필수 — 1회만 설정)

편집 내용은 **Firebase Firestore**에 저장됩니다. 같은 Pages 링크를 연 사람끼리 자동으로 공유됩니다.

### 1. Firebase 프로젝트 만들기

1. [Firebase Console](https://console.firebase.google.com/) → 프로젝트 추가
2. **Firestore Database** 생성 (테스트 모드로 시작 가능)
3. **프로젝트 설정 → 일반 → 내 앱 → 웹(`</>`)** 추가
4. 표시되는 `firebaseConfig` 값을 복사

### 2. `firebase-config.js` 수정

```js
const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  tripId: "jeju-2026",  // 메이트와 공유할 문서 ID (원하면 바꿔도 됨)
};
```

수정 후 **commit → push** 하면 Pages에 반영됩니다.

### 3. Firestore 보안 규칙

Firebase Console → Firestore → 규칙:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trips/{tripId} {
      allow read, write: if true;
    }
  }
}
```

> 여행 일정용이라 열어두었습니다. `tripId`를 추측하기 어렵게 바꾸면 URL을 모르는 사람은 문서를 찾기 어렵습니다.

## 사용 방법

| 기능 | 설명 |
|------|------|
| **타임라인** | 일정 보기 |
| **코스 편집** | 시간·장소 블록 수정 → 자동 클라우드 저장 |
| **↻ 새로고침** | 카카오/네이버에 새로 저장한 장소 붙여넣기 |
| **지도** | 날짜별 동선 + 카테고리 필터 |

헤더에 **🟢 실시간 동기화 중**이 보이면 메이트와 연결된 상태입니다.

## 주의

- **localStorage는 사용하지 않습니다.** 브라우저마다 따로 저장되지 않고, Firebase에만 저장됩니다.
- `firebase-config.js`를 설정하지 않으면 기본 일정만 보이고, 편집은 메이트와 공유되지 않습니다.
- Firebase 무료 플랜으로 여행 일정 규모는 충분합니다.
