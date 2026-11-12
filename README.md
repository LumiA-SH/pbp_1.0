# PBP · 2인용 RP 웹앱

React **Create React App (CRA)** 기반. 모든 React 컴포넌트는 `.js` 파일에서 JSX 문법으로 작성합니다.

Supabase 프로젝트: `yftkqcqewashjqynltig` (PBP 전용). `.env`는 Git에 커밋하지 마세요. `service_role`, `sb_secret_` 키를 브라우저에 넣으면 안 됩니다.

## 구현된 화면

- 접속 코드 로그인 UI 및 Auth 세션 저장·유지·로그아웃
- RP방 목록, 방 입장, 메시지 조회, Realtime 변경 구독
- 캐릭터 등록·수정·삭제, 방에서 캐릭터 선택
- 텍스트/나레이션/이미지 URL 메시지 작성·수정·삭제
- 마크다운 렌더링(XSS 필터링), 날짜 구분, HTML 로그 백업
- 오너 프로필, 입력 방식/전송 단축키, UI 색상 설정
- 모바일 레이아웃

## 접속 코드 인증 API (배포 완료)

PBP Supabase 프로젝트에 `pbp-auth` Edge Function이 배포되어 있습니다.

- `login`: 64자리 16진수 접속 코드를 서버에서 SHA-256 해시 검증한 뒤 Supabase Auth 매직링크 검증 토큰을 반환합니다. 클라이언트는 `verifyOtp`로 세션을 만듭니다.
- `create-user`: 관리자 세션에서 Auth 사용자와 프로필을 생성하고 새 접속 코드를 **한 번만** 반환합니다.
- `rotate-code`: 기존 코드를 폐기하고 새 코드를 반환합니다.
- `revoke-code`: 사용자의 활성 접속 코드를 폐기합니다.
- 서버는 접속 시도 제한을 적용하며, 접속 코드 해시와 service role 키를 브라우저에 전달하지 않습니다.

**최초 관리자 등록이 필요합니다.** 아직 Auth 사용자가 0명이므로 최초 1명은 Supabase 대시보드에서 만들어야 합니다. `docs/ADMIN_SETUP.md`의 절차를 따르세요. 이후 사용자 발급은 `adminAuthAction('create-user', { user_name: 'User' })`로 가능합니다. 관리자 화면의 버튼과 연결하는 UI 작업은 별도로 남아 있습니다.

**남은 개발 작업:** 방 생성·수정·삭제, 참여자 등록, 캐릭터 방 연결은 RLS에서 브라우저 직접 쓰기를 차단했습니다. 관리자 검증 API가 필요합니다. 푸시 알림은 구독·발송 서버, VAPID 키, Service Worker 작업이 남아 있습니다. 이미지 업로드는 현재 URL 입력 방식입니다. 새 메시지 읽음 처리 및 미확인 개수는 후속 구현 대상입니다.

## 명세 및 현재 DB 주의사항

- `rooms.room_id`: INTEGER IDENTITY, 나머지 사용자·캐릭터·메시지 ID는 UUID
- `user_tokens`, `push_subscriptions`: 서버 전용 접근. 브라우저 직접 조회 불가
- `messages.message_type`: `character` 또는 `narration`
- `settings.input_style`: `messenger` 또는 `twitter`
- `settings.send_shortcut`: `shift_enter` 또는 `ctrl_enter`
- DB 정책에 따라 메시지 본문·이미지만 수정 가능
- 캐릭터 이름·인장 스냅샷은 작성 당시 값을 저장
- 인증 Edge Function은 배포됐지만 최초 관리자 계정 등록 및 실제 로그인 테스트가 남아 있습니다. 완성된 서비스는 아닙니다.

## 출처

기획서: https://docs.google.com/document/d/1awX6FDK4ba7zryUdIJ7fk9QqtgohPMFcyPYsLI5UJhc/edit

DB 명세: https://docs.google.com/spreadsheets/d/1l7QBxzBXMg9W1gy06F37euGCSFiDDCnp8TXDaI2Yfrc/edit
