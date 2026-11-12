import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Settings, LogOut, Users, MessageSquare, Shield } from 'lucide-react';
import { supabase, isConfigured } from '../lib/supabase';
import { getRows, loginWithCode } from '../lib/api';

import Avatar from '../components/Avatar';
import RoomForm from '../components/RoomForm';

import Login from '../pages/Login';
import Rooms from '../pages/Rooms';
import RoomView from '../pages/RoomView';
import Characters from '../pages/Characters';
import SettingsPage from '../pages/Settings';
import Admin from '../pages/Admin';

const defaultColors = {
    ui_main_color: '#EAF2FF',
    ui_sub_color: '#FFFFFF',
    ui_border_color: '#B9CBE5',
    ui_system_text_color: '#243B53',
    ui_body_text_color: '#243B53'
};

export default function AppRouter() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [characters, setCharacters] = useState([]);
    const [preferences, setPreferences] = useState(null);

    const [view, setView] = useState('rooms');
    const [room, setRoom] = useState(null);
    const [roomFormOpen, setRoomFormOpen] = useState(false);

    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);

    const reload = useCallback(() => {
        setRefresh(value => value + 1);
    }, []);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        let active = true;

        supabase.auth.getSession().then(({ data, error: sessionError }) => {
            if (!active) return;

            if (sessionError) setError(sessionError.message);
            setSession(data.session);
            setLoading(false);
        }).catch(err => {
            if (!active) return;

            setError(err.message);
            setLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
        });

        return () => {
            active = false;
            listener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!session) {
            setProfile(null);
            setRooms([]);
            setCharacters([]);
            setPreferences(null);
            return;
        }

        let active = true;

        async function loadData() {
            try {
                const [users, roomRows, characterRows, settingsRows] = await Promise.all([
                    getRows('user', query => query.eq('user_id', session.user.id)),
                    getRows('rooms', query => query.order('created_at', { ascending: false })),
                    getRows('characters', query => query.eq('user_id', session.user.id).order('created_at', { ascending: false })),
                    getRows('settings', query => query.eq('user_id', session.user.id))
                ]);

                if (!active) return;

                setProfile(users[0] || null);
                setRooms(roomRows);
                setCharacters(characterRows);
                setPreferences(settingsRows[0] || null);
                setError('');
            } catch (err) {
                if (active) setError(err.message);
            }
        }

        loadData();

        return () => {
            active = false;
        };
    }, [session, refresh]);

    async function login(code) {
        setBusy(true);
        setError('');

        try {
            await loginWithCode(code);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function logout() {
        try {
            const { error: logoutError } = await supabase.auth.signOut();
            if (logoutError) throw logoutError;

            setSession(null);
            setRoom(null);
            setView('rooms');
            setRoomFormOpen(false);
        } catch (err) {
            setError(err.message);
        }
    }

    function navigate(nextView) {
        setView(nextView);
        setRoom(null);
        setError('');
    }

    function selectRoom(selectedRoom) {
        setRoom(selectedRoom);
        setView('rooms');
    }

    function closeRoom() {
        setRoom(null);
        reload();
    }

    async function handleRoomSaved(savedRoom) {
        if (savedRoom && room?.room_id === savedRoom.room_id) {
            setRoom(savedRoom);
        }

        reload();
        setRoomFormOpen(false);
    }

    const colors = {
        ...defaultColors,
        ...Object.fromEntries(
            Object.keys(defaultColors).map(key => [
                key,
                preferences?.[key] || defaultColors[key]
            ])
        )
    };

    const theme = {
        '--main': colors.ui_main_color,
        '--sub': colors.ui_sub_color,
        '--border': colors.ui_border_color,
        '--system-text': colors.ui_system_text_color,
        '--body-text': colors.ui_body_text_color
    };

    const isAdmin = profile?.role === 1;

    if (loading) {
        return <div className="center-screen">연결 확인 중...</div>;
    }

    if (!isConfigured) {
        return (
            <div className="center-screen setup">
                <h1>Supabase 설정 필요</h1>
                <p><code>.env</code> 파일에 공개용 Supabase 키를 입력하세요.</p>
                <p>설정 방법은 README.md를 확인하세요.</p>
            </div>
        );
    }

    if (!session) {
        return <Login onLogin={login} error={error} busy={busy} />;
    }

    return (
        <div className="app" style={theme}>
            <header className="topbar">
                <button className="brand" onClick={() => navigate('rooms')}>
                    <BookOpen size={23} />
                    기록의 방
                </button>

                <div className="top-actions">
                    <span className="user-label">{profile?.user_name || 'User'}</span>
                    <Avatar src={profile?.user_portrait} name={profile?.user_name} size={34} />
                    <button className="icon-button" title="로그아웃" onClick={logout}>
                        <LogOut size={19} />
                    </button>
                </div>
            </header>

            <div className="layout">
                <aside className="sidebar">
                    <button className={view === 'rooms' ? 'nav active' : 'nav'} onClick={() => navigate('rooms')}>
                        <MessageSquare size={19} /> RP방
                    </button>

                    <button className={view === 'characters' ? 'nav active' : 'nav'} onClick={() => navigate('characters')}>
                        <Users size={19} /> 캐릭터
                    </button>

                    <button className={view === 'settings' ? 'nav active' : 'nav'} onClick={() => navigate('settings')}>
                        <Settings size={19} /> 설정
                    </button>

                    {isAdmin && (
                        <button className={view === 'admin' ? 'nav active' : 'nav'} onClick={() => navigate('admin')}>
                            <Shield size={19} /> 관리자
                        </button>
                    )}
                </aside>

                <main className="content">
                    {error && (
                        <div className="alert">
                            {error}
                            <button onClick={() => setError('')}>닫기</button>
                        </div>
                    )}

                    {view === 'rooms' && !room && (
                        <Rooms rooms={rooms} isAdmin={isAdmin} onSelect={selectRoom} onReload={reload} />
                    )}

                    {view === 'rooms' && room && (
                        <RoomView
                            room={room}
                            userId={session.user.id}
                            characters={characters}
                            preferences={preferences}
                            onBack={closeRoom}
                            onEdit={() => setRoomFormOpen(true)}
                            onError={setError}
                        />
                    )}

                    {view === 'characters' && (
                        <Characters characters={characters} userId={session.user.id} onReload={reload} onError={setError} />
                    )}

                    {view === 'settings' && (
                        <SettingsPage
                            profile={profile}
                            preferences={preferences}
                            userId={session.user.id}
                            onSaved={reload}
                            onError={setError}
                        />
                    )}

                    {view === 'admin' && isAdmin && (
                        <Admin onError={setError} />
                    )}
                </main>
            </div>

            {roomFormOpen && room && (
                <RoomForm room={room} onClose={() => setRoomFormOpen(false)} onSaved={handleRoomSaved} />
            )}
        </div>
    );
}