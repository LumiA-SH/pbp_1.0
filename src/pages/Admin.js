import React, { useState } from 'react';
import { Shield, Plus, Copy, RefreshCw } from 'lucide-react';
import { adminAuthAction } from '../lib/api';

export default function Admin({ onError }) {
    const [userName, setUserName] = useState('');
    const [targetUserId, setTargetUserId] = useState('');
    const [issued, setIssued] = useState(null);
    const [busy, setBusy] = useState(false);

    async function createUser(event) {
        event.preventDefault();
        if (!userName.trim()) return;

        setBusy(true);
        setIssued(null);

        try {
            const result = await adminAuthAction('create-user', {
                user_name: userName.trim()
            });

            setIssued(result);
            setTargetUserId(result.user_id);
            setUserName('');
        } catch (err) {
            onError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function rotateCode() {
        if (!targetUserId.trim()) return;
        if (!window.confirm('기존 접속 코드를 폐기하고 새 코드를 발급할까요?')) return;

        setBusy(true);
        setIssued(null);

        try {
            const result = await adminAuthAction('rotate-code', {
                user_id: targetUserId.trim()
            });

            setIssued(result);
        } catch (err) {
            onError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function copyCode() {
        if (!issued?.code) return;

        try {
            await navigator.clipboard.writeText(issued.code);
            window.alert('접속 코드를 복사했습니다.');
        } catch (err) {
            onError('접속 코드 복사에 실패했습니다.');
        }
    }

    return (
        <>
            <div className="section-heading">
                <div>
                    <h1><Shield size={24} /> 관리자</h1>
                    <p>사용자 계정 및 접속 코드 관리</p>
                </div>
            </div>

            <section className="panel">
                <h2>사용자 생성</h2>
                <form className="form-body" onSubmit={createUser}>
                    <label htmlFor="admin-user-name">사용자 닉네임</label>
                    <input id="admin-user-name" maxLength={24} value={userName} onChange={event => setUserName(event.target.value)} placeholder="새 사용자 이름" required />
                    <button className="primary" disabled={busy || !userName.trim()}>
                        <Plus size={17} /> 사용자 생성 및 코드 발급
                    </button>
                </form>
            </section>

            <section className="panel">
                <h2>접속 코드 재발급</h2>
                <div className="form-body">
                    <label htmlFor="admin-target-id">사용자 ID</label>
                    <input id="admin-target-id" value={targetUserId} onChange={event => setTargetUserId(event.target.value)} placeholder="사용자 UUID" />
                    <button className="secondary" type="button" onClick={rotateCode} disabled={busy || !targetUserId.trim()}>
                        <RefreshCw size={17} /> 접속 코드 재발급
                    </button>
                </div>
            </section>

            {issued?.code && (
                <section className="panel">
                    <h2>발급된 접속 코드</h2>
                    <p className="notice">접속 코드는 지금만 확인할 수 있습니다. 안전하게 보관해 주세요.</p>
                    <div className="form-body">
                        <label>사용자 ID</label>
                        <input value={issued.user_id} readOnly />
                        <label>접속 코드</label>
                        <input value={issued.code} readOnly />
                        <button className="primary" type="button" onClick={copyCode}>
                            <Copy size={17} /> 코드 복사
                        </button>
                    </div>
                </section>
            )}
        </>
    );
}