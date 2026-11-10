import { useSyncExternalStore } from 'react';
import { io } from 'socket.io-client';
import {
  CAMEL_NAME_VI,
  type GameAction,
  type GameEvent,
  type GameState,
  type RollResult,
  type RoomStatePayload,
  type RoomView,
} from '@camelup/shared';
import { sfx } from './sound';
import {
  initDiscordActivity,
  safeLocalGet,
  safeLocalSet,
  safeSessionGet,
  safeSessionRemove,
  safeSessionSet,
} from './discord';

export const discord = initDiscordActivity();

/* ---------- Identity (per tab, survives refresh) ---------- */
function getPlayerId(): string {
  let id = safeSessionGet('camelup.playerId');
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    safeSessionSet('camelup.playerId', id);
  }
  return id;
}

export interface LogEntry {
  id: number;
  text: string;
}
export interface Toast {
  id: number;
  kind: 'error' | 'info' | 'leg';
  text: string;
  lines?: string[];
}

export interface AppState {
  connected: boolean;
  playerId: string;
  name: string;
  room: RoomView | null;
  game: GameState | null;
  log: LogEntry[];
  lastRoll: { roll: RollResult; playerId: string; key: number } | null;
  toasts: Toast[];
  showRules: boolean;
  showSettings: boolean;
  turnTimerPref: boolean;
}

let state: AppState = {
  connected: false,
  playerId: getPlayerId(),
  name: safeLocalGet('camelup.name') ?? '',
  room: null,
  game: null,
  log: [],
  lastRoll: null,
  toasts: [],
  showRules: false,
  showSettings: false,
  turnTimerPref: safeLocalGet('camelup.turnTimer') !== '0',
};

const listeners = new Set<() => void>();
function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export const getState = () => state;
export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
  );
}

let seq = 1;
export function pushToast(t: Omit<Toast, 'id'>, ms = 3500) {
  const toast = { ...t, id: seq++ };
  // Only one leg-summary toast at a time
  const keep = t.kind === 'leg' ? state.toasts.filter((x) => x.kind !== 'leg') : state.toasts;
  set({ toasts: [...keep, toast] });
  setTimeout(() => set({ toasts: state.toasts.filter((x) => x.id !== toast.id) }), ms);
}

/* ---------- Event formatting ---------- */
const nameOf = (id: string) =>
  state.game?.players.find((p) => p.id === id)?.name ??
  state.room?.players.find((p) => p.id === id)?.name ??
  '?';
const cn = (c: string) => CAMEL_NAME_VI[c] ?? c;
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function formatEvent(e: GameEvent): string {
  switch (e.type) {
    case 'dieRolled': {
      const r = e.roll;
      if (r.die === 'grey') {
        const extra = r.movedCamel !== r.crazyColor ? ` → lạc đà ${cn(r.movedCamel)} đi do luật đặc biệt` : '';
        return `🎲 ${nameOf(e.playerId)} lắc ra xúc xắc xám: ${cn(r.crazyColor!)} ${r.value}${extra}`;
      }
      return `🎲 ${nameOf(e.playerId)} lắc ra ${cn(r.die)} ${r.value}`;
    }
    case 'camelMoved': {
      const who = e.camels.map(cn).join(', ');
      const spec = e.spectatorOwner
        ? ` (gặp thẻ khán giả của ${nameOf(e.spectatorOwner)} [+1 💰]${e.under ? ', chui xuống đáy chồng' : ', nhảy lên đỉnh chồng'})`
        : '';
      const dest = e.to > 16 ? 'VẠCH ĐÍCH 🏆' : e.to === 0 ? 'VẠCH ĐÍCH (ngược chiều) 🌀' : `ô ${e.to}`;
      return `🐪 ${who}: ô ${e.from} → ${dest}${spec}`;
    }
    case 'legBetTaken':
      return `🎟️ ${nameOf(e.playerId)} lấy vé cược chặng ${cn(e.color)} (hạng 1: +${e.value} 💰)`;
    case 'spectatorPlaced':
      return `📣 ${nameOf(e.playerId)} đặt thẻ khán giả ${e.side > 0 ? 'Cổ vũ (+1)' : 'La ó (−1)'} ở ô ${e.space}`;
    case 'finalBetPlaced':
      return `🃏 ${nameOf(e.playerId)} đặt thẻ cược ${e.kind === 'winner' ? 'VỀ NHẤT 🏆' : 'VỀ BÉT 🐢'} chung cuộc`;
    case 'partnershipFormed':
      return `🤝 ${nameOf(e.playerId)} lập Liên minh cá cược với ${nameOf(e.partnerId)}`;
    case 'turnTimedOut':
      return `⏱️ Hết 30s! Tự động lắc xúc xắc cho ${nameOf(e.playerId)}`;
    case 'legScored':
      return `🏁 Hết chặng ${e.leg}. Nhất: ${cn(e.ranking[0])}, Nhì: ${cn(e.ranking[1])}`;
    case 'gameOver':
      return `🏆 Kết thúc cuộc đua! ${cn(e.winnerCamel)} về nhất, ${cn(e.loserCamel)} về bét`;
  }
}

/* ---------- Socket ---------- */
export const socket = io({
  autoConnect: true,
  transports: discord.isEmbedded ? ['websocket'] : ['websocket', 'polling'],
  reconnectionDelay: 2000,
  reconnectionDelayMax: 6000,
});

let manualLeftDiscord = false;

socket.on('connect', () => {
  set({ connected: true });
  const code = safeSessionGet('camelup.room');
  if (code && state.name) {
    socket.emit('room:join', { code, playerId: state.playerId, name: state.name }, (res: any) => {
      if (!res.ok) safeSessionRemove('camelup.room');
    });
  } else if (discord.isEmbedded && discord.autoRoomCode && state.name.trim() && !manualLeftDiscord) {
    socket.emit(
      'room:joinOrCreate',
      {
        code: discord.autoRoomCode,
        playerId: state.playerId,
        name: state.name.trim(),
        turnTimerEnabled: state.turnTimerPref,
      },
      (res: any) => {
        if (res?.ok && res.code) rememberRoom(res.code);
      },
    );
  }
});
socket.on('disconnect', () => set({ connected: false }));

socket.on('room:state', (p: RoomStatePayload) => {
  const startedNew = p.game && (!state.game || p.game.turn < state.game.turn);
  const wasMyTurn =
    state.game?.phase === 'playing' &&
    state.game.players[state.game.currentPlayerIndex]?.id === state.playerId;
  const isMyTurn =
    p.game?.phase === 'playing' &&
    p.game.players[p.game.currentPlayerIndex]?.id === state.playerId;
  if (!wasMyTurn && isMyTurn) {
    setTimeout(() => sfx.play('turn'), 220);
  }
  set({
    room: p.room,
    game: p.game,
    ...(startedNew ? { log: [], lastRoll: null } : {}),
  });
});

socket.on('game:events', (events: GameEvent[]) => {
  const entries = events.map((e) => ({ id: seq++, text: formatEvent(e) }));
  const patch: Partial<AppState> = { log: [...entries.reverse(), ...state.log].slice(0, 60) };
  if (!events.some((e) => e.type === 'dieRolled') && state.game?.rolledDice.length === 0) {
    patch.lastRoll = null;
  }
  const gameOver = events.some((e) => e.type === 'gameOver');
  for (const e of events) {
    if (e.type === 'dieRolled') {
      patch.lastRoll = { roll: e.roll, playerId: e.playerId, key: seq++ };
      sfx.play('roll');
    }
    if (e.type === 'camelMoved') {
      setTimeout(() => sfx.play('step', e.path.length), 180);
      if (e.spectatorOwner) {
        setTimeout(() => sfx.play(e.under ? 'mirage' : 'oasis'), 380);
      }
    }
    if (e.type === 'legBetTaken' || e.type === 'finalBetPlaced' || e.type === 'partnershipFormed') {
      sfx.play('bet');
    }
    if (e.type === 'spectatorPlaced') {
      sfx.play('spectator');
    }
    if (e.type === 'turnTimedOut') {
      pushToast({ kind: 'info', text: `⏱️ ${nameOf(e.playerId)} hết 30s — tự động lắc xúc xắc!` }, 3200);
    }
    if (e.type === 'legScored') {
      const clearKey = patch.lastRoll?.key ?? state.lastRoll?.key;
      setTimeout(() => {
        if (state.lastRoll?.key === clearKey) {
          set({ lastRoll: null });
        }
      }, 900);
      if (!gameOver) {
        const lines = Object.entries(e.deltas).map(([id, d]) => `${nameOf(id)}: ${signed(d)} 💰`);
        setTimeout(() => {
          sfx.play('legEnd');
          pushToast({ kind: 'leg', text: `Kết thúc chặng ${e.leg}`, lines }, 6000);
        }, 900);
      }
    }
    if (e.type === 'gameOver') {
      setTimeout(() => sfx.play('fanfare'), 650);
    }
  }
  set(patch);
});

