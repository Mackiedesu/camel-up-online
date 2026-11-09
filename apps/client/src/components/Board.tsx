import { AnimatePresence, motion } from 'framer-motion';
import {
  CAMEL_HEX,
  DICE_PER_LEG,
  TRACK_LENGTH,
  isCrazy,
  type CamelColor,
  type GameState,
} from '@camelup/shared';
import { useStore } from '../store';
import { CamelIcon } from './CamelIcon';
import {
  BettingTentSvg,
  CactusSvg,
  FinishArchSvg,
  OasisPondSvg,
  PalmTreeSvg,
  PyramidSvg,
} from './DesertProps';

/** 16 spaces around the edge of a 5x5 grid, clockwise from top-left. */
export function cellOf(space: number): { row: number; col: number } {
  const s = space > TRACK_LENGTH ? 1 : space < 1 ? 16 : space; // finished camels shown on/near finish line
  if (s <= 5) return { row: 0, col: s - 1 };
  if (s <= 9) return { row: s - 5, col: 4 };
  if (s <= 13) return { row: 4, col: 4 - (s - 9) };
  return { row: 4 - (s - 13), col: 0 };
}

const CELL = 20; // % of board
const CAMEL_W = 12.2;
const CAMEL_H = (CAMEL_W * 60) / 88;

interface Props {
  game: GameState;
  selectable: Set<number> | null;
  onSelect?: (space: number) => void;
}

export function Board({ game, selectable, onSelect }: Props) {
  const lastRoll = useStore((s) => s.lastRoll);

  // Compute camel positions with clear vertical stacking
  const camels: {
    color: CamelColor;
    space: number;
    k: number;
    stackSize: number;
    x: number;
    y: number;
  }[] = [];
  game.track.forEach((stack, space) => {
    if (stack.length === 0) return;
    const { row, col } = cellOf(space);
    const finished = space > TRACK_LENGTH || space === 0;
    // Tall step so each camel clearly sits on the back of the camel below it
    const step = stack.length > 1 ? Math.min(4.6, 13.8 / (stack.length - 1)) : 0;
    stack.forEach((color, k) => {
      const x = col * CELL + (CELL - CAMEL_W) / 2 + (finished ? -2.5 : 0);
      const y = row * CELL + CELL - 1.2 - CAMEL_H - k * step + (finished ? -3.5 : 0);
      camels.push({ color, space, k, stackSize: stack.length, x, y });
    });
  });

  return (
    <div className="board">
      {Array.from({ length: TRACK_LENGTH }, (_, i) => {
        const space = i + 1;
        const { row, col } = cellOf(space);
        const owner = game.players.find((p) => p.spectator?.space === space);
        const canPick = selectable?.has(space);
        const stack = game.track[space] ?? [];
        return (
          <div
            key={space}
            className={`cell ${canPick ? 'pickable' : ''} ${selectable && !canPick ? 'dim' : ''} ${
              space === 1 ? 'start' : ''
            }`}
            style={{ left: `${col * CELL}%`, top: `${row * CELL}%` }}
            onClick={() => canPick && onSelect?.(space)}
          >
            <span className="cell-num">{space}</span>
            {space === 1 && <FinishArchSvg className="finish-arch" />}
            {stack.length > 1 && (
              <div className="stack-pills" title="Thứ tự chồng (trên cùng → dưới cùng)">
                {[...stack].reverse().map((c, idx) => (
                  <span
                    key={c}
                    className="stack-pill"
                    style={{
                      background: CAMEL_HEX[c],
                      color: c === 'white' || c === 'yellow' ? '#222' : '#fff',
                    }}
                  >
                    {stack.length - idx}
                  </span>
                ))}
              </div>
            )}
            {owner?.spectator && (
              <div
                className={`spectator ${owner.spectator.side > 0 ? 'plus' : 'minus'}`}
                title={
                  owner.spectator.side > 0
                    ? `Thẻ Cổ vũ (+1) của ${owner.name}: đi tiếp 1 ô & nhảy lên ĐỈNH chồng`
                    : `Thẻ La ó (−1) của ${owner.name}: lùi 1 ô & chui xuống ĐÁY chồng`
                }
              >
                <span>{owner.spectator.side > 0 ? '👏 +1' : '👎 −1'}</span>
                <small>{owner.name}</small>
              </div>
            )}
          </div>
        );
      })}

      <div className="board-center">
        {/* Decorative desert scenery */}
        <svg className="desert-dunes" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,220 Q90,190 180,225 T300,210 L300,300 L0,300 Z" fill="#efd089" opacity="0.55" />
          <path d="M0,255 Q120,230 220,260 T300,250 L300,300 L0,300 Z" fill="#e5be6d" opacity="0.5" />
        </svg>

        <PalmTreeSvg className="scenery palm-tl" />
        <OasisPondSvg className="scenery oasis-bl" />
        <PalmTreeSvg className="scenery palm-bl" flip />
        <BettingTentSvg className="scenery tent-tr" />
        <CactusSvg className="scenery cactus-br" />

        <div className="center-content">
          <div className="leg-title">Chặng {game.leg}</div>
          <div className="pyramid">
            <motion.div
              key={lastRoll?.key ?? 0}
              className="pyramid-svg-wrap"
              animate={lastRoll ? { rotate: [0, -10, 10, -8, 8, 0], y: [0, -5, 0] } : undefined}
              transition={{ duration: 0.45 }}
            >
              <PyramidSvg className="pyramid-svg" />
            </motion.div>
            <div className="pyramid-count">
              🎫 Vé Kim tự tháp còn: <strong>{DICE_PER_LEG - game.rolledDice.length}</strong>/{DICE_PER_LEG}
            </div>
          </div>
          <div className="dice-tents" title="5 Lều xúc xắc (khi đủ 5 xúc xắc sẽ kết thúc chặng)">
            {Array.from({ length: DICE_PER_LEG }, (_, i) => {
              const r = game.rolledDice[i];
              if (!r) {
                return (
                  <span key={i} className="tent-slot empty">
                    ⛺
                  </span>
                );
              }
              const c = r.die === 'grey' ? r.crazyColor! : r.die;
              return (
                <span
                  key={i}
                  className={`die small ${r.die === 'grey' ? 'grey' : ''}`}
                  style={{ background: CAMEL_HEX[c], color: c === 'white' || c === 'yellow' ? '#222' : '#fff' }}
                  title={
                    r.die === 'grey'
                      ? `Xúc xắc Xám (mặt ${r.crazyColor} ${r.value}, lạc đà ${r.movedCamel} đi)`
                      : `Xúc xắc ${r.die}: +${r.value}`
                  }
                >
                  {r.value}
                </span>
              );
            })}
          </div>
          <AnimatePresence mode="popLayout">
            {lastRoll && (
              <motion.div
                key={lastRoll.key}
                className="big-roll"
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              >
                {(() => {
                  const r = lastRoll.roll;
                  const c = r.die === 'grey' ? r.crazyColor! : r.die;
                  return (
                    <span
                      className={`die big ${r.die === 'grey' ? 'grey' : ''}`}
                      style={{
                        background: CAMEL_HEX[c],
                        color: c === 'white' || c === 'yellow' ? '#222' : '#fff',
                      }}
                    >
                      {r.value}
                    </span>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {camels.map(({ color, space, k, stackSize, x, y }) => (
        <motion.div
          key={color}
          className="camel"
          initial={false}
          animate={{ left: `${x}%`, top: `${y}%` }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          style={{ width: `${CAMEL_W}%`, zIndex: 10 + k }}
        >
          <motion.div
            key={`${space}`}
            initial={{ y: 0 }}
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <CamelIcon
              color={color}
              flip={isCrazy(color) !== (space >= 10 && space <= 13)}
              stackIndex={k}
              stackSize={stackSize}
            />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
