import { useEffect, useMemo, useState } from 'react';
import { canPlaceSpectator, TRACK_LENGTH } from '@camelup/shared';
import { leaveRoom, sendAction, useStore } from '../store';
import { Board } from './Board';
import { ActionPanel } from './ActionPanel';
import { PlayersPanel } from './PlayersPanel';
import { GameOver } from './GameOver';
import { SoundToggle } from './SoundToggle';

export function GameView() {
  const game = useStore((s) => s.game)!;
  const room = useStore((s) => s.room)!;
  const me = useStore((s) => s.playerId);
  const log = useStore((s) => s.log);
  const [spectatorSide, setSpectatorSide] = useState<1 | -1 | null>(null);

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
        </span>
        <div className="row">
          <SoundToggle />
          <button className="btn small ghost" onClick={() => confirm('Rời ván đang chơi?') && leaveRoom()}>
            Rời
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

      {game.phase === 'finished' && <GameOver game={game} room={room} me={me} />}
    </div>
  );
}
