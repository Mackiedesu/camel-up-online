import { useSyncExternalStore } from 'react';
import { sfx } from '../sound';

export function SoundToggle() {
  const muted = useSyncExternalStore(
    (l) => sfx.subscribe(l),
    () => sfx.muted,
  );
  return (
    <button
      className="btn small"
      title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
      onClick={() => sfx.toggleMute()}
    >
      {muted ? '🔇 Tắt tiếng' : '🔊 Âm thanh'}
    </button>
  );
}
