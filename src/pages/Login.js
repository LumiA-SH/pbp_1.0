import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

export default function Login({ onLogin, error, busy }) {
    const [code, setCode] = useState('');

    function handleSubmit(event) {
        event.preventDefault();
        onLogin(code.trim());
    }

    return (
        <div className="login-screen">
            <form className="login-card" onSubmit={handleSubmit}>
                <div className="login-mark">
                    <BookOpen size={32} />
                </div>

                <h1>기록의 방</h1>
                <p>두 사람의 이야기가 머무는 곳</p>

                <label htmlFor="code">관리자가 발급한 접속 코드</label>
                <input id="code" type="password" autoComplete="off" value={code} onChange={event => setCode(event.target.value)} placeholder="접속 코드를 입력하세요" required />

                <button className="primary full" disabled={busy || !code.trim()}>
                    {busy ? '확인 중...' : '입장하기'}
                </button>

                {error && <p className="error">{error}</p>}
                <small>접속 코드는 인증 서버에서 검증하며 브라우저에 저장하지 않습니다.</small>
            </form>
        </div>
    );
}