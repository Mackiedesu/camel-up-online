import { useState } from 'react';
import {
  CAMEL_HEX,
  CAMEL_NAME_VI,
  RACING_CAMELS,
  type GameState,
  type RacingColor,
} from '@camelup/shared';
import { sendAction } from '../store';
import { sfx } from '../sound';
import { CamelIcon } from './CamelIcon';
import { BettingTentSvg, PyramidSvg } from './DesertProps';
import { useTurnCountdown } from './SettingsMenu';

interface Props {
  game: GameState;
  me: string;
  spectatorSide: 1 | -1 | null;
  setSpectatorSide: (s: 1 | -1 | null) => void;
  onOpenInspect?: () => void;
}

export function ActionPanel({ game, me, spectatorSide, setSpectatorSide, onOpenInspect }: Props) {
  const current = game.players[game.currentPlayerIndex];
  const myTurn = current.id === me && game.phase === 'playing';
  const meP = game.players.find((p) => p.id === me);
  const isWatcher = !meP;
  const [finalColor, setFinalColor] = useState<RacingColor | null>(null);
  const [busy, setBusy] = useState(false);
  const { secondsLeft, progress } = useTurnCountdown();

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };
  const disabled = !myTurn || busy;

  const myWinnerBets = game.finalWinnerBets
    .map((b, idx) => ({ ...b, order: idx + 1 }))
    .filter((b) => b.playerId === me && b.color !== null);
  const myLoserBets = game.finalLoserBets
    .map((b, idx) => ({ ...b, order: idx + 1 }))
    .filter((b) => b.playerId === me && b.color !== null);

  return (
    <div className={`panel actions ${myTurn ? 'my-turn' : ''}`}>
      <div className="turn-banner-wrap">
        <div className="turn-banner">
          <span>
            {isWatcher
              ? `👁️ Đang xem ván đấu · Lượt của ${current.name}`
              : myTurn
                ? '⭐ Tới lượt bạn! Chọn 1 hành động'
                : `Đang chờ ${current.name}…`}
          </span>
          {secondsLeft !== null && (
            <span
              className={`turn-timer-pill ${secondsLeft <= 10 ? 'urgent' : ''}`}
              title="Hết 30 giây sẽ tự động Lắc xúc xắc"
            >
              ⏱️ {secondsLeft}s
            </span>
          )}
        </div>
        {secondsLeft !== null && (
          <div className="turn-timer-bar">
            <div
              className={`turn-timer-fill ${secondsLeft <= 10 ? 'urgent' : ''}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
        {isWatcher && (
          <button className="btn small wide" style={{ marginTop: '0.25rem' }} onClick={onOpenInspect}>
            🔍 Mở bảng Phân tích & Inspect ván đấu
          </button>
        )}
      </div>

      <section>
        <h4 className="sec-head">
          <BettingTentSvg className="sec-icon" /> 1. Lấy vé cược chặng
          <small className="rule-sub">🥇 +5/3/2 · 🥈 +1 · 3–5: −1 💰</small>
        </h4>
        <div className="leg-bets">
          {RACING_CAMELS.map((c) => {
            const stack = game.legBetStacks[c];
            const top = stack[0];
            return (
              <button
                key={c}
                className="leg-tile"
                style={{ background: CAMEL_HEX[c] }}
                disabled={disabled || top === undefined}
                title={`Cược ${CAMEL_NAME_VI[c]}: Nhất +${top ?? 0} 💰, Nhì +1 💰, hạng 3–5: −1 💰`}
                onClick={() => act(() => sendAction({ type: 'takeLegBet', color: c }))}
              >
                <CamelIcon color={c} />
                <strong>{top ?? '—'}</strong>
                <small>còn {stack.length}/4</small>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h4 className="sec-head">
          <PyramidSvg className="sec-icon" /> 2. Lắc Kim tự tháp xúc xắc
        </h4>
        <button
          className="btn primary wide"
          disabled={disabled}
          onClick={() => act(() => sendAction({ type: 'rollDie' }))}
        >
          🎲 Lấy 1 vé Kim tự tháp (+1 💰 cuối chặng) & Lắc
        </button>
      </section>

      <section>
        <h4>
          📣 3. {meP?.spectator ? 'Di chuyển thẻ Khán giả' : 'Đặt thẻ Khán giả'}{' '}
          {meP?.spectator && <small>(đang ở ô {meP.spectator.space} · +1 💰 mỗi lần có lạc đà đạp trúng)</small>}
        </h4>
        {spectatorSide === null ? (
          <div className="row">
            <button
              className="btn oasis"
              disabled={disabled}
              title="Lạc đà đạp trúng sẽ đi tiếp 1 ô và nhảy lên ĐỈNH chồng"
              onClick={() => {
                sfx.play('click');
                setSpectatorSide(1);
              }}
            >
              👏 Cổ vũ +1 <small>(lên đỉnh)</small>
            </button>
            <button
              className="btn mirage"
              disabled={disabled}
              title="Lạc đà đạp trúng sẽ lùi 1 ô và chui xuống ĐÁY chồng"
              onClick={() => {
                sfx.play('click');
                setSpectatorSide(-1);
              }}
            >
              👎 La ó −1 <small>(xuống đáy)</small>
            </button>
          </div>
        ) : (
          <div className="row hint">
            <span>👆 Chọn 1 ô trống hợp lệ trên bàn đua (từ ô 2–16, không sát thẻ khác)</span>
            <button className="btn small ghost" onClick={() => setSpectatorSide(null)}>
              Huỷ
            </button>
          </div>
        )}
      </section>

      <section>
        <h4>
          🃏 4. Cược chung cuộc <small>(Đúng: +8/5/3/2/1 💰 · Sai: −1 💰)</small>
        </h4>
        <div className="final-colors">
          {RACING_CAMELS.map((c) => {
            const used = meP?.usedFinalCards.includes(c);
            const winBet = myWinnerBets.find((b) => b.color === c);
            const loseBet = myLoserBets.find((b) => b.color === c);
            const badge = winBet ? '🏆' : loseBet ? '🐢' : used ? '✓' : '';
            const tip = winBet
              ? `Đã cược ${CAMEL_NAME_VI[c]} VỀ NHẤT (thẻ #${winBet.order} trong chồng)`
              : loseBet
                ? `Đã cược ${CAMEL_NAME_VI[c]} VỀ BÉT (thẻ #${loseBet.order} trong chồng)`
                : used
                  ? 'Đã dùng thẻ màu này'
                  : `Chọn thẻ ${CAMEL_NAME_VI[c]}`;
            return (
              <button
                key={c}
                className={`final-chip ${finalColor === c ? 'selected' : ''} ${used ? 'used-chip' : ''}`}
                style={{ background: CAMEL_HEX[c], color: c === 'yellow' ? '#222' : '#fff' }}
                disabled={disabled || used}
                title={tip}
                onClick={() => setFinalColor(c)}
              >
                {badge}
              </button>
            );
          })}
        </div>
        <div className="row">
          <button
            className="btn"
            disabled={disabled || !finalColor}
            onClick={() =>
              act(async () => {
                await sendAction({ type: 'finalBet', color: finalColor!, kind: 'winner' });
                setFinalColor(null);
              })
            }
          >
            🏆 Cược Về nhất ({game.finalWinnerBets.length})
          </button>
          <button
            className="btn"
            disabled={disabled || !finalColor}
            onClick={() =>
              act(async () => {
                await sendAction({ type: 'finalBet', color: finalColor!, kind: 'loser' });
                setFinalColor(null);
              })
            }
          >
            🐢 Cược Về bét ({game.finalLoserBets.length})
          </button>
        </div>

        <div className="my-final-bets">
          <div className="my-final-row">
            <span className="my-final-label">🏆 Bạn cược Nhất:</span>
            {myWinnerBets.length === 0 ? (
              <span className="muted small">Chưa đặt</span>
            ) : (
              myWinnerBets.map((b) => (
                <span
                  key={b.color!}
                  className="final-bet-badge"
                  style={{
                    background: CAMEL_HEX[b.color!],
                    color: b.color === 'yellow' ? '#222' : '#fff',
                  }}
                  title={`Thẻ đặt thứ #${b.order} trong chồng Về Nhất`}
                >
                  🏆 {CAMEL_NAME_VI[b.color!]} <small>#{b.order}</small>
                </span>
              ))
            )}
          </div>
          <div className="my-final-row">
            <span className="my-final-label">🐢 Bạn cược Bét:</span>
            {myLoserBets.length === 0 ? (
              <span className="muted small">Chưa đặt</span>
            ) : (
              myLoserBets.map((b) => (
                <span
                  key={b.color!}
                  className="final-bet-badge"
                  style={{
                    background: CAMEL_HEX[b.color!],
                    color: b.color === 'yellow' ? '#222' : '#fff',
                  }}
                  title={`Thẻ đặt thứ #${b.order} trong chồng Về Bét`}
                >
                  🐢 {CAMEL_NAME_VI[b.color!]} <small>#{b.order}</small>
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {game.players.length >= 6 && (
        <section>
          <h4>
            🤝 5. Liên minh cá cược <small>(Luật 6–8 người · sao chép 1 vé tốt nhất của đối tác)</small>
          </h4>
          {meP?.partnerId ? (
            <p className="muted small">
              Bạn đang liên minh với{' '}
              <strong>{game.players.find((x) => x.id === meP.partnerId)?.name ?? '?'}</strong> trong chặng này.
            </p>
          ) : (
            <div className="row">
              {game.players
                .filter((p) => p.id !== me && !p.partnerId)
                .map((p) => (
                  <button
                    key={p.id}
                    className="btn small"
                    disabled={disabled}
                    onClick={() => act(() => sendAction({ type: 'formPartnership', partnerId: p.id }))}
                  >
                    🤝 {p.name}
                  </button>
                ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
