import { CAMEL_HEX, finalBetCount, type GameState, type RoomView } from '@camelup/shared';

export function PlayersPanel({ game, room, me }: { game: GameState; room: RoomView; me: string }) {
  return (
    <div className="panel players">
      {game.players.map((p, i) => {
        const online = room.players.find((x) => x.id === p.id)?.connected ?? false;
        const isTurn = i === game.currentPlayerIndex && game.phase === 'playing';
        return (
          <div key={p.id} className={`player-row ${isTurn ? 'turn' : ''} ${p.id === me ? 'me' : ''}`}>
            <span className={`dot ${online ? 'on' : 'off'}`} title={online ? 'online' : 'offline'} />
            <span className="pname">
              {isTurn && '▶ '}
              {p.name}
              {p.id === me && ' (bạn)'}
            </span>
            <span className="coins">💰 {p.coins}</span>
            <div className="player-items">
              {p.legBets.map((b, j) => (
                <span key={j} className="mini-tile" style={{ background: CAMEL_HEX[b.color] }}>
                  {b.value}
                </span>
              ))}
              {p.pyramidTickets > 0 && <span className="chip">🎫×{p.pyramidTickets}</span>}
              {p.spectator && (
                <span className="chip">
                  {p.spectator.side > 0 ? '🌴' : '🏜️'}ô{p.spectator.space}
                </span>
              )}
              {finalBetCount(game, p.id) > 0 && <span className="chip">🃏×{finalBetCount(game, p.id)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
