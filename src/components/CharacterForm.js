import React, { useEffect, useState } from 'react';
import { ImagePlus, Trash2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { saveRow, deleteRow } from '../lib/api';
import Modal from './Modal';
import Avatar from './Avatar';

const IMAGE_BUCKET = 'pbp-character-images';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function CharacterForm({ character, userId, onClose, onSaved, onError }) {
    const [name, setName] = useState(character?.character_name || '');
    const [portrait, setPortrait] = useState(character?.character_portrait || '');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [saving, setSaving] = useState(false);

    const isEdit = Boolean(character?.character_id);

    useEffect(() => {
        setName(character?.character_name || '');
        setPortrait(character?.character_portrait || '');
        setImageFile(null);
    }, [character]);

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
        event.target.value = '';
    }

    function removePortrait() {
        setImageFile(null);
        setPortrait('');
    }

    async function uploadPortrait(file) {
        const extension = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif'
        }[file.type];

        const path = `${userId}/${crypto.randomUUID()}.${extension}`;

        const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
            contentType: file.type,
            upsert: false
        });

        if (error) throw error;

        const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
        return { path, url: data.publicUrl };
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (saving) return;

        const characterName = name.trim();

        if (!characterName) {
            onError('캐릭터 이름을 입력해 주세요.');
            return;
        }

        setSaving(true);

        let uploadedPath = null;
        let saved = false;

        try {
            let portraitUrl = portrait;

            if (imageFile) {
                const uploaded = await uploadPortrait(imageFile);
                uploadedPath = uploaded.path;
                portraitUrl = uploaded.url;
            }

            const values = {
                character_name: characterName,
                character_portrait: portraitUrl || null
            };

            if (!isEdit) {
                values.user_id = userId;
            }

            await saveRow(
                'characters',
                values,
                'character_id',
                isEdit ? character.character_id : null
            );

            saved = true;
            await onSaved?.();
        } catch (err) {
            if (!saved && uploadedPath) {
                await supabase.storage.from(IMAGE_BUCKET).remove([uploadedPath]);
            }

            onError(err.message || '캐릭터 저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!isEdit || saving) return;
        if (!window.confirm(`'${character.character_name}' 캐릭터를 삭제할까요?`)) return;

        setSaving(true);

        try {
            await deleteRow('characters', 'character_id', character.character_id);
            await onSaved?.();
        } catch (err) {
            onError(err.message || '캐릭터 삭제에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal title={isEdit ? '캐릭터 수정' : '캐릭터 추가'} onClose={onClose}>
            <form className="form-body" onSubmit={handleSubmit}>
                <label htmlFor="character-name">캐릭터 이름</label>
                <input
                    id="character-name"
                    type="text"
                    maxLength={100}
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="캐릭터 이름을 입력하세요"
                    disabled={saving}
                    required
                />

                <label htmlFor="character-image">캐릭터 인장</label>

                <div className="profile-row">
                    <Avatar src={imagePreview || portrait} name={name} size={80} />

                    <div className="field-stack">
                        <label className="secondary" htmlFor="character-image">
                            <ImagePlus size={17} /> 이미지 선택
                        </label>
                        <input
                            id="character-image"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleImageChange}
                            disabled={saving}
                        />

                        {(imagePreview || portrait) && (
                            <button className="secondary" type="button" onClick={removePortrait} disabled={saving}>
                                <Trash2 size={16} /> 인장 제거
                            </button>
                        )}
                    </div>
                </div>

                <p className="notice">인장은 선택 사항이며, JPG·PNG·WebP·GIF 파일을 최대 5MB까지 등록할 수 있습니다.</p>

                <div className="form-actions">
                    {isEdit && (
                        <button className="danger" type="button" onClick={handleDelete} disabled={saving}>
                            <Trash2 size={17} /> 삭제
                        </button>
                    )}

                    <button className="secondary" type="button" onClick={onClose} disabled={saving}>
                        취소
                    </button>

                    <button className="primary" type="submit" disabled={saving || !name.trim()}>
                        <Save size={17} /> {saving ? '저장 중...' : isEdit ? '수정 저장' : '캐릭터 등록'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}