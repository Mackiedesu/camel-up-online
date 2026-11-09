/** Number of spaces on the race track. The finish line is right after this space. */
export const TRACK_LENGTH = 16;
/** Internal track array size (index = space number, index 0 unused, extra room past the finish). */
export const TRACK_ARRAY_SIZE = TRACK_LENGTH + 6;

export const RACING_CAMELS = ['red', 'yellow', 'blue', 'green', 'purple'] as const;
export const CRAZY_CAMELS = ['black', 'white'] as const;

/** Leg betting tiles per colour, taken in this order. */
export const LEG_BET_VALUES = [5, 3, 2, 2];
/** Payout for correct overall winner/loser bets, in order of placement. Later correct bets get 1. */
export const FINAL_PAYOUTS = [8, 5, 3, 2, 1];
export const FINAL_WRONG_PENALTY = -1;

export const STARTING_COINS = 3;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
/** Dice rolled per leg (6 dice in pyramid, the last one stays inside). */
export const DICE_PER_LEG = 5;
/** Default turn duration in seconds when the turn timer is enabled. */
export const TURN_TIME_SECONDS = 30;

/**
 * Rule switches for details that may differ between rulebook printings / house rules.
 * Adjust here after checking against the official rulebook.
 */
export const RULES = {
  /** When one crazy camel sits directly on the other, which one moves on a grey roll. */
  stackedCrazyMoves: 'top' as 'top' | 'bottom',
  /** Crazy camels moving backwards past space 1 wrap around to space 16. */
  crazyWrap: true,
};

export const CAMEL_HEX: Record<string, string> = {
  red: '#e5484d',
  yellow: '#f5d90a',
  blue: '#3e8ef7',
  green: '#30a46c',
  purple: '#8e4ec6',
  black: '#2b2b2b',
  white: '#f4f4f4',
};

export const CAMEL_NAME_VI: Record<string, string> = {
  red: 'Đỏ',
  yellow: 'Vàng',
  blue: 'Xanh dương',
  green: 'Xanh lá',
  purple: 'Tím',
  black: 'Đen',
  white: 'Trắng',
  grey: 'Xám',
};
