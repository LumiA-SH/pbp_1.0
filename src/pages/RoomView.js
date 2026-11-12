import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, Image, PenLine, Trash2, Users, Download, Settings } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { supabase } from '../lib/supabase';
import { getRows, saveRow, deleteRow } from '../lib/api';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';
import formatDate from '../utils/formatDate';
import escapeHtml from '../utils/escapeHtml';

const IMAGE_BUCKET = 'pbp-message-images';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function RoomView({ room, userId, characters, preferences, onBack, onEdit, onError }) {
    const [messages, setMessages] = useState([]);
    const [roomCharacters, setRoomCharacters] = useState([]);
    const [membership, setMembership] = useState(null);
    const [selected, setSelected] = useState('');
    const [narration, setNarration] = useState(false);
    const [text, setText] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [editing, setEditing] = useState(null);
    const [showCharacters, setShowCharacters] = useState(false);
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const [messageRows, roomCharacterRows, members] = await Promise.all([
                getRows('messages', query => query.eq('room_id', room.room_id).order('created_at', { ascending: true }).limit(500)),
                getRows('room_character', query => query.eq('room_id', room.room_id)),
                getRows('room_user', query => query.eq('room_id', room.room_id).eq('user_id', userId))
            ]);

            setMessages(messageRows);
            setRoomCharacters(roomCharacterRows);
            setMembership(members[0] || null);

            if (members[0]?.selected_character_id) {
                setSelected(value => value || members[0].selected_character_id);
            }
        } catch (err) {
            onError(err.message);
        }
    }, [room.room_id, userId, onError]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const channel = supabase.channel(`pbp-room-${room.room_id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `room_id=eq.${room.room_id}`
            }, () => load())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [room.room_id, load]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    useEffect(() => {
        if (!imageFile) {
            setImagePreview('');
            return;
        }

        const objectUrl = URL.createObjectURL(imageFile);
        setImagePreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [imageFile]);

    const availableCharacters = characters.filter(character =>
        roomCharacters.some(link => link.character_id === character.character_id)
    );

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

    async function uploadImage(file) {
        const extension = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif'
        }[file.type];

        const path = `${room.room_id}/${crypto.randomUUID()}.${extension}`;

        const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
            contentType: file.type,
            upsert: false
        });

        if (error) throw error;

        const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
        return data.publicUrl;
    }

    async function send() {
        if (sending) return;

        if (!membership) {
            onError('방 참여자로 등록되어 있지 않습니다.');
            return;
        }

        if (!text.trim() && !imageFile) return;

        if (!narration && !selected) {
            onError('캐릭터를 먼저 선택하세요.');
            return;
        }

        const character = availableCharacters.find(item => item.character_id === selected);

        if (!narration && !character) {
            onError('현재 방에 등록된 본인 캐릭터만 사용할 수 있습니다.');
            return;
        }

        setSending(true);

        try {
            const imageUrl = imageFile ? await uploadImage(imageFile) : null;

            await saveRow('messages', {
                room_id: room.room_id,
                user_id: userId,
                character_id: narration ? null : selected,
                message_type: narration ? 'narration' : 'character',
                text: text.trim() || null,
                img: imageUrl,
                character_name_snapshot: narration ? null : character.character_name,
                character_portrait_snapshot: narration ? null : character.character_portrait
            });

            setText('');
            setImageFile(null);
            await load();
        } catch (err) {
            onError(err.message);
        } finally {
            setSending(false);
        }
    }

    async function removeMessage(message) {
        if (!window.confirm('이 메시지를 삭제할까요?')) return;

        try {
            await deleteRow('messages', 'message_id', message.message_id);
            await load();
        } catch (err) {
            onError(err.message);
        }
    }

    async function saveEdit() {
        if (!editing) return;

        try {
            await saveRow('messages', {
                text: editing.text.trim() || null,
                img: editing.img || null
            }, 'message_id', editing.message_id);

            setEditing(null);
            await load();
        } catch (err) {
            onError(err.message);
        }
    }

    function exportHtml() {
        const lines = messages.map(message => {
            const name = message.character_name_snapshot || (message.message_type === 'narration' ? '나레이션' : '캐릭터');
            const content = DOMPurify.sanitize(marked.parse(message.text || ''));
            const image = message.img
                ? `<p><a href="${escapeHtml(message.img)}">첨부 이미지</a></p>`
                : '';

            return `<article><h3>${escapeHtml(name)} · ${escapeHtml(formatDate(message.created_at))}</h3><div>${content}</div>${image}</article>`;
        }).join('\n');

        const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${escapeHtml(room.room_name)}</title>
<style>
body { max-width: 760px; margin: 40px auto; padding: 20px; font: 16px/1.7 sans-serif; }
article { border-bottom: 1px solid #ddd; padding: 16px 0; }
h3 { font-size: 15px; }
</style>
</head>
<body>
<h1>${escapeHtml(room.room_name)}</h1>
${lines}
</body>
</html>`;

        const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
        const link = document.createElement('a');

        link.href = url;
        link.download = `pbp-room-${room.room_id}.html`;
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function onKeyDown(event) {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;

        const shortcut = preferences?.send_shortcut || 'shift_enter';

        if (shortcut === 'shift_enter' && event.shiftKey) {
            return;
        }

        if (shortcut === 'ctrl_enter' && event.ctrlKey) {
            return;
        }

        event.preventDefault();
        send();
    }

    async function selectCharacter(character) {
        setSelected(character.character_id);
        setShowCharacters(false);

        const { error } = await supabase.from('room_user')
            .update({ selected_character_id: character.character_id })
            .eq('room_id', room.room_id)
            .eq('user_id', userId);

        if (error) onError(error.message);
    }
    async function connectCharacter(character) {
        try {
            const { error } = await supabase.from('room_character').insert({
                room_id: room.room_id,
                character_id: character.character_id
            });

            if (error) throw error;

            setRoomCharacters(previous => [
                ...previous,
                {
                    room_id: room.room_id,
                    character_id: character.character_id
                }
            ]);

            await selectCharacter(character);
        } catch (err) {
            onError(err.message);
        }
    }

    return (
        <div className="room-view">
            <div className="room-header">
                <button className="icon-button" onClick={onBack} title="뒤로">
                    <ArrowLeft size={21} />
                </button>
                <div className="room-title">
                    <h1>{room.room_name}</h1>
                    <small>방 #{room.room_id}</small>
                </div>
                <button className="icon-button" title="로그 백업" onClick={exportHtml}>
                    <Download size={19} />
                </button>
                <button className="icon-button" title="방 설정" onClick={onEdit}>
                    <Settings size={19} />
                </button>
            </div>

            <div className="message-list">
                {messages.map((message, index) => {
                    const date = new Date(message.created_at).toDateString();
                    const previous = index ? new Date(messages[index - 1].created_at).toDateString() : null;

                    return (
                        <React.Fragment key={message.message_id}>
                            {date !== previous && (
                                <div className="date-divider">
                                    {new Date(message.created_at).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                            )}

                            <article className={message.message_type === 'narration' ? 'message narration' : 'message'}>
                                {message.message_type === 'character' && (
                                    <Avatar src={message.character_portrait_snapshot} name={message.character_name_snapshot} size={46} />
                                )}

                                <div className="message-content">
                                    <div className="message-meta">
                                        <strong>
                                            {message.message_type === 'narration' ? '나레이션' : message.character_name_snapshot || '캐릭터'}
                                        </strong>
                                        <span>{formatDate(message.created_at)}</span>
                                        {message.updated_at && new Date(message.updated_at).getTime() > new Date(message.created_at).getTime() + 1000 && (
                                            <small>수정됨</small>
                                        )}
                                    </div>

                                    {message.text && (
                                        <div className="message-body" dangerouslySetInnerHTML={{
                                            __html: DOMPurify.sanitize(marked.parse(message.text))
                                        }} />
                                    )}

                                    {message.img && (
                                        <a href={message.img} target="_blank" rel="noopener noreferrer">
                                            <img className="message-image" src={message.img} alt="첨부 이미지" />
                                        </a>
                                    )}

                                    {message.user_id === userId && (
                                        <div className="message-actions">
                                            <button onClick={() => setEditing({ ...message, text: message.text || '', img: message.img || '' })}>
                                                <PenLine size={14} /> 수정
                                            </button>
                                            <button onClick={() => removeMessage(message)}>
                                                <Trash2 size={14} /> 삭제
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </article>
                        </React.Fragment>
                    );
                })}

                {!messages.length && <div className="empty">아직 기록된 이야기가 없어요.</div>}
                <div ref={bottomRef} />
            </div>

            <div className="composer">
                <div className="composer-tools">
                    <button className={narration ? 'pill selected' : 'pill'} onClick={() => setNarration(value => !value)}>
                        나레이션 {narration ? 'ON' : 'OFF'}
                    </button>
                    <button className="pill" onClick={() => setShowCharacters(true)}>
                        <Users size={15} />
                        {availableCharacters.find(item => item.character_id === selected)?.character_name || '캐릭터 선택'}
                    </button>
                </div>

                <textarea value={text} onChange={event => setText(event.target.value)} onKeyDown={onKeyDown} placeholder={narration ? '나레이션을 입력하세요...' : '이야기를 이어가세요...'} rows={3} />

                {imagePreview && (
                    <div className="preview">
                        <img className="message-image" src={imagePreview} alt="첨부 이미지 미리보기" />
                        <button type="button" onClick={() => setImageFile(null)}>이미지 제거</button>
                    </div>
                )}

                <div className="composer-footer">
                    <label className="image-field">
                        <Image size={17} />
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} />
                    </label>
                    <small>{preferences?.send_shortcut === 'ctrl_enter' ? 'Ctrl' : 'Shift'} + Enter 줄바꿈</small>
                    <button className="primary" disabled={sending || (!text.trim() && !imageFile)} onClick={send}>
                        <Send size={17} /> 전송
                    </button>
                </div>
            </div>

            {showCharacters && (
                <Modal title="이 방에서 사용할 캐릭터" onClose={() => setShowCharacters(false)}>
                    <div className="form-body">
                        <div className="character-picker">
                            {characters.map(character => {
                                const connected = roomCharacters.some(
                                    link => link.character_id === character.character_id
                                );

                                return (
                                    <button
                                        key={character.character_id}
                                        className={selected === character.character_id ? 'picker-item active' : 'picker-item'}
                                        onClick={() => connected ? selectCharacter(character) : connectCharacter(character)}
                                    >
                                        <Avatar src={character.character_portrait} name={character.character_name} size={40} />
                                        <span>{character.character_name}</span>
                                        <small>{connected ? '선택' : '방에 연결'}</small>
                                    </button>
                                );
                            })}
                        </div>

                        {!characters.length && (
                            <p className="notice">등록된 캐릭터가 없습니다. 캐릭터 메뉴에서 먼저 추가해 주세요.</p>
                        )}
                    </div>
                </Modal>
            )}

            {editing && (
                <Modal title="메시지 수정" onClose={() => setEditing(null)}>
                    <div className="form-body">
                        <label>본문</label>
                        <textarea rows={6} value={editing.text} onChange={event => setEditing({ ...editing, text: event.target.value })} />
                        <label>이미지 URL</label>
                        <input value={editing.img} onChange={event => setEditing({ ...editing, img: event.target.value })} />
                        <button className="primary full" disabled={!editing.text.trim() && !editing.img.trim()} onClick={saveEdit}>
                            수정 저장
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}