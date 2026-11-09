import { describe, expect, it } from 'vitest';
import {
  applyAction,
  canPlaceSpectator,
  chooseCrazyCamel,
  createGame,
  getRanking,
  redactFor,
} from './engine';
import { TRACK_ARRAY_SIZE } from './constants';
import type { CamelColor, DieId, GameState } from './types';

const players = [
  { id: 'a', name: 'An' },
  { id: 'b', name: 'Bình' },
  { id: 'c', name: 'Chi' },
];

/** RNG that returns the given values in order (then 0). */
const seq = (...vals: number[]) => {
  let i = 0;
  return () => (i < vals.length ? vals[i++] : 0);
};
/** rng value that makes rollValue() return n (1..3) */
const v = (n: number) => (n - 1) / 3 + 0.01;

function makeState(layout: Record<number, CamelColor[]>, pyramid?: DieId[]): GameState {
  const s = createGame(players, seq());
  s.track = Array.from({ length: TRACK_ARRAY_SIZE }, (_, i) => [...(layout[i] ?? [])]);
  s.currentPlayerIndex = 0;
  if (pyramid) s.pyramid = pyramid;
  return s;
}

describe('setup', () => {
  it('places 5 racing camels on 1-3 and crazy camels on 14-16', () => {
    for (let k = 0; k < 20; k++) {
      const s = createGame(players);
      const racing = getRanking(s.track);
      expect(racing).toHaveLength(5);
      s.track.forEach((stack, space) => {
        for (const c of stack) {
          if (c === 'black' || c === 'white') expect(space).toBeGreaterThanOrEqual(14);
          else expect(space).toBeLessThanOrEqual(3);
        }
      });
      expect(s.players.every((p) => p.coins === 3)).toBe(true);
    }
  });

  it('rejects wrong player counts', () => {
    expect(() => createGame([players[0]])).toThrow();
    expect(() => createGame(Array.from({ length: 9 }, (_, i) => ({ id: `${i}`, name: `${i}` })))).toThrow();
  });
});

describe('movement & stacking', () => {
  it('moves a camel together with camels above it, landing on top', () => {
    const s = makeState({ 1: ['red', 'blue', 'green'], 3: ['yellow'], 14: ['black'], 15: ['white'], 2: ['purple'] }, ['blue']);
    // pick die idx 0, value 2
    const { state } = applyAction(s, 'a', { type: 'rollDie' }, seq(0, v(2)));
    expect(state.track[1]).toEqual(['red']);
    expect(state.track[3]).toEqual(['yellow', 'blue', 'green']);
    expect(state.players[0].pyramidTickets).toBe(1);
    expect(state.currentPlayerIndex).toBe(1);
  });

  it('ranking: higher space first, top of stack first', () => {
    const s = makeState({ 2: ['red', 'blue'], 5: ['green'], 1: ['yellow', 'purple'] });
    expect(getRanking(s.track)).toEqual(['green', 'blue', 'red', 'purple', 'yellow']);
  });

  it('cheering spectator tile: +1 space, owner earns a coin', () => {
    const s = makeState({ 1: ['red'], 2: ['blue', 'green', 'yellow', 'purple'], 14: ['black'], 15: ['white'] }, ['red']);
    s.players[1].spectator = { space: 3, side: 1 };
    const { state, events } = applyAction(s, 'a', { type: 'rollDie' }, seq(0, v(2)));
    expect(state.track[4]).toEqual(['red']);
    expect(state.players[1].coins).toBe(4);
    expect(events.find((e) => e.type === 'camelMoved')).toMatchObject({ spectatorOwner: 'b', to: 4 });
  });

  it('booing spectator tile: -1 space and goes UNDER the stack', () => {
    const s = makeState({ 1: ['red'], 2: ['blue'], 5: ['green', 'yellow', 'purple'], 14: ['black'], 15: ['white'] }, ['red']);
    s.players[2].spectator = { space: 3, side: -1 };
    const { state } = applyAction(s, 'a', { type: 'rollDie' }, seq(0, v(2)));
    expect(state.track[2]).toEqual(['red', 'blue']);
    expect(state.players[2].coins).toBe(4);
  });

  it('crazy camel moves backwards and carries camels on top', () => {
    const s = makeState({ 1: ['purple'], 10: ['black', 'red'], 12: ['white'], 2: ['blue', 'green', 'yellow'] }, ['grey']);
    // die idx 0 (grey), value 3, colour white (rng>=.5) -> but black carries red => black moves
    const { state, events } = applyAction(s, 'a', { type: 'rollDie' }, seq(0, v(3), 0.9));
    expect(state.track[7]).toEqual(['black', 'red']);
    expect(state.track[12]).toEqual(['white']);
    expect(events[0]).toMatchObject({ type: 'dieRolled', roll: { crazyColor: 'white', movedCamel: 'black' } });
  });

  it('crazy camel wraps from space 1 to 16', () => {
    const s = makeState({ 1: ['black'], 8: ['white'], 2: ['red', 'blue', 'green', 'yellow', 'purple'] }, ['grey']);
    const { state } = applyAction(s, 'a', { type: 'rollDie' }, seq(0, v(2), 0.1));
    expect(state.track[15]).toEqual(['black']);
  });
});

describe('chooseCrazyCamel', () => {
  it('uses rolled colour when neither carries a racing camel', () => {
    const s = makeState({ 10: ['black'], 12: ['white'] });
    expect(chooseCrazyCamel(s.track, 'white')).toBe('white');
  });
  it('moves the one carrying a racing camel', () => {
    const s = makeState({ 10: ['black'], 12: ['white', 'red'] });
    expect(chooseCrazyCamel(s.track, 'black')).toBe('white');
  });
  it('uses rolled colour when both carry racing camels', () => {
    const s = makeState({ 10: ['black', 'blue'], 12: ['white', 'red'] });
    expect(chooseCrazyCamel(s.track, 'black')).toBe('black');
  });
  it('moves the top one when stacked directly', () => {
    const s = makeState({ 10: ['black', 'white'] });
    expect(chooseCrazyCamel(s.track, 'black')).toBe('white');
  });
});

describe('spectator placement', () => {
  it('validates spaces', () => {
    const s = makeState({ 1: ['red'], 5: ['blue'] });
    s.players[1].spectator = { space: 8, side: 1 };
    expect(canPlaceSpectator(s, 'a', 1)).toBe(false); // space 1
    expect(canPlaceSpectator(s, 'a', 5)).toBe(false); // has camel
    expect(canPlaceSpectator(s, 'a', 7)).toBe(false); // adjacent
    expect(canPlaceSpectator(s, 'a', 8)).toBe(false); // occupied
    expect(canPlaceSpectator(s, 'a', 10)).toBe(true);
    expect(canPlaceSpectator(s, 'b', 9)).toBe(true); // own tile may move
  });
});

