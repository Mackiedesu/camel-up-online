import { CAMEL_HEX, finalBetCount, type GameState, type RoomView } from '@camelup/shared';

export function PlayersPanel({ game, room, me }: { game: GameState; room: RoomView; me: string }) {
  return (
    <div className="panel players">
      {game.players.map((p, i) => {
        const online = room.players.find((x) => x.id === p.id)?.connected ?? false;
        const isTurn = i === game.currentPlayerIndex && game.phase === 'playing';
        const isStarter = i === (game.startingPlayerIndex ?? 0);
        const partner = p.partnerId ? game.players.find((x) => x.id === p.partnerId) : null;
        return (
          <div key={p.id} className={`player-row ${isTurn ? 'turn' : ''} ${p.id === me ? 'me' : ''}`}>
            <span className={`dot ${online ? 'on' : 'off'}`} title={online ? 'online' : 'offline'} />
            <span className="pname">
              {isTurn && '▶ '}
              {p.name}
              {p.id === me && ' (bạn)'}{' '}
              {isStarter && (
                <span className="starter-badge" title="Người giữ biểu tượng Đi đầu chặng này">
                  🚩
                </span>
              )}
            </span>
            <span className="coins" title="Đồng Bảng Ai Cập (Egyptian Pounds)">
              💰 {p.coins} EP
            </span>
            <div className="player-items">
              {p.legBets.map((b, j) => (
                <span
                  key={j}
                  className="mini-tile"
                  style={{ background: CAMEL_HEX[b.color] }}
                  title={`Vé cược chặng: Nhất +${b.value}, Nhì +1, 3–5: −1`}
                >
                  {b.value}
                </span>
              ))}
              {p.pyramidTickets > 0 && (
                <span className="chip" title="Vé Kim tự tháp (+1 EP mỗi vé khi kết thúc chặng)">
                  🎫×{p.pyramidTickets}
                </span>
              )}
              {p.spectator && (
                <span className="chip" title="Thẻ Khán giả đang đặt trên bàn đua">
                  {p.spectator.side > 0 ? '👏+1' : '👎−1'} ô {p.spectator.space}
                </span>
              )}
              {partner && (
                <span className="chip" title={`Liên minh cá cược với ${partner.name} trong chặng này`}>
                  🤝 {partner.name}
                </span>
              )}
              {finalBetCount(game, p.id) > 0 && (
                <span className="chip" title="Số thẻ Cược chung cuộc đã đặt">
                  🃏×{finalBetCount(game, p.id)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
