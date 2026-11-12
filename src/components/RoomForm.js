import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { adminRoomAction } from '../lib/api';
import Modal from './Modal';

const BUCKET = 'pbp-room-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function RoomForm({ room = null, onClose, onSaved }) {
    const [roomName, setRoomName] = useState(room?.room_name || '');
    const [roomImg, setRoomImg] = useState(room?.room_img || '');
    const [imageFile, setImageFile] = useState(null);
    const [preview, setPreview] = useState(room?.room_img || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isEdit = Boolean(room?.room_id);

    useEffect(() => {
        if (!imageFile) {
            setPreview(roomImg);
            return;
        }

        const objectUrl = URL.createObjectURL(imageFile);
        setPreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [imageFile, roomImg]);

    function handleImageChange(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('JPG, PNG, WebP, GIF 이미지만 등록할 수 있습니다.');
            event.target.value = '';
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError('이미지는 최대 5MB까지 등록할 수 있습니다.');
            event.target.value = '';
            return;
        }

        setImageFile(file);
        setError('');
    }

    function handleImageRemove() {
        setImageFile(null);
        setRoomImg('');
        setPreview('');
    }

    async function uploadImage(file) {
        const extension = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif'
        }[file.type];

        const filePath = `rooms/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, file, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
        return { url: data.publicUrl, path: filePath };
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const name = roomName.trim();

        if (!name) {
            setError('방 이름을 입력해 주세요.');
            return;
        }

        setSaving(true);
        setError('');

        let uploadedPath = null;

        try {
            let imageUrl = roomImg;

            if (imageFile) {
                const uploaded = await uploadImage(imageFile);
                imageUrl = uploaded.url;
                uploadedPath = uploaded.path;
            }

            const result = await adminRoomAction(isEdit ? 'update' : 'create', {
                ...(isEdit ? { room_id: room.room_id } : {}),
                room_name: name,
                room_img: imageUrl || null
            });

            if (onSaved) await onSaved(result.room);
            onClose();
        } catch (err) {
            if (uploadedPath) {
                await supabase.storage.from(BUCKET).remove([uploadedPath]);
            }

            setError(err.message || '방 저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal title={isEdit ? 'RP방 수정' : '새 RP방 생성'} onClose={onClose}>
            <form className="room-form" onSubmit={handleSubmit}>
                <label htmlFor="room-name">방 이름</label>
                <input id="room-name" type="text" maxLength={60} value={roomName} onChange={event => setRoomName(event.target.value)} placeholder="RP방 이름을 입력해 주세요." required />

                <label htmlFor="room-image">방 이미지</label>
                <input id="room-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} disabled={saving} />

                {preview && (
                    <div className="room-image-preview">
                        <img className="room-form-preview" src={preview} alt="방 이미지 미리보기" />
                        <button type="button" onClick={handleImageRemove} disabled={saving}>이미지 제거</button>
                    </div>
                )}

                {error && <p className="form-error" role="alert">{error}</p>}

                <div className="modal-actions">
                    <button type="button" onClick={onClose} disabled={saving}>취소</button>
                    <button type="submit" disabled={saving}>
                        {saving ? '저장 중...' : isEdit ? '수정 완료' : '방 생성'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}