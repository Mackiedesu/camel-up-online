import { motion } from 'framer-motion';
import { CAMEL_NAME_VI, type GameState, type RoomView } from '@camelup/shared';
import { backToLobby, leaveRoom } from '../store';
import { CamelIcon } from './CamelIcon';

export function GameOver({ game, room, me }: { game: GameState; room: RoomView; me: string }) {
  const r = game.result!;
  const sorted = [...game.players].sort((a, b) => b.coins - a.coins);
  const isHost = room.hostId === me;
  return (
    <div className="overlay">
      <motion.div
        className="gameover"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', delay: 0.8 }}
      >
        <h2>🏆 Kết thúc cuộc đua!</h2>
        <div className="podium">
          {r.ranking.map((c, i) => (
            <div key={c} className="podium-item">
              <span className="rank">#{i + 1}</span>
              <CamelIcon color={c} />
              <small>{CAMEL_NAME_VI[c]}</small>
            </div>
          ))}
        </div>
        <table className="results">
          <thead>
            <tr>
              <th>Người chơi</th>
              <th>Cược chung cuộc</th>
              <th>Tổng 💰</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} className={r.winners.includes(p.id) ? 'winner' : ''}>
                <td>
                  {r.winners.includes(p.id) && '👑 '}
                  {p.name}
                  {p.id === me && ' (bạn)'}
                </td>
                <td>{(r.finalDeltas[p.id] ?? 0) >= 0 ? `+${r.finalDeltas[p.id] ?? 0}` : r.finalDeltas[p.id]}</td>
                <td>
                  <strong>{p.coins}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row center">
          {isHost ? (
            <button className="btn primary" onClick={backToLobby}>
              Về phòng chờ, chơi tiếp
            </button>
          ) : (
            <span className="muted">Đang chờ chủ phòng…</span>
          )}
          <button className="btn ghost" onClick={leaveRoom}>
            Rời phòng
          </button>
        </div>
      </motion.div>
    </div>
  );
}