/* ---------- Commands ---------- */
type Res = { ok: true; code?: string } | { ok: false; error: string };
function emit(event: string, payload?: unknown): Promise<Res> {
  return new Promise((resolve) => {
    socket.timeout(8000).emit(event, payload ?? {}, (err: Error | null, res: Res) => {
      if (err) res = { ok: false, error: 'Mất kết nối tới máy chủ' };
      if (!res.ok) {
        sfx.play('error');
        pushToast({ kind: 'error', text: res.error });
      }
      resolve(res);
    });
  });
}

function rememberRoom(code: string) {
  safeSessionSet('camelup.room', code);
  if (!discord.isEmbedded) {
    try {
      const url = new URL(location.href);
      url.searchParams.set('room', code);
      history.replaceState(null, '', url);
    } catch {
      // Ignore URL replace errors in embedded iframe
    }
  }
}

export function setName(name: string) {
  safeLocalSet('camelup.name', name);
  set({ name });
}

export function setShowRules(showRules: boolean) {
  sfx.play('click');
  set({ showRules });
}

export function setShowSettings(showSettings: boolean) {
  sfx.play('click');
  set({ showSettings });
}

export async function toggleTurnTimer() {
  sfx.play('click');
  const current = state.room ? state.room.turnTimerEnabled : state.turnTimerPref;
  const next = !current;
  safeLocalSet('camelup.turnTimer', next ? '1' : '0');
  set({ turnTimerPref: next });
  if (state.room) {
    await emit('room:setTimer', { enabled: next });
  }
}

export async function createRoom() {
  manualLeftDiscord = false;
  const res = await emit('room:create', {
    playerId: state.playerId,
    name: state.name,
    turnTimerEnabled: state.turnTimerPref,
  });
  if (res.ok && res.code) rememberRoom(res.code);
}

export async function joinRoom(code: string) {
  manualLeftDiscord = false;
  const res = await emit('room:join', { code, playerId: state.playerId, name: state.name });
  if (res.ok && res.code) rememberRoom(res.code);
}

export async function joinDiscordChannelRoom() {
  manualLeftDiscord = false;
  const code = discord.autoRoomCode ?? 'DISC1';
  const res = await emit('room:joinOrCreate', {
    code,
    playerId: state.playerId,
    name: state.name,
    turnTimerEnabled: state.turnTimerPref,
  });
  if (res.ok && res.code) rememberRoom(res.code);
}

export async function leaveRoom() {
  sfx.play('click');
  manualLeftDiscord = true;
  safeSessionRemove('camelup.room');
  if (!discord.isEmbedded) {
    try {
      const url = new URL(location.href);
      url.searchParams.delete('room');
      history.replaceState(null, '', url);
    } catch {
      // Ignore
    }
  }
  set({ room: null, game: null, log: [], lastRoll: null });
  socket.emit('room:leave', {});
}

export const startGame = () => emit('game:start');
export const backToLobby = () => emit('game:lobby');
export const endGameNow = () => emit('game:end');
export const toggleSpectateMode = () => emit('room:toggleSpectate');
export const sendAction = (a: GameAction) => emit('game:action', a);
