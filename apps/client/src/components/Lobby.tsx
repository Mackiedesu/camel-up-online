import { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '@camelup/shared';
import { discord, leaveRoom, pushToast, startGame, useStore } from '../store';
import { copyToClipboard } from '../discord';
import { SettingsButton } from './SettingsMenu';

export function Lobby() {
  const room = useStore((s) => s.room)!;
  const me = useStore((s) => s.playerId);
  const isHost = room.hostId === me;
  const online = room.players.filter((p) => p.connected);
  const [busy, setBusy] = useState(false);

  const baseUrl = discord.isEmbedded
    ? 'https://camel-up-online.onrender.com/'
    : `${location.origin}${location.pathname}`;
  const link = `${baseUrl}?room=${room.code}`;

  const copyLink = async () => {
    const ok = await copyToClipboard(link);
    if (ok) {
      pushToast({ kind: 'info', text: '✅ Đã copy link mời vào clipboard!' }, 2500);
    } else {
      pushToast({ kind: 'info', text: `Link mời: ${link}` }, 6000);
    }
  };

  const copyCode = async () => {
    const ok = await copyToClipboard(room.code);
    if (ok) {
      pushToast({ kind: 'info', text: `✅ Đã copy mã phòng: ${room.code}` }, 2500);
    }
  };

  return (
    <div className="home">
      <div className="home-card lobby">
        <p className="subtitle">Mã phòng (bấm để copy mã)</p>
        <div
          className="room-code"
          style={{ cursor: 'pointer' }}
          title="Bấm để copy mã phòng"
          onClick={copyCode}
        >
          {room.code}
        </div>
        <div className="row center">
          <button className="btn small" onClick={copyLink}>
            📋 Copy link mời
          </button>
          <button className="btn small" onClick={copyCode}>
            🔑 Copy mã phòng
          </button>
          <SettingsButton />
        </div>

        <h3>
          Người chơi ({room.players.length}/{MAX_PLAYERS})
        </h3>
        <ul className="lobby-players">
          {Array.from({ length: MAX_PLAYERS }, (_, i) => {
            const p = room.players[i];
            return (
              <li key={i} className={p ? (p.connected ? '' : 'offline') : 'empty'}>
                {p ? (
                  <>
                    <span className="avatar">{p.name.slice(0, 1).toUpperCase()}</span>
                    <span className="pname">
                      {p.name}
                      {p.id === me && ' (bạn)'}
                    </span>
                    {p.id === room.hostId && <span className="badge">Chủ phòng</span>}
                    {!p.connected && <span className="badge muted">offline</span>}
                  </>
                ) : (
                  <span className="muted">Đang chờ…</span>
                )}
              </li>
            );
          })}
        </ul>

        {isHost ? (
          <button
            className="btn primary big"
            disabled={online.length < MIN_PLAYERS || busy}
            onClick={async () => {
              setBusy(true);
              await startGame();
              setBusy(false);
            }}
          >
            {online.length < MIN_PLAYERS ? `Cần ít nhất ${MIN_PLAYERS} người` : 'Bắt đầu ván!'}
          </button>
        ) : (
          <p className="muted">Đang chờ chủ phòng bắt đầu…</p>
        )}
        <button className="btn ghost" onClick={leaveRoom}>
          Rời phòng
        </button>
      </div>
    </div>
  );
}
