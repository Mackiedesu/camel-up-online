import {
  CRAZY_CAMELS,
  DICE_PER_LEG,
  FINAL_PAYOUTS,
  FINAL_WRONG_PENALTY,
  LEG_BET_VALUES,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RACING_CAMELS,
  RULES,
  STARTING_COINS,
  TRACK_ARRAY_SIZE,
  TRACK_LENGTH,
} from './constants';
import type {
  CamelColor,
  CrazyColor,
  DieId,
  GameAction,
  GameEvent,
  GameResult,
  GameState,
  PlayerState,
  RacingColor,
  RollResult,
} from './types';

export type Rng = () => number;

export class GameError extends Error {}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const isRacing = (c: CamelColor): c is RacingColor =>
  (RACING_CAMELS as readonly string[]).includes(c);
export const isCrazy = (c: CamelColor): c is CrazyColor =>
  (CRAZY_CAMELS as readonly string[]).includes(c);

const rollValue = (rng: Rng) => 1 + Math.floor(rng() * 3);

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const allDice = (): DieId[] => [...RACING_CAMELS, 'grey'];

const freshLegBetStacks = (): Record<RacingColor, number[]> =>
  Object.fromEntries(RACING_CAMELS.map((c) => [c, [...LEG_BET_VALUES]])) as Record<
    RacingColor,
    number[]
  >;

/** Wrap a space index for crazy camels moving around the loop. */
function wrapSpace(space: number): number {
  if (!RULES.crazyWrap) return Math.max(1, Math.min(TRACK_LENGTH, space));
  return ((((space - 1) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH) + 1;
}

export function findCamel(track: CamelColor[][], camel: CamelColor): { space: number; index: number } {
  for (let space = 0; space < track.length; space++) {
    const index = track[space].indexOf(camel);
    if (index >= 0) return { space, index };
  }
  throw new GameError(`Camel ${camel} not on track`);
}

/** Racing camels ordered from first to last place. Space 0 holds camels carried counterclockwise past space 1 (least advanced). */
export function getRanking(track: CamelColor[][]): RacingColor[] {
  const out: RacingColor[] = [];
  for (let space = track.length - 1; space >= 0; space--) {
    const stack = track[space];
    for (let i = stack.length - 1; i >= 0; i--) {
      const c = stack[i];
      if (isRacing(c)) out.push(c);
    }
  }
  return out;
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex];
}

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

export function createGame(players: { id: string; name: string }[], rng: Rng = Math.random): GameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new GameError(`Cần ${MIN_PLAYERS}-${MAX_PLAYERS} người chơi`);
  }
  const track: CamelColor[][] = Array.from({ length: TRACK_ARRAY_SIZE }, () => []);

  // Racing camels: roll each die in random order, place on space 1-3 (later ones stack on top).
  for (const c of shuffle([...RACING_CAMELS], rng)) {
    track[rollValue(rng)].push(c);
  }
  // Crazy camels: placed on 16/15/14 according to the grey die.
  const firstCrazy: CrazyColor = rng() < 0.5 ? 'black' : 'white';
  const secondCrazy: CrazyColor = firstCrazy === 'black' ? 'white' : 'black';
  track[TRACK_LENGTH + 1 - rollValue(rng)].push(firstCrazy);
  track[TRACK_LENGTH + 1 - rollValue(rng)].push(secondCrazy);

  const startIdx = Math.floor(rng() * players.length);
  return {
    phase: 'playing',
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      coins: STARTING_COINS,
      legBets: [],
      pyramidTickets: 0,
      spectator: null,
      partnerId: null,
      usedFinalCards: [],
    })),
    currentPlayerIndex: startIdx,
    startingPlayerIndex: startIdx,
    leg: 1,
    turn: 1,
    track,
    legBetStacks: freshLegBetStacks(),
    pyramid: allDice(),
    rolledDice: [],
    finalWinnerBets: [],
    finalLoserBets: [],
  };
}

/* ------------------------------------------------------------------ */
/* Validation helpers (also used by the client for UI hints)           */
/* ------------------------------------------------------------------ */

export function canPlaceSpectator(state: GameState, playerId: string, space: number): boolean {
  if (!Number.isInteger(space) || space < 2 || space > TRACK_LENGTH) return false;
  if (state.track[space].length > 0) return false;
  for (const p of state.players) {
    if (!p.spectator) continue;
    if (p.id === playerId) {
      // Rulebook: may move an already-placed tile to a *different* space
      if (p.spectator.space === space) return false;
      continue;
    }
    if (Math.abs(p.spectator.space - space) <= 1) return false;
  }
  return true;
}

/** Decide which crazy camel moves for a grey roll showing `rolled`. */
export function chooseCrazyCamel(track: CamelColor[][], rolled: CrazyColor): CrazyColor {
  const info = CRAZY_CAMELS.map((c) => {
    const { space, index } = findCamel(track, c);
    return { c, above: track[space][index + 1] as CamelColor | undefined };
  });
  const carrying = info.filter((i) => i.above && isRacing(i.above));
  if (carrying.length === 1) return carrying[0].c;
  for (const i of info) {
    if (i.above && isCrazy(i.above)) {
      // i.c is bottom, i.above is top
      return RULES.stackedCrazyMoves === 'top' ? i.above : i.c;
    }
  }
  return rolled;
}

/* ------------------------------------------------------------------ */
/* Movement                                                            */
/* ------------------------------------------------------------------ */

/** Moves `camel` and everything on top of it. Returns true if a racing camel crossed the finish. */
function moveUnit(
  state: GameState,
  camel: CamelColor,
  steps: number,
  dir: 1 | -1,
  events: GameEvent[],
): boolean {
  const { space: from, index } = findCamel(state.track, camel);
  const unit = state.track[from].splice(index);
  const hasRacing = unit.some(isRacing);
  const path: number[] = [];
  let pos = from;
  let crossedCounterclockwise = false;

  for (let i = 0; i < steps; i++) {
    if (dir > 0) {
      pos = pos + 1;
    } else if (hasRacing && pos - 1 < 1) {
      // Crazy camel carrying racing camel(s) across the finish line counterclockwise
      pos = 0;
      crossedCounterclockwise = true;
    } else {
      pos = wrapSpace(pos - 1);
    }
    path.push(pos);
  }

  let under = false;
  let spectatorOwner: string | undefined;
  if (pos >= 1 && pos <= TRACK_LENGTH) {
    const owner = state.players.find((p) => p.spectator?.space === pos);
    if (owner && owner.spectator) {
      owner.coins += 1;
      spectatorOwner = owner.id;
      const side = owner.spectator.side;
      const nextPos = pos + side * dir;
      if (dir < 0) {
        if (hasRacing && nextPos < 1) {
          pos = 0;
          crossedCounterclockwise = true;
        } else {
          pos = wrapSpace(nextPos);
        }
      } else {
        pos = nextPos;
      }
      path.push(pos);
      under = side === -1;
    }
  }

  if (under) state.track[pos].unshift(...unit);
  else state.track[pos].push(...unit);

  events.push({ type: 'camelMoved', camels: unit, from, to: pos, path, under, spectatorOwner });

  return (dir > 0 && pos > TRACK_LENGTH && hasRacing) || (crossedCounterclockwise && hasRacing);
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

function ticketReward(color: RacingColor, value: number, ranking: RacingColor[]): number {
  if (color === ranking[0]) return value;
  if (color === ranking[1]) return 1;
  return -1;
}

/** Highest positive single ticket reward (betting ticket or pyramid ticket) held by `p`. */
function bestPartnerTicketReward(p: PlayerState, ranking: RacingColor[]): number {
  let best = p.pyramidTickets > 0 ? 1 : 0;
  for (const bet of p.legBets) {
    const r = ticketReward(bet.color, bet.value, ranking);
    if (r > best) best = r;
  }
  return best;
}

function scoreLeg(state: GameState, events: GameEvent[]) {
  const ranking = getRanking(state.track);
  const deltas: Record<string, number> = {};
  const partnerBonusByPlayer: Record<string, number> = {};

  for (const p of state.players) {
    if (p.partnerId) {
      const partner = state.players.find((x) => x.id === p.partnerId);
      if (partner) {
        partnerBonusByPlayer[p.id] = bestPartnerTicketReward(partner, ranking);
      }
    }
  }

  for (const p of state.players) {
    let d = p.pyramidTickets + (partnerBonusByPlayer[p.id] ?? 0);
    for (const bet of p.legBets) {
      d += ticketReward(bet.color, bet.value, ranking);
    }
    const before = p.coins;
    p.coins = Math.max(0, p.coins + d);
    deltas[p.id] = p.coins - before;
    p.legBets = [];
    p.pyramidTickets = 0;
    p.spectator = null;
    p.partnerId = null;
  }
  events.push({ type: 'legScored', leg: state.leg, ranking, deltas });
}

function startNewLeg(state: GameState, nextStartingPlayerIndex: number) {
  state.leg += 1;
  state.startingPlayerIndex = nextStartingPlayerIndex;
  state.legBetStacks = freshLegBetStacks();
  state.pyramid = allDice();
  state.rolledDice = [];
}

function scoreFinal(state: GameState, events: GameEvent[]) {
  const ranking = getRanking(state.track);
  const winnerCamel = ranking[0];
  const loserCamel = ranking[ranking.length - 1];
  const deltas: Record<string, number> = Object.fromEntries(state.players.map((p) => [p.id, 0]));

  const settle = (bets: GameState['finalWinnerBets'], target: RacingColor) => {
    let k = 0;
    for (const bet of bets) {
      const p = state.players.find((x) => x.id === bet.playerId)!;
      const before = p.coins;
      if (bet.color === target) {
        p.coins += FINAL_PAYOUTS[k] ?? 1;
        k++;
      } else {
        p.coins = Math.max(0, p.coins + FINAL_WRONG_PENALTY);
      }
      deltas[p.id] += p.coins - before;
    }
  };
  settle(state.finalWinnerBets, winnerCamel);
  settle(state.finalLoserBets, loserCamel);

  const max = Math.max(...state.players.map((p) => p.coins));
  const result: GameResult = {
    ranking,
    winnerCamel,
    loserCamel,
    finalDeltas: deltas,
    winners: state.players.filter((p) => p.coins === max).map((p) => p.id),
  };
  state.result = result;
  state.phase = 'finished';
  events.push({ type: 'gameOver', ...result });
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export function applyAction(
  prev: GameState,
  playerId: string,
  action: GameAction,
  rng: Rng = Math.random,
): { state: GameState; events: GameEvent[] } {
  if (prev.phase !== 'playing') throw new GameError('Ván đã kết thúc');
  if (currentPlayer(prev).id !== playerId) throw new GameError('Chưa tới lượt bạn');

  const state: GameState = structuredClone(prev);
  const p = currentPlayer(state);
  const events: GameEvent[] = [];

  switch (action.type) {
    case 'takeLegBet': {
      if (!RACING_CAMELS.includes(action.color)) throw new GameError('Màu không hợp lệ');
      const stack = state.legBetStacks[action.color];
      if (stack.length === 0) throw new GameError('Hết thẻ cược cho màu này');
      const value = stack.shift()!;
      p.legBets.push({ color: action.color, value });
      events.push({ type: 'legBetTaken', playerId, color: action.color, value });
      break;
    }

    case 'placeSpectator': {
      if (action.side !== 1 && action.side !== -1) throw new GameError('Mặt thẻ không hợp lệ');
      if (!canPlaceSpectator(state, playerId, action.space)) {
        throw new GameError('Không thể đặt thẻ khán giả ở ô này');
      }
      p.spectator = { space: action.space, side: action.side };
      events.push({ type: 'spectatorPlaced', playerId, space: action.space, side: action.side });
      break;
    }

    case 'finalBet': {
      if (!RACING_CAMELS.includes(action.color)) throw new GameError('Màu không hợp lệ');
      if (action.kind !== 'winner' && action.kind !== 'loser') throw new GameError('Loại cược không hợp lệ');
      if (p.usedFinalCards.includes(action.color)) throw new GameError('Bạn đã dùng thẻ màu này');
      p.usedFinalCards.push(action.color);
      const bet = { playerId, color: action.color };
      (action.kind === 'winner' ? state.finalWinnerBets : state.finalLoserBets).push(bet);
      events.push({ type: 'finalBetPlaced', playerId, kind: action.kind });
      break;
    }

    case 'formPartnership': {
      if (state.players.length < 6) {
        throw new GameError('Liên minh cá cược chỉ áp dụng cho bàn từ 6–8 người chơi');
      }
      if (p.partnerId) throw new GameError('Bạn đã có liên minh trong chặng này');
      if (action.partnerId === playerId) throw new GameError('Không thể tự liên minh với chính mình');
      const partner = state.players.find((x) => x.id === action.partnerId);
      if (!partner) throw new GameError('Không tìm thấy người chơi này');
      if (partner.partnerId) throw new GameError('Người chơi này đã có liên minh trong chặng này');
      p.partnerId = partner.id;
      partner.partnerId = p.id;
      events.push({ type: 'partnershipFormed', playerId, partnerId: partner.id });
      break;
    }

    case 'rollDie': {
      if (state.pyramid.length === 0) throw new GameError('Kim tự tháp trống');
      p.pyramidTickets += 1;
      const die = state.pyramid.splice(Math.floor(rng() * state.pyramid.length), 1)[0];
      const value = rollValue(rng);
      let roll: RollResult;
      let finished: boolean;
      if (die === 'grey') {
        const crazyColor: CrazyColor = rng() < 0.5 ? 'black' : 'white';
        const mover = chooseCrazyCamel(state.track, crazyColor);
        roll = { die, value, crazyColor, movedCamel: mover };
        state.rolledDice.push(roll);
        events.push({ type: 'dieRolled', playerId, roll });
        finished = moveUnit(state, mover, value, -1, events);
      } else {
        roll = { die, value, movedCamel: die };
        state.rolledDice.push(roll);
        events.push({ type: 'dieRolled', playerId, roll });
        finished = moveUnit(state, die, value, 1, events);
      }

      if (finished) {
        scoreLeg(state, events);
        scoreFinal(state, events);
        return { state, events };
      }
      if (state.rolledDice.length >= DICE_PER_LEG) {
        const nextStarter = (state.currentPlayerIndex + 1) % state.players.length;
        scoreLeg(state, events);
        startNewLeg(state, nextStarter);
      }
      break;
    }

    default:
      throw new GameError('Hành động không hợp lệ');
  }

  state.turn += 1;
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  return { state, events };
}

/* ------------------------------------------------------------------ */
/* Hidden information                                                  */
/* ------------------------------------------------------------------ */

/** Returns a copy of the state with other players' secret info hidden. */
export function redactFor(state: GameState, viewerId: string): GameState {
  if (state.phase === 'finished') return state;
  const s: GameState = structuredClone(state);
  const hide = (b: GameState['finalWinnerBets'][number]) =>
    b.playerId === viewerId ? b : { playerId: b.playerId, color: null };
  s.finalWinnerBets = s.finalWinnerBets.map(hide);
  s.finalLoserBets = s.finalLoserBets.map(hide);
  for (const p of s.players) {
    if (p.id !== viewerId) p.usedFinalCards = [];
  }
  return s;
}

/** Number of finish cards a player has used (works on redacted state too). */
export function finalBetCount(state: GameState, playerId: string): number {
  return (
    state.finalWinnerBets.filter((b) => b.playerId === playerId).length +
    state.finalLoserBets.filter((b) => b.playerId === playerId).length
  );
}
