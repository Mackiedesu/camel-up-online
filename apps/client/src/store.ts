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

/* ---------- Identity (per tab, survives refresh) ---------- */
function getPlayerId(): string {
  let id = sessionStorage.getItem('camelup.playerId');
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('camelup.playerId', id);
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
}

let state: AppState = {
  connected: false,
  playerId: getPlayerId(),
  name: localStorage.getItem('camelup.name') ?? '',
  room: null,
  game: null,
  log: [],
  lastRoll: null,
  toasts: [],
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
        ? ` (gặp thẻ khán giả của ${nameOf(e.spectatorOwner)}${e.under ? ', chui xuống dưới' : ''})`
        : '';
      return `🐪 ${who}: ô ${e.from} → ${e.to > 16 ? 'ĐÍCH' : `ô ${e.to}`}${spec}`;
    }
    case 'legBetTaken':
      return `🎟️ ${nameOf(e.playerId)} cược chặng ${cn(e.color)} (${e.value})`;
    case 'spectatorPlaced':
      return `🌴 ${nameOf(e.playerId)} đặt ${e.side > 0 ? 'ốc đảo +1' : 'ảo ảnh −1'} ở ô ${e.space}`;
    case 'finalBetPlaced':
      return `🃏 ${nameOf(e.playerId)} cược ${e.kind === 'winner' ? 'THẮNG' : 'THUA'} chung cuộc`;
    case 'legScored':
      return `🏁 Hết chặng ${e.leg}. Nhất: ${cn(e.ranking[0])}, nhì: ${cn(e.ranking[1])}`;
    case 'gameOver':
      return `🏆 Kết thúc! ${cn(e.winnerCamel)} về nhất, ${cn(e.loserCamel)} về bét`;
  }
}

/* ---------- Socket ---------- */
export const socket = io({ autoConnect: true });

socket.on('connect', () => {
  set({ connected: true });
  const code = sessionStorage.getItem('camelup.room');
  if (code && state.name) {
    socket.emit('room:join', { code, playerId: state.playerId, name: state.name }, (res: any) => {
      if (!res.ok) sessionStorage.removeItem('camelup.room');
    });
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
    if (e.type === 'legBetTaken' || e.type === 'finalBetPlaced') {
      sfx.play('bet');
    }
    if (e.type === 'spectatorPlaced') {
      sfx.play('spectator');
    }
    if (e.type === 'legScored' && !gameOver) {
      const lines = Object.entries(e.deltas).map(([id, d]) => `${nameOf(id)}: ${signed(d)} 💰`);
      setTimeout(() => {
        sfx.play('legEnd');
        pushToast({ kind: 'leg', text: `Kết thúc chặng ${e.leg}`, lines }, 6000);
      }, 900);
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
  sessionStorage.setItem('camelup.room', code);
  const url = new URL(location.href);
  url.searchParams.set('room', code);
  history.replaceState(null, '', url);
}

export function setName(name: string) {
  localStorage.setItem('camelup.name', name);
  set({ name });
}

export async function createRoom() {
  const res = await emit('room:create', { playerId: state.playerId, name: state.name });
  if (res.ok && res.code) rememberRoom(res.code);
}

export async function joinRoom(code: string) {
  const res = await emit('room:join', { code, playerId: state.playerId, name: state.name });
  if (res.ok && res.code) rememberRoom(res.code);
}

export async function leaveRoom() {
  await emit('room:leave');
  sessionStorage.removeItem('camelup.room');
  const url = new URL(location.href);
  url.searchParams.delete('room');
  history.replaceState(null, '', url);
  set({ room: null, game: null, log: [], lastRoll: null });
}

export const startGame = () => emit('game:start');
export const backToLobby = () => emit('game:lobby');
export const sendAction = (a: GameAction) => emit('game:action', a);
