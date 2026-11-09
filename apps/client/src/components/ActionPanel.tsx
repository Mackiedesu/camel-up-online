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

interface Props {
  game: GameState;
  me: string;
  spectatorSide: 1 | -1 | null;
  setSpectatorSide: (s: 1 | -1 | null) => void;
}

export function ActionPanel({ game, me, spectatorSide, setSpectatorSide }: Props) {
  const current = game.players[game.currentPlayerIndex];
  const myTurn = current.id === me && game.phase === 'playing';
  const meP = game.players.find((p) => p.id === me);
  const [finalColor, setFinalColor] = useState<RacingColor | null>(null);
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };
  const disabled = !myTurn || busy;

  return (
    <div className={`panel actions ${myTurn ? 'my-turn' : ''}`}>
      <div className="turn-banner">
        {myTurn ? '⭐ Tới lượt bạn! Chọn 1 hành động' : `Đang chờ ${current.name}…`}
      </div>

      <section>
        <h4 className="sec-head">
          <BettingTentSvg className="sec-icon" /> Quầy cược chặng
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
                title={`Cược ${CAMEL_NAME_VI[c]} thắng chặng`}
                onClick={() => act(() => sendAction({ type: 'takeLegBet', color: c }))}
              >
                <CamelIcon color={c} />
                <strong>{top ?? '—'}</strong>
                <small>còn {stack.length}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h4 className="sec-head">
          <PyramidSvg className="sec-icon" /> Kim tự tháp xúc xắc
        </h4>
        <button
          className="btn primary wide"
          disabled={disabled}
          onClick={() => act(() => sendAction({ type: 'rollDie' }))}
        >
          🎲 Lắc xúc xắc (+1 vé = 1 💰 cuối chặng)
        </button>
      </section>

      <section>
        <h4>🌴 Thẻ khán giả {meP?.spectator && <small>(đang ở ô {meP.spectator.space})</small>}</h4>
        {spectatorSide === null ? (
          <div className="row">
            <button
              className="btn oasis"
              disabled={disabled}
              onClick={() => {
                sfx.play('click');
                setSpectatorSide(1);
              }}
            >
              🌴 Ốc đảo +1
            </button>
            <button
              className="btn mirage"
              disabled={disabled}
              onClick={() => {
                sfx.play('click');
                setSpectatorSide(-1);
              }}
            >
              🏜️ Ảo ảnh −1
            </button>
          </div>
        ) : (
          <div className="row hint">
            <span>👆 Chọn một ô sáng trên bàn đua</span>
            <button className="btn small ghost" onClick={() => setSpectatorSide(null)}>
              Huỷ
            </button>
          </div>
        )}
      </section>

      <section>
        <h4>🃏 Cược chung cuộc</h4>
        <div className="final-colors">
          {RACING_CAMELS.map((c) => {
            const used = meP?.usedFinalCards.includes(c);
            return (
              <button
                key={c}
                className={`final-chip ${finalColor === c ? 'selected' : ''}`}
                style={{ background: CAMEL_HEX[c] }}
                disabled={disabled || used}
                title={used ? 'Đã dùng' : CAMEL_NAME_VI[c]}
                onClick={() => setFinalColor(c)}
              >
                {used ? '✓' : ''}
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
            🏆 Về nhất
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
            🐢 Về bét
          </button>
        </div>
        <p className="muted small">
          Cược thắng: {game.finalWinnerBets.length} thẻ · Cược thua: {game.finalLoserBets.length} thẻ
        </p>
      </section>
    </div>
  );
}
