import React, { useState } from 'react';
import { Plus, Edit3 } from 'lucide-react';
import Avatar from '../components/Avatar';
import CharacterForm from '../components/CharacterForm';

export default function Characters({ characters, userId, onReload, onError }) {
    const [editingCharacter, setEditingCharacter] = useState(null);
    const [formOpen, setFormOpen] = useState(false);

    function openCreate() {
        setEditingCharacter(null);
        setFormOpen(true);
    }

    function openEdit(character) {
        setEditingCharacter(character);
        setFormOpen(true);
    }

    function closeForm() {
        setFormOpen(false);
        setEditingCharacter(null);
    }

    async function handleSaved() {
        closeForm();
        await onReload();
    }

    return (
        <>
            <div className="section-heading">
                <div>
                    <h1>캐릭터</h1>
                    <p>내 계정에 등록된 캐릭터</p>
                </div>
                <button className="primary" onClick={openCreate}>
                    <Plus size={18} /> 캐릭터 추가
                </button>
            </div>

            <div className="character-grid">
                {characters.map(character => (
                    <button className="character-card" key={character.character_id} onClick={() => openEdit(character)}>
                        <Avatar src={character.character_portrait} name={character.character_name} size={68} />
                        <strong>{character.character_name}</strong>
                        <Edit3 size={16} />
                    </button>
                ))}
            </div>

            {!characters.length && <div className="empty">캐릭터를 추가해 주세요.</div>}

            {formOpen && (
                <CharacterForm
                    character={editingCharacter}
                    userId={userId}
                    onClose={closeForm}
                    onSaved={handleSaved}
                    onError={onError}
                />
            )}
        </>
    );
}