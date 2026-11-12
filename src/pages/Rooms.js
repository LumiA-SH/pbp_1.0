import React, { useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import RoomForm from '../components/RoomForm';

function formatDate(value) {
    return value
        ? new Date(value).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
        : '';
}

export default function Rooms({ rooms, isAdmin, onSelect, onReload }) {
    const [editingRoom, setEditingRoom] = useState(null);
    const [formOpen, setFormOpen] = useState(false);

    function openCreate() {
        setEditingRoom(null);
        setFormOpen(true);
    }

    function closeForm() {
        setFormOpen(false);
        setEditingRoom(null);
    }

    async function handleSaved() {
        await onReload();
        closeForm();
    }

    return (
        <>
            <div className="section-heading">
                <div>
                    <h1>RP방</h1>
                    <p>함께 만들어가는 이야기의 목록</p>
                </div>

                {isAdmin && (
                    <button className="primary" onClick={openCreate}>
                        <Plus size={18} /> 새 방
                    </button>
                )}
            </div>

            <div className="room-grid">
                {rooms.map(room => (
                    <button className="room-card" key={room.room_id} onClick={() => onSelect(room)}>
                        <div className="room-cover">
                            {room.room_img
                                ? <img src={room.room_img} alt="" />
                                : <BookOpen size={30} />}
                        </div>

                        <div className="room-card-text">
                            <strong>{room.room_name}</strong>
                            <span>#{room.room_id} · {formatDate(room.created_at)}</span>
                        </div>
                    </button>
                ))}
            </div>

            {!rooms.length && (
                <div className="empty">아직 참여 중인 RP방이 없어요.</div>
            )}

            {formOpen && (
                <RoomForm room={editingRoom} onClose={closeForm} onSaved={handleSaved} />
            )}
        </>
    );
}