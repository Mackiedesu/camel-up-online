import {
  CAMEL_HEX,
  CAMEL_NAME_VI,
  CRAZY_CAMELS,
  DICE_PER_LEG,
  TRACK_LENGTH,
  chooseCrazyCamel,
  finalBetCount,
  findCamel,
  getRanking,
  type GameState,
  type RoomView,
} from '@camelup/shared';
import { CamelIcon } from './CamelIcon';

interface Props {
  game: GameState;
  room: RoomView;
  me: string;
  onClose: () => void;
}

export function InspectModal({ game, room, me, onClose }: Props) {
  const ranking = getRanking(game.track);
  const prob = game.pyramid.length > 0 ? Math.round((100 / game.pyramid.length) * 10) / 10 : 0;
  const spectators = room.players.filter((p) => p.spectating && p.connected);

  // Check if Crazy Camel special rule is active right now
  const crazyIfBlack = chooseCrazyCamel(game.track, 'black');
  const crazyIfWhite = chooseCrazyCamel(game.track, 'white');
  const forcedCrazy = crazyIfBlack === crazyIfWhite ? crazyIfBlack : null;

  // Compute projected leg delta for each player if leg ended right now
  const ticketReward = (color: string, value: number) => {
    if (color === ranking[0]) return value;
    if (color === ranking[1]) return 1;
    return -1;
  };

  const occupiedSpaces: number[] = [];
  for (let s = 1; s <= TRACK_LENGTH; s++) {
    const hasCamels = (game.track[s]?.length ?? 0) > 0;
    const hasSpec = game.players.some((p) => p.spectator?.space === s);
    if (hasCamels || hasSpec) occupiedSpaces.push(s);
  }

  return (
    <div className="overlay rules-overlay" onClick={onClose}>
      <div className="rules-modal inspect-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rules-header">
          <div>
            <h2>🔍 Inspect Ván Đấu · Phòng {room.code}</h2>
            <p className="muted small">
              Chặng {game.leg} · Lượt {game.turn} · Đã lắc {game.rolledDice.length}/{DICE_PER_LEG} xúc xắc
              {spectators.length > 0 && ` · 👁️ ${spectators.length} người đang xem`}
            </p>
          </div>
          <button className="btn small" onClick={onClose}>
            ✕ Đóng
          </button>
        </div>

        <div className="rules-body">
          <div className="rules-section">
            {/* 1. Live Camel Ranking & Crazy Camels */}
            <div className="rule-grid-2">
              <div className="rule-card">
                <h4>🏆 Bảng xếp hạng Lạc đà đua hiện tại</h4>
                <div className="inspect-list">
                  {ranking.map((c, idx) => {
                    const pos = findCamel(game.track, c);
                    const stack = game.track[pos.space] ?? [];
                    const remainingBets = game.legBetStacks[c];
                    const rankLabel =
                      idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 4 ? '🐢 #5' : `#${idx + 1}`;
                    return (
                      <div key={c} className="inspect-row">
                        <span className="inspect-rank">{rankLabel}</span>
                        <span className="inspect-camel-icon">
                          <CamelIcon color={c} />
                        </span>
                        <div className="inspect-camel-info">
                          <strong>{CAMEL_NAME_VI[c]}</strong>
                          <small className="muted">
                            {pos.space > TRACK_LENGTH
                              ? 'Đã qua đích'
                              : pos.space === 0
                                ? 'Lùi qua đích'
                                : `Ô ${pos.space}`}{' '}
                            {stack.length > 1 && `(tầng ${pos.index + 1}/${stack.length})`}
                          </small>
                        </div>
                        <span className="chip">
                          Vé còn: {remainingBets.length > 0 ? remainingBets.join(', ') : 'Hết'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Pyramid & Dice Probabilities */}
              <div className="rule-card">
                <h4>🔺 Kim tự tháp & Xác suất Xúc xắc</h4>
                <p className="small muted">
                  Còn <strong>{DICE_PER_LEG - game.rolledDice.length}</strong> lượt lắc nữa sẽ kết thúc Chặng {game.leg}.
                </p>

                <div style={{ marginTop: '0.45rem' }}>
                  <strong className="small">🎲 Đã lắc trong chặng này ({game.rolledDice.length}/{DICE_PER_LEG}):</strong>
                  <div className="row" style={{ marginTop: '0.25rem' }}>
                    {game.rolledDice.length === 0 ? (
                      <span className="muted small">Chưa có xúc xắc nào được lắc</span>
                    ) : (
                      game.rolledDice.map((r, i) => {
                        const c = r.die === 'grey' ? r.crazyColor! : r.die;
                        return (
                          <span
                            key={i}
                            className="final-bet-badge"
                            style={{
                              background: CAMEL_HEX[c],
                              color: c === 'white' || c === 'yellow' ? '#222' : '#fff',
                            }}
                          >
                            #{i + 1}: {CAMEL_NAME_VI[r.movedCamel]} ({r.value})
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '0.6rem' }}>
                  <strong className="small">
                    🏺 Còn trong Kim tự tháp ({game.pyramid.length} viên · mỗi viên ~{prob}%):
                  </strong>
                  <div className="row" style={{ marginTop: '0.25rem' }}>
                    {game.pyramid.map((d) => (
                      <span
                        key={d}
                        className="final-bet-badge"
                        style={{
                          background: d === 'grey' ? '#777' : CAMEL_HEX[d],
                          color: d === 'yellow' ? '#222' : '#fff',
                        }}
                      >
                        {CAMEL_NAME_VI[d]} ({prob}%)
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '0.65rem', borderTop: '1px dashed var(--sand-3)', paddingTop: '0.45rem' }}>
                  <strong className="small">🌀 Trạng thái 2 Lạc đà điên:</strong>
                  <div className="row" style={{ marginTop: '0.25rem' }}>
                    {CRAZY_CAMELS.map((c) => {
                      const pos = findCamel(game.track, c);
                      const stack = game.track[pos.space] ?? [];
                      return (
                        <span key={c} className="chip">
                          Điên {CAMEL_NAME_VI[c]}: Ô {pos.space}{' '}
                          {stack.length > 1 && `(tầng ${pos.index + 1}/${stack.length})`}
                        </span>
                      );
                    })}
                  </div>
                  {forcedCrazy && (
                    <p className="small" style={{ color: 'var(--accent-2)', marginTop: '0.25rem', fontWeight: 700 }}>
                      ⚠️ Luật ưu tiên đang kích hoạt: Nếu lắc ra Xúc xắc Xám, bắt buộc{' '}
                      <strong>Lạc đà điên {CAMEL_NAME_VI[forcedCrazy]}</strong> phải di chuyển!
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Players & Projected Leg Scoring */}
            <div className="rule-card">
              <h4>👥 Thống kê Người chơi & Dự tính Điểm Chặng {game.leg} (nếu kết thúc ngay)</h4>
              <div className="inspect-table-wrap">
                <table className="results inspect-table">
                  <thead>
                    <tr>
                      <th>Người chơi</th>
                      <th>Tiền hiện có</th>
                      <th>Vé cược chặng đang giữ</th>
                      <th>Vé Kim tự tháp</th>
                      <th>Dự tính Chặng</th>
                      <th>Cược Chung cuộc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {game.players.map((p, idx) => {
                      let legDelta = p.pyramidTickets;
                      for (const b of p.legBets) legDelta += ticketReward(b.color, b.value);
                      if (p.partnerId) {
                        const partner = game.players.find((x) => x.id === p.partnerId);
                        if (partner) {
                          let best = partner.pyramidTickets > 0 ? 1 : 0;
                          for (const b of partner.legBets) {
                            const r = ticketReward(b.color, b.value);
                            if (r > best) best = r;
                          }
                          legDelta += best;
                        }
                      }
                      const projectedCoins = Math.max(0, p.coins + legDelta);
                      const actualDelta = projectedCoins - p.coins;
                      return (
                        <tr key={p.id} className={idx === game.currentPlayerIndex ? 'winner' : ''}>
                          <td>
                            {idx === game.currentPlayerIndex && '▶ '}
                            <strong>{p.name}</strong>
                            {p.id === me && ' (bạn)'}
                            {idx === (game.startingPlayerIndex ?? 0) && ' 🚩'}
                          </td>
                          <td>
                            <strong>{p.coins} EP</strong>
                          </td>
                          <td>
                            {p.legBets.length === 0 ? (
                              <span className="muted small">—</span>
                            ) : (
                              <div className="row center">
                                {p.legBets.map((b, j) => {
                                  const rw = ticketReward(b.color, b.value);
                                  return (
                                    <span
                                      key={j}
                                      className="final-bet-badge mini"
                                      style={{
                                        background: CAMEL_HEX[b.color],
                                        color: b.color === 'yellow' ? '#222' : '#fff',
                                      }}
                                    >
                                      {b.value} ({rw > 0 ? `+${rw}` : rw})
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td>{p.pyramidTickets > 0 ? `🎫 ×${p.pyramidTickets} (+${p.pyramidTickets})` : '—'}</td>
                          <td>
                            <strong style={{ color: actualDelta > 0 ? 'var(--ok)' : actualDelta < 0 ? 'var(--danger)' : undefined }}>
                              {actualDelta >= 0 ? `+${actualDelta}` : actualDelta} EP
                            </strong>{' '}
                            <small className="muted">(→ {projectedCoins})</small>
                          </td>
                          <td>
                            {finalBetCount(game, p.id) > 0 ? `🃏 ×${finalBetCount(game, p.id)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="muted small" style={{ marginTop: '0.4rem' }}>
                Tổng số thẻ Cược chung cuộc trên bàn: <strong>🏆 Về nhất: {game.finalWinnerBets.length} thẻ</strong> ·{' '}
                <strong>🐢 Về bét: {game.finalLoserBets.length} thẻ</strong>
              </p>
            </div>

            {/* 4. Track Space Breakdown */}
            <div className="rule-card">
              <h4>🗺️ Chi tiết các Ô đang có Lạc đà / Thẻ Khán giả trên đường đua</h4>
              <div className="inspect-spaces">
                {occupiedSpaces.map((s) => {
                  const stack = game.track[s] ?? [];
                  const specOwner = game.players.find((p) => p.spectator?.space === s);
                  return (
                    <div key={s} className="inspect-space-box">
                      <span className="diag-title">Ô số {s}</span>
                      {stack.length > 0 && (
                        <div className="diag-stack">
                          {[...stack].reverse().map((c, idx) => (
                            <span
                              key={c}
                              className="diag-pill"
                              style={{
                                background: CAMEL_HEX[c],
                                color: c === 'white' || c === 'yellow' ? '#222' : '#fff',
                              }}
                            >
                              Tầng {stack.length - idx}: {CAMEL_NAME_VI[c]}
                            </span>
                          ))}
                        </div>
                      )}
                      {specOwner?.spectator && (
                        <span className="chip" style={{ marginTop: '0.2rem', display: 'inline-block' }}>
                          {specOwner.spectator.side > 0 ? '👏 Cổ vũ +1' : '👎 La ó −1'} ({specOwner.name})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
