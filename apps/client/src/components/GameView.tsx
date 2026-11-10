import { useEffect, useMemo, useState } from 'react';
import { canPlaceSpectator, TRACK_LENGTH } from '@camelup/shared';
import { backToLobby, endGameNow, leaveRoom, sendAction, useStore } from '../store';
import { Board } from './Board';
import { ActionPanel } from './ActionPanel';
import { PlayersPanel } from './PlayersPanel';
import { GameOver } from './GameOver';
import { SettingsButton } from './SettingsMenu';
import { InspectModal } from './InspectModal';

export function GameView() {
  const game = useStore((s) => s.game)!;
  const room = useStore((s) => s.room)!;
  const me = useStore((s) => s.playerId);
  const log = useStore((s) => s.log);
  const [spectatorSide, setSpectatorSide] = useState<1 | -1 | null>(null);
  const [confirmModal, setConfirmModal] = useState<'leave' | 'endGame' | null>(null);
  const [showInspect, setShowInspect] = useState(false);

  const isHost = room.hostId === me;
  const isWatcher = !game.players.some((p) => p.id === me);
  const spectators = room.players.filter((p) => p.spectating && p.connected);
  const myTurn = game.players[game.currentPlayerIndex]?.id === me && game.phase === 'playing';
  useEffect(() => {
    if (!myTurn) setSpectatorSide(null);
  }, [myTurn]);

  const selectable = useMemo(() => {
    if (spectatorSide === null || !myTurn) return null;
    const s = new Set<number>();
    for (let i = 2; i <= TRACK_LENGTH; i++) if (canPlaceSpectator(game, me, i)) s.add(i);
    return s;
  }, [spectatorSide, myTurn, game, me]);

  const onSelect = async (space: number) => {
    if (spectatorSide === null) return;
    const side = spectatorSide;
    setSpectatorSide(null);
    await sendAction({ type: 'placeSpectator', space, side });
  };

  return (
    <div className="game">
      <header className="game-header">
        <span className="logo">🐪 Camel Up</span>
        <span className="muted">
          Phòng <strong>{room.code}</strong> · Chặng {game.leg} · Lượt {game.turn}
          {isWatcher && ' · 👁️ Đang xem'}
          {spectators.length > 0 && ` (${spectators.length} người xem)`}
        </span>
        <div className="row">
          <button className="btn small" onClick={() => setShowInspect(true)}>
            🔍 Inspect
          </button>
          <SettingsButton />
          {isHost && game.phase === 'playing' && (
            <button className="btn small danger-btn" onClick={() => setConfirmModal('endGame')}>
              🛑 Kết thúc ván
            </button>
          )}
          <button className="btn small" onClick={() => setConfirmModal('leave')}>
            🚪 Rời phòng
          </button>
        </div>
      </header>

      <div className="game-main">
        <div className="board-wrap">
          <Board game={game} selectable={selectable} onSelect={onSelect} />
        </div>
        <aside className="side">
          <ActionPanel
            game={game}
            me={me}
            spectatorSide={spectatorSide}
            setSpectatorSide={setSpectatorSide}
            onOpenInspect={() => setShowInspect(true)}
          />
          <PlayersPanel game={game} room={room} me={me} />
          <div className="panel log">
            <h4>📜 Diễn biến</h4>
            <ul>
              {log.map((l) => (
                <li key={l.id}>{l.text}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {confirmModal === 'leave' && (
        <div className="overlay settings-overlay" onClick={() => setConfirmModal(null)}>
          <div className="settings-modal confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h3>🚪 Rời phòng đang chơi?</h3>
              <button className="btn small" onClick={() => setConfirmModal(null)}>
                ✕
              </button>
            </div>
            <div className="settings-body">
              <p style={{ margin: 0 }}>
                Bạn có chắc muốn rời khỏi phòng <strong>{room.code}</strong> không?
              </p>
              <div className="row center" style={{ marginTop: '0.4rem' }}>
                <button
                  className="btn primary"
                  onClick={() => {
                    setConfirmModal(null);
                    leaveRoom();
                  }}
                >
                  🚪 Rời phòng ngay
                </button>
                <button className="btn" onClick={() => setConfirmModal(null)}>
                  Ở lại chơi tiếp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal === 'endGame' && (
        <div className="overlay settings-overlay" onClick={() => setConfirmModal(null)}>
          <div className="settings-modal confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h3>🛑 Kết thúc ván đấu (Chủ phòng)</h3>
              <button className="btn small" onClick={() => setConfirmModal(null)}>
                ✕
              </button>
            </div>
            <div className="settings-body">
              <p style={{ margin: 0 }}>
                Chọn cách bạn muốn kết thúc ván đấu hiện tại cho toàn bộ phòng:
              </p>
              <button
                className="btn primary wide"
                onClick={async () => {
                  setConfirmModal(null);
                  await endGameNow();
                }}
              >
                🏆 Chấm điểm ngay & Xem bảng xếp hạng
              </button>
              <button
                className="btn wide"
                onClick={async () => {
                  setConfirmModal(null);
                  await backToLobby();
                }}
              >
                🔄 Hủy ván & Đưa cả phòng về Phòng chờ
              </button>
              <button className="btn ghost wide" onClick={() => setConfirmModal(null)}>
                Huỷ thao tác
              </button>
            </div>
          </div>
        </div>
      )}

      {showInspect && (
        <InspectModal game={game} room={room} me={me} onClose={() => setShowInspect(false)} />
      )}

      {game.phase === 'finished' && <GameOver game={game} room={room} me={me} />}
    </div>
  );
}