describe('leg scoring', () => {
  it('scores leg bets and tickets after 5 dice, then resets', () => {
    const s = makeState({ 1: ['red'], 2: ['blue'], 3: ['green'], 4: ['yellow'], 5: ['purple'], 14: ['black'], 15: ['white'] });
    s.players[0].legBets = [{ color: 'purple', value: 5 }, { color: 'red', value: 3 }];
    s.players[1].legBets = [{ color: 'yellow', value: 5 }];
    s.players[2].pyramidTickets = 0;
    s.rolledDice = [1, 2, 3, 4].map(() => ({ die: 'grey' as const, value: 1, movedCamel: 'black' as const }));
    s.pyramid = ['blue', 'grey'];
    s.currentPlayerIndex = 2;
    // rolls blue +1 -> space 3 on top of green. ranking: purple, yellow, blue, green, red
    const { state, events } = applyAction(s, 'c', { type: 'rollDie' }, seq(0, v(1)));
    const scored = events.find((e) => e.type === 'legScored');
    expect(scored).toBeTruthy();
    expect(state.players[0].coins).toBe(3 + 5 - 1);
    expect(state.players[1].coins).toBe(3 + 1);
    expect(state.players[2].coins).toBe(3 + 1);
    expect(state.leg).toBe(2);
    expect(state.pyramid).toHaveLength(6);
    expect(state.players.every((p) => p.legBets.length === 0 && p.spectator === null)).toBe(true);
  });

  it('coins never go below zero', () => {
    const s = makeState({ 1: ['red'], 2: ['blue'], 3: ['green'], 4: ['yellow'], 5: ['purple'], 14: ['black'], 15: ['white'] });
    s.players[1].coins = 0;
    s.players[1].legBets = [{ color: 'red', value: 5 }, { color: 'blue', value: 5 }];
    s.rolledDice = [1, 2, 3, 4].map(() => ({ die: 'grey' as const, value: 1, movedCamel: 'black' as const }));
    s.pyramid = ['green'];
    const { state } = applyAction(s, 'a', { type: 'rollDie' }, seq(0, v(1)));
    expect(state.players[1].coins).toBe(0);
  });
});

describe('leg bets', () => {
  it('takes tiles 5,3,2,2 then runs out', () => {
    let s = makeState({ 1: ['red'] });
    const taken: number[] = [];
    for (let i = 0; i < 4; i++) {
      const pid = s.players[s.currentPlayerIndex].id;
      const r = applyAction(s, pid, { type: 'takeLegBet', color: 'red' });
      s = r.state;
      const e = r.events[0];
      if (e.type === 'legBetTaken') taken.push(e.value);
    }
    expect(taken).toEqual([5, 3, 2, 2]);
    const pid = s.players[s.currentPlayerIndex].id;
    expect(() => applyAction(s, pid, { type: 'takeLegBet', color: 'red' })).toThrow();
  });

  it('rejects actions out of turn', () => {
    const s = makeState({ 1: ['red'] });
    expect(() => applyAction(s, 'b', { type: 'rollDie' })).toThrow();
  });
});

describe('game end', () => {
  it('ends when a racing camel crosses the finish and settles final bets', () => {
    const s = makeState({ 15: ['blue', 'red'], 10: ['green'], 2: ['yellow'], 1: ['purple'], 8: ['black'], 6: ['white'] }, ['blue']);
    s.finalWinnerBets = [
      { playerId: 'b', color: 'red' },
      { playerId: 'c', color: 'green' },
      { playerId: 'a', color: 'red' },
    ];
    s.finalLoserBets = [{ playerId: 'c', color: 'purple' }];
    const { state, events } = applyAction(s, 'a', { type: 'rollDie' }, seq(0, v(2)));
    expect(state.phase).toBe('finished');
    expect(state.result?.winnerCamel).toBe('red');
    expect(state.result?.loserCamel).toBe('purple');
    // a: +1 ticket +8? no: b was first correct (8), a second correct (5)
    expect(state.players[1].coins).toBe(3 + 8);
    expect(state.players[0].coins).toBe(3 + 1 + 5);
    expect(state.players[2].coins).toBe(3 - 1 + 8);
    expect(events.at(-1)?.type).toBe('gameOver');
  });
});

describe('redaction', () => {
  it('hides other players final bet colours', () => {
    const s = makeState({ 1: ['red'] });
    s.finalWinnerBets = [{ playerId: 'a', color: 'red' }, { playerId: 'b', color: 'blue' }];
    s.players[1].usedFinalCards = ['blue'];
    const r = redactFor(s, 'a');
    expect(r.finalWinnerBets[0].color).toBe('red');
    expect(r.finalWinnerBets[1].color).toBeNull();
    expect(r.players[1].usedFinalCards).toEqual([]);
  });
});
