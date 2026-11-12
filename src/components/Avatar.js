import React from 'react';

export default function Avatar({ src, name, size = 42 }) {
    if (src) {
        return <img className="avatar" src={src} alt={name || '인장'} style={{ width: size, height: size }} />;
    }

    return (
        <div className="avatar avatar-fallback" style={{ width: size, height: size }}>
            {(name || '?').slice(0, 1)}
        </div>
    );
}
