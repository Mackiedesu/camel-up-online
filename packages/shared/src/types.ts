import type { CRAZY_CAMELS, RACING_CAMELS } from './constants';

export type RacingColor = (typeof RACING_CAMELS)[number];
export type CrazyColor = (typeof CRAZY_CAMELS)[number];
export type CamelColor = RacingColor | CrazyColor;
export type DieId = RacingColor | 'grey';

export interface LegBet {
  color: RacingColor;
  value: number;
}

export interface SpectatorTile {
  space: number;
  /** +1 = cheering (oasis), -1 = booing (mirage) */
  side: 1 | -1;
}

export interface PlayerState {
  id: string;
  name: string;
  coins: number;
  legBets: LegBet[];
  pyramidTickets: number;
  spectator: SpectatorTile | null;
  /** Colours of finish cards already used. Hidden from other players until game end. */
  usedFinalCards: RacingColor[];
}

export interface FinalBet {
  playerId: string;
  /** null when hidden from the viewer */
  color: RacingColor | null;
}

export interface RollResult {
  die: DieId;
  value: number;
  /** Colour shown on the grey die */
  crazyColor?: CrazyColor;
  /** Camel that actually moved (may differ from crazyColor due to special rules) */
  movedCamel: CamelColor;
}

export interface GameState {
  phase: 'playing' | 'finished';
  players: PlayerState[];
  currentPlayerIndex: number;
  leg: number;
  turn: number;
  /** track[space] = stack of camels, bottom first. Index 0 unused. */
  track: CamelColor[][];
  /** Remaining leg bet values per colour; next available is index 0. */
  legBetStacks: Record<RacingColor, number[]>;
  /** Dice still inside the pyramid. */
  pyramid: DieId[];
  /** Dice rolled during the current leg. */
  rolledDice: RollResult[];
  finalWinnerBets: FinalBet[];
  finalLoserBets: FinalBet[];
  result?: GameResult;
}

export interface GameResult {
  ranking: RacingColor[];
  winnerCamel: RacingColor;
  loserCamel: RacingColor;
  finalDeltas: Record<string, number>;
  winners: string[];
}

export type GameAction =
  | { type: 'takeLegBet'; color: RacingColor }
  | { type: 'placeSpectator'; space: number; side: 1 | -1 }
  | { type: 'rollDie' }
  | { type: 'finalBet'; color: RacingColor; kind: 'winner' | 'loser' };

export type GameEvent =
  | { type: 'dieRolled'; playerId: string; roll: RollResult }
  | {
      type: 'camelMoved';
      camels: CamelColor[];
      from: number;
      to: number;
      path: number[];
      under: boolean;
      spectatorOwner?: string;
    }
  | { type: 'legBetTaken'; playerId: string; color: RacingColor; value: number }
  | { type: 'spectatorPlaced'; playerId: string; space: number; side: 1 | -1 }
  | { type: 'finalBetPlaced'; playerId: string; kind: 'winner' | 'loser' }
  | { type: 'legScored'; leg: number; ranking: RacingColor[]; deltas: Record<string, number> }
  | ({ type: 'gameOver' } & GameResult);

/* ---------- Room / network types ---------- */

export interface RoomPlayerView {
  id: string;
  name: string;
  connected: boolean;
}

export interface RoomView {
  code: string;
  hostId: string;
  players: RoomPlayerView[];
  status: 'lobby' | 'playing' | 'finished';
}

export interface RoomStatePayload {
  room: RoomView;
  game: GameState | null;
}

export type Ack<T = {}> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;
