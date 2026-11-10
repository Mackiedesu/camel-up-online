import { useState } from 'react';
import { createRoom, discord, joinDiscordChannelRoom, joinRoom, setName, useStore } from '../store';
import { CamelIcon } from './CamelIcon';
import { SettingsButton } from './SettingsMenu';
import { RACING_CAMELS } from '@camelup/shared';

export function Home() {
  const name = useStore((s) => s.name);
  const connected = useStore((s) => s.connected);
  const [code, setCode] = useState(
    () => new URLSearchParams(location.search).get('room') ?? discord.autoRoomCode ?? '',
  );
  const [busy, setBusy] = useState(false);
  const canGo = connected && name.trim().length > 0 && !busy;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <div className="home">
      <div className="home-card">
        <div className="home-camels">
          {RACING_CAMELS.map((c, i) => (
            <span key={c} style={{ animationDelay: `${i * 0.15}s` }}>
              <CamelIcon color={c} />
            </span>
          ))}
        </div>
        <h1>Camel Up</h1>
        <p className="subtitle">Đua lạc đà và cá cược · 2–8 người chơi online</p>
        {discord.isEmbedded && (
          <div className="discord-banner">
            🎮 Chế độ <strong>Discord Activity</strong> · Tự động ghép chung bàn theo kênh Voice
          </div>
        )}

        <label className="field">
          <span>Tên của bạn</span>
          <input
            value={name}
            maxLength={20}
            placeholder="Ví dụ: Lạc Đà Vàng"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canGo) {
                if (discord.isEmbedded) run(joinDiscordChannelRoom);
                else run(createRoom);
              }
            }}
          />
        </label>

        {discord.isEmbedded ? (
          <button
            className="btn discord-btn big"
            disabled={!canGo}
            onClick={() => run(joinDiscordChannelRoom)}
          >
            🎮 Vào bàn Discord kênh này ({discord.autoRoomCode})
          </button>
        ) : (
          <button className="btn primary big" disabled={!canGo} onClick={() => run(createRoom)}>
            Tạo phòng mới
          </button>
        )}

        <div className="divider">hoặc</div>

        <div className="join-row">
          <input
            value={code}
            maxLength={5}
            placeholder="MÃ PHÒNG"
            className="code-input"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && canGo && code.length >= 4 && run(() => joinRoom(code))}
          />
          <button
            className="btn"
            disabled={!canGo || code.length < 4}
            onClick={() => run(() => joinRoom(code))}
          >
            Vào phòng
          </button>
        </div>

        <SettingsButton className="btn wide rules-btn" />
      </div>
    </div>
  );
}
