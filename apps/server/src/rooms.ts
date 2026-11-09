import {
  applyAction,
  createGame,
  GameError,
  MAX_PLAYERS,
  MIN_PLAYERS,
  TURN_TIME_SECONDS,
  type GameAction,
  type GameEvent,
  type GameState,
  type RoomView,
} from '@camelup/shared';

export interface RoomPlayer {
  id: string;
  name: string;
  socketId: string | null;
}

export interface Room {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  game: GameState | null;
  lastActivity: number;
  turnTimerEnabled: boolean;
  turnDeadline: number | null;
  timerHandle: ReturnType<typeof setTimeout> | null;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomError extends Error {}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private onTurnTimeout?: (room: Room, events: GameEvent[]) => void;

  constructor(onTurnTimeout?: (room: Room, events: GameEvent[]) => void) {
    this.onTurnTimeout = onTurnTimeout;
  }

  private clearTimer(room: Room) {
    if (room.timerHandle) {
      clearTimeout(room.timerHandle);
      room.timerHandle = null;
    }
    room.turnDeadline = null;
  }

  private syncTurnTimer(room: Room) {
    this.clearTimer(room);
    if (!room.game || room.game.phase !== 'playing' || !room.turnTimerEnabled) {
      return;
    }
    const ms = TURN_TIME_SECONDS * 1000;
    room.turnDeadline = Date.now() + ms;
    room.timerHandle = setTimeout(() => {
      room.timerHandle = null;
      if (!room.game || room.game.phase !== 'playing' || !room.turnTimerEnabled) return;
      const currentPlayerId = room.game.players[room.game.currentPlayerIndex]?.id;
      if (!currentPlayerId) return;
      try {
        const { state, events } = applyAction(room.game, currentPlayerId, { type: 'rollDie' });
        room.game = state;
        room.lastActivity = Date.now();
        this.syncTurnTimer(room);
        this.onTurnTimeout?.(room, [{ type: 'turnTimedOut', playerId: currentPlayerId }, ...events]);
      } catch (e) {
        console.error('Turn timeout auto-roll error:', e);
      }
    }, ms);
  }

  private newCode(): string {
    for (;;) {
      let code = '';
      for (let i = 0; i < 5; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      if (!this.rooms.has(code)) return code;
    }
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  create(playerId: string, name: string, socketId: string, turnTimerEnabled = true): Room {
    const room: Room = {
      code: this.newCode(),
      hostId: playerId,
      players: [{ id: playerId, name, socketId }],
      game: null,
      lastActivity: Date.now(),
      turnTimerEnabled,
      turnDeadline: null,
      timerHandle: null,
    };
    this.rooms.set(room.code, room);
    return room;
  }

  join(code: string, playerId: string, name: string, socketId: string): Room {
    const room = this.get(code);
    if (!room) throw new RoomError('Không tìm thấy phòng');
    room.lastActivity = Date.now();
    const existing = room.players.find((p) => p.id === playerId);
    if (existing) {
      // Rejoin (e.g. page refresh)
      existing.socketId = socketId;
      if (!room.game) existing.name = name;
      return room;
    }
    if (room.game) throw new RoomError('Ván đã bắt đầu');
    if (room.players.length >= MAX_PLAYERS) throw new RoomError(`Phòng đã đủ ${MAX_PLAYERS} người`);
    if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      throw new RoomError('Tên đã có người dùng trong phòng');
    }
    room.players.push({ id: playerId, name, socketId });
    return room;
  }

  /** Player explicitly leaves or disconnects. Returns the room if it still exists. */
  leave(code: string, playerId: string, explicit: boolean, socketId: string): Room | undefined {
    const room = this.get(code);
    if (!room) return undefined;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return room;
    // A stale socket (player already rejoined from another tab/socket) must not kick them.
    if (player.socketId !== null && player.socketId !== socketId) return room;

    if (!room.game) {
      // In lobby: disconnects keep the seat briefly? Keep it simple: remove only on explicit leave,
      // mark offline otherwise (allows refresh).
      if (explicit) room.players = room.players.filter((p) => p.id !== playerId);
      else player.socketId = null;
    } else {
      player.socketId = null;
    }

    if (room.players.length === 0 || room.players.every((p) => p.socketId === null)) {
      if (explicit || room.players.length === 0) {
        this.clearTimer(room);
        this.rooms.delete(room.code);
        return undefined;
      }
    }
    if (room.hostId === playerId && explicit) {
      const next = room.players.find((p) => p.socketId) ?? room.players[0];
      if (next) room.hostId = next.id;
    }
    return room;
  }

  start(code: string, playerId: string): Room {
    const room = this.mustGet(code);
    if (room.hostId !== playerId) throw new RoomError('Chỉ chủ phòng mới được bắt đầu');
    if (room.game && room.game.phase === 'playing') throw new RoomError('Ván đang diễn ra');
    // Drop offline players from the lobby before starting
    room.players = room.players.filter((p) => p.socketId !== null);
    if (room.players.length < MIN_PLAYERS) throw new RoomError(`Cần ít nhất ${MIN_PLAYERS} người`);
    room.game = createGame(room.players.map((p) => ({ id: p.id, name: p.name })));
    room.lastActivity = Date.now();
    this.syncTurnTimer(room);
    return room;
  }

  backToLobby(code: string, playerId: string): Room {
    const room = this.mustGet(code);
    if (room.hostId !== playerId) throw new RoomError('Chỉ chủ phòng mới làm được');
    this.clearTimer(room);
    room.game = null;
    return room;
  }

  setTurnTimer(code: string, enabled: boolean): Room {
    const room = this.mustGet(code);
    room.turnTimerEnabled = Boolean(enabled);
    room.lastActivity = Date.now();
    this.syncTurnTimer(room);
    return room;
  }

  act(code: string, playerId: string, action: GameAction): { room: Room; events: GameEvent[] } {
    const room = this.mustGet(code);
    if (!room.game) throw new RoomError('Ván chưa bắt đầu');
    try {
      const { state, events } = applyAction(room.game, playerId, action);
      room.game = state;
      room.lastActivity = Date.now();
      this.syncTurnTimer(room);
      return { room, events };
    } catch (e) {
      if (e instanceof GameError) throw new RoomError(e.message);
      throw e;
    }
  }

  view(room: Room): RoomView {
    return {
      code: room.code,
      hostId: room.hostId,
      players: room.players.map((p) => ({ id: p.id, name: p.name, connected: p.socketId !== null })),
      status: !room.game ? 'lobby' : room.game.phase === 'playing' ? 'playing' : 'finished',
      turnTimerEnabled: room.turnTimerEnabled,
      turnDeadline: room.turnDeadline,
    };
  }

  /** Remove rooms idle for longer than maxIdleMs with nobody connected. */
  sweep(maxIdleMs: number) {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const empty = room.players.every((p) => p.socketId === null);
      if (empty && now - room.lastActivity > maxIdleMs) {
        this.clearTimer(room);
        this.rooms.delete(code);
      }
    }
  }

  private mustGet(code: string): Room {
    const room = this.get(code);
    if (!room) throw new RoomError('Không tìm thấy phòng');
    return room;
  }
}
