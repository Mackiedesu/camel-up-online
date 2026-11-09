import { useEffect, useState, useSyncExternalStore } from 'react';
import { TURN_TIME_SECONDS } from '@camelup/shared';
import { setShowRules, setShowSettings, toggleTurnTimer, useStore } from '../store';
import { sfx } from '../sound';

/** Live countdown hook returning remaining seconds (1..30) or null when inactive. */
export function useTurnCountdown(): { secondsLeft: number | null; progress: number } {
  const room = useStore((s) => s.room);
  const game = useStore((s) => s.game);
  const enabled = room?.turnTimerEnabled ?? false;
  const deadline = room?.turnDeadline ?? null;
  const active = Boolean(enabled && deadline && game?.phase === 'playing');

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !deadline) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active, deadline]);

  if (!active || !deadline) {
    return { secondsLeft: null, progress: 1 };
  }
  const msLeft = Math.max(0, deadline - now);
  const secondsLeft = Math.ceil(msLeft / 1000);
  const progress = Math.min(1, Math.max(0, msLeft / (TURN_TIME_SECONDS * 1000)));
  return { secondsLeft, progress };
}

export function SettingsButton({ className = 'btn small' }: { className?: string }) {
  return (
    <button className={className} onClick={() => setShowSettings(true)}>
      ⚙️ Cài đặt
    </button>
  );
}

export function SettingsModal() {
  const show = useStore((s) => s.showSettings);
  const room = useStore((s) => s.room);
  const turnTimerPref = useStore((s) => s.turnTimerPref);
  const timerEnabled = room ? room.turnTimerEnabled : turnTimerPref;

  const muted = useSyncExternalStore(
    (l) => sfx.subscribe(l),
    () => sfx.muted,
  );

  if (!show) return null;

  return (
    <div className="overlay settings-overlay" onClick={() => setShowSettings(false)}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>⚙️ Cài đặt & Trợ giúp</h3>
          <button className="btn small" onClick={() => setShowSettings(false)}>
            ✕ Đóng
          </button>
        </div>

        <div className="settings-body">
          <div className="setting-item">
            <div className="setting-info">
              <strong>🔊 Âm thanh hiệu ứng</strong>
              <small className="muted">
                {muted ? 'Đang tắt tiếng' : 'Đang bật âm thanh xúc xắc, bước chân và thông báo'}
              </small>
            </div>
            <button
              className={`toggle-switch ${!muted ? 'on' : ''}`}
              onClick={() => sfx.toggleMute()}
              aria-label="Bật/tắt âm thanh"
            >
              <span className="toggle-knob" />
              <span className="toggle-label">{!muted ? 'BẬT' : 'TẮT'}</span>
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <strong>⏱️ Bộ đếm thời gian lượt ({TURN_TIME_SECONDS} giây)</strong>
              <small className="muted">
                Mỗi lượt có {TURN_TIME_SECONDS} giây để suy nghĩ. Nếu hết giờ không phản hồi sẽ tự động chọn hành động{' '}
                <strong>Lắc xúc xắc</strong>.
              </small>
            </div>
            <button
              className={`toggle-switch ${timerEnabled ? 'on' : ''}`}
              onClick={() => toggleTurnTimer()}
              aria-label="Bật/tắt bộ đếm thời gian 30s"
            >
              <span className="toggle-knob" />
              <span className="toggle-label">{timerEnabled ? 'BẬT' : 'TẮT'}</span>
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <strong>📖 Luật chơi Camel Up (2nd Edition)</strong>
              <small className="muted">
                Xem hướng dẫn chi tiết cách di chuyển, xếp chồng, lạc đà điên và tính điểm.
              </small>
            </div>
            <button
              className="btn primary small"
              onClick={() => {
                setShowSettings(false);
                setShowRules(true);
              }}
            >
              📖 Mở Luật chơi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
