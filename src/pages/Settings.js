import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { saveRow } from '../lib/api';
import Avatar from '../components/Avatar';

const PROFILE_BUCKET = 'pbp-profile-images';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const defaultColors = {
    ui_main_color: '#EAF2FF',
    ui_sub_color: '#FFFFFF',
    ui_border_color: '#B9CBE5',
    ui_system_text_color: '#243B53',
    ui_body_text_color: '#243B53'
};

const colorLabels = {
    ui_main_color: '메인',
    ui_sub_color: '서브',
    ui_border_color: '외곽선',
    ui_system_text_color: '시스템 텍스트',
    ui_body_text_color: '본문 텍스트'
};

export default function Settings({ profile, preferences, userId, onSaved, onError }) {
    const [name, setName] = useState(profile?.user_name || 'User');
    const [portrait, setPortrait] = useState(profile?.user_portrait || '');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        input_style: 'messenger',
        send_shortcut: 'shift_enter',
        notification_enabled: false,
        ...defaultColors,
        ...preferences
    });

    useEffect(() => {
        setName(profile?.user_name || 'User');
        setPortrait(profile?.user_portrait || '');
    }, [profile]);

    useEffect(() => {
        setForm({
            input_style: 'messenger',
            send_shortcut: 'shift_enter',
            notification_enabled: false,
            ...defaultColors,
            ...preferences
        });
    }, [preferences]);

    useEffect(() => {
        if (!imageFile) {
            setImagePreview('');
            return;
        }

        const objectUrl = URL.createObjectURL(imageFile);
        setImagePreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [imageFile]);

    function handleImageChange(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            onError('JPG, PNG, WebP, GIF 이미지만 등록할 수 있습니다.');
            event.target.value = '';
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            onError('이미지는 최대 5MB까지 등록할 수 있습니다.');
            event.target.value = '';
            return;
        }

        setImageFile(file);
    }

    async function uploadPortrait(file) {
        const extension = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif'
        }[file.type];

        const path = `${userId}/${crypto.randomUUID()}.${extension}`;

        const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, file, {
            contentType: file.type,
            upsert: false
        });

        if (error) throw error;

        const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path);
        return data.publicUrl;
    }

    async function save(event) {
        event.preventDefault();
        if (saving) return;

        const trimmedName = name.trim();

        if (!trimmedName) {
            onError('닉네임을 입력해 주세요.');
            return;
        }

        setSaving(true);

        try {
            const portraitUrl = imageFile ? await uploadPortrait(imageFile) : portrait;

            const { error } = await supabase.from('user')
                .update({
                    user_name: trimmedName,
                    user_portrait: portraitUrl || null
                })
                .eq('user_id', userId);

            if (error) throw error;

            await saveRow('settings', {
                ...form,
                user_id: userId
            }, 'user_id', preferences?.user_id);

            setPortrait(portraitUrl);
            setImageFile(null);

            if (onSaved) await onSaved();
            window.alert('설정을 저장했습니다.');
        } catch (err) {
            onError(err.message || '설정 저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className="section-heading">
                <div>
                    <h1>설정</h1>
                    <p>프로필과 글쓰기 환경을 설정하세요</p>
                </div>
            </div>

            <form className="settings-form" onSubmit={save}>
                <section className="panel">
                    <h2>오너 프로필</h2>

                    <div className="profile-row">
                        <Avatar src={imagePreview || portrait} name={name} size={64} />

                        <div className="field-stack">
                            <label htmlFor="profile-name">닉네임</label>
                            <input id="profile-name" maxLength={24} required value={name} onChange={event => setName(event.target.value)} />

                            <label htmlFor="profile-image">인장 이미지</label>
                            <input id="profile-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} disabled={saving} />

                            {(imagePreview || portrait) && (
                                <button className="secondary" type="button" onClick={() => { setImageFile(null); setPortrait(''); }} disabled={saving}>
                                    이미지 제거
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="panel">
                    <h2>글쓰기 설정</h2>

                    <label htmlFor="input-style">입력 방식</label>
                    <select id="input-style" value={form.input_style} onChange={event => setForm({ ...form, input_style: event.target.value })}>
                        <option value="messenger">메신저 방식</option>
                        <option value="twitter">트위터 방식</option>
                    </select>

                    <label htmlFor="send-shortcut">전송 단축키</label>
                    <select id="send-shortcut" value={form.send_shortcut} onChange={event => setForm({ ...form, send_shortcut: event.target.value })}>
                        <option value="shift_enter">Shift + Enter 줄바꿈</option>
                        <option value="ctrl_enter">Ctrl + Enter 줄바꿈</option>
                    </select>

                    <label className="checkbox-label">
                        <input type="checkbox" checked={form.notification_enabled} onChange={event => setForm({ ...form, notification_enabled: event.target.checked })} />
                        신규 RP 알림 사용 (푸시 서버 연동 전에는 설정만 저장)
                    </label>
                </section>

                <section className="panel">
                    <h2>UI 색상</h2>
                    <p className="muted">변경 내용은 저장 후 화면 전체에 적용됩니다.</p>

                    <div className="color-grid">
                        {Object.entries(colorLabels).map(([key, label]) => (
                            <label className="color-field" key={key}>
                                {label}
                                <input type="color" value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} />
                                <span>{form[key]}</span>
                            </label>
                        ))}
                    </div>

                    <button className="secondary" type="button" onClick={() => setForm({ ...form, ...defaultColors })}>
                        기본 색상으로 초기화
                    </button>
                </section>

                <button className="primary save-button" disabled={saving || !name.trim()}>
                    {saving ? '저장 중...' : '변경 사항 저장'}
                </button>
            </form>
        </>
    );
}