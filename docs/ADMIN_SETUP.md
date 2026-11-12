# 최초 관리자 등록

PBP 프로젝트 `yftkqcqewashjqynltig`에서만 작업하세요.

1. Supabase Dashboard → Authentication → Users → Add user에서 관리자 계정을 하나 생성합니다. 실제 접근 가능한 이메일로 생성해도 되지만, 접속 코드 로그인은 해당 이메일을 사용하지 않습니다.
2. 생성된 사용자의 UUID를 복사합니다.
3. 다음 SQL에서 `관리자_UUID`를 복사한 UUID로 바꾸고 SQL Editor에서 실행합니다.

```sql
insert into public."user" (user_id, user_name, role)
values ('관리자_UUID'::uuid, '관리자', 1);
```

4. **중요:** `pbp-auth`는 내부적으로 `pbp-<UUID>@auth.invalid` 형식의 이메일을 사용합니다. 따라서 최초 관리자 Auth 계정의 이메일도 이 형식이어야 합니다. Supabase Dashboard에서 사용자의 이메일을 `pbp-<관리자_UUID>@auth.invalid`로 수정하세요. 실제 이메일 인증 메일은 필요하지 않습니다.
5. 64자리 임의 16진수 접속 코드를 안전한 로컬 암호 생성기로 생성합니다. SQL Editor에서 `CODE`를 실제 코드로, `관리자_UUID`를 사용자 UUID로 교체해 실행합니다.

```sql
insert into public.user_tokens (user_id, token_hash)
values ('관리자_UUID'::uuid, encode(extensions.digest(lower('CODE'), 'sha256'), 'hex'));
```

6. `.env` 설정 후 `npm start`를 다시 실행하고, 생성한 접속 코드로 로그인합니다.

주의: Supabase 환경에 따라 `extensions.digest` 함수가 없을 수 있습니다. 그 경우 `pgcrypto` 확장을 먼저 활성화해야 합니다. SQL Editor 쿼리 기록에 접속 코드 원문이 남으므로 최초 발급 후 기록 관리에 주의하세요.

최초 관리자 외 사용자 계정은 서버의 `create-user` 동작을 이용하세요. 관리자용 비밀키를 브라우저에 입력하지 마세요.
