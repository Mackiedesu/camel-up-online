import {
  applyAction,
  createGame,
  forceEndGame,
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
  spectating?: boolean;
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
    // Ensure unique name if someone enters a duplicate name
    let safeName = name;
    let suffix = 2;
    while (room.players.some((p) => p.name.toLowerCase() === safeName.toLowerCase())) {
      safeName = `${name.slice(0, 17)}#${suffix++}`;
    }
    if (room.game) {
      // Game already started -> allow joining as a live spectator (inspector)
      room.players.push({ id: playerId, name: safeName, socketId, spectating: true });
      return room;
    }
    if (room.players.length >= MAX_PLAYERS) throw new RoomError(`Phòng đã đủ ${MAX_PLAYERS} người`);
    room.players.push({ id: playerId, name: safeName, socketId, spectating: false });
    return room;
  }

  /** Join a room by code if it exists, or create it with that exact code (used by Discord Activity). */
  joinOrCreate(
    rawCode: string,
    playerId: string,
    name: string,
    socketId: string,
    turnTimerEnabled = true,
  ): Room {
    const code = rawCode.toUpperCase();
    const existingRoom = this.get(code);
    if (!existingRoom) {
      const room: Room = {
        code,
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
    // Ensure unique name if someone in the same Discord channel enters a duplicate name
    let safeName = name;
    let suffix = 2;
    while (
      existingRoom.players.some(
        (p) => p.id !== playerId && p.name.toLowerCase() === safeName.toLowerCase(),
      )
    ) {
      safeName = `${name.slice(0, 17)}#${suffix++}`;
    }
    return this.join(code, playerId, safeName, socketId);
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
      if (explicit) room.players = room.players.filter((p) => p.id !== playerId);
      else player.socketId = null;
    } else if (player.spectating) {
      room.players = room.players.filter((p) => p.id !== playerId);
    } else {
      player.socketId = null;
      // If the player who explicitly left was the active turn player, pass turn to the next connected player
      if (explicit && room.game.phase === 'playing') {
        const curId = room.game.players[room.game.currentPlayerIndex]?.id;
        if (curId === playerId) {
          const n = room.game.players.length;
          for (let step = 1; step < n; step++) {
            const idx = (room.game.currentPlayerIndex + step) % n;
            const pid = room.game.players[idx].id;
            const rp = room.players.find((x) => x.id === pid);
            if (rp && rp.socketId !== null) {
              room.game.currentPlayerIndex = idx;
              this.syncTurnTimer(room);
              break;
            }
          }
        }
      }
    }

    if (room.players.length === 0 || room.players.every((p) => p.socketId === null)) {
      if (explicit || room.players.length === 0) {
        this.clearTimer(room);
        this.rooms.delete(room.code);
        return undefined;
      }
    }
    if (room.hostId === playerId) {
      const next = room.players.find((p) => p.socketId !== null) ?? room.players[0];
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
    const activePlayers = room.players.filter((p) => !p.spectating).slice(0, MAX_PLAYERS);
    if (activePlayers.length < MIN_PLAYERS) throw new RoomError(`Cần ít nhất ${MIN_PLAYERS} người`);
    room.game = createGame(activePlayers.map((p) => ({ id: p.id, name: p.name })));
    room.lastActivity = Date.now();
    this.syncTurnTimer(room);
    return room;
  }

  backToLobby(code: string, playerId: string): Room {
    const room = this.mustGet(code);
    if (room.hostId !== playerId) throw new RoomError('Chỉ chủ phòng mới làm được');
    this.clearTimer(room);
    room.game = null;
    room.players = room.players.filter((p) => p.socketId !== null);
    room.players.forEach((p, idx) => {
      p.spectating = idx >= MAX_PLAYERS;
    });
    room.lastActivity = Date.now();
    return room;
  }

  endGame(code: string, playerId: string): { room: Room; events: GameEvent[] } {
    const room = this.mustGet(code);
    if (room.hostId !== playerId) throw new RoomError('Chỉ chủ phòng mới được kết thúc ván');
    if (!room.game || room.game.phase !== 'playing') throw new RoomError('Ván không còn diễn ra');
    this.clearTimer(room);
    try {
      const { state, events } = forceEndGame(room.game);
      room.game = state;
      room.lastActivity = Date.now();
      return { room, events };
    } catch (e) {
      if (e instanceof GameError) throw new RoomError(e.message);
      throw e;
    }
  }

  setTurnTimer(code: string, enabled: boolean): Room {
    const room = this.mustGet(code);
    room.turnTimerEnabled = Boolean(enabled);
    room.lastActivity = Date.now();
    this.syncTurnTimer(room);
    return room;
  }

  toggleSpectate(code: string, playerId: string): Room {
    const room = this.mustGet(code);
    if (room.game) throw new RoomError('Ván đang diễn ra');
    const p = room.players.find((x) => x.id === playerId);
    if (!p) throw new RoomError('Không tìm thấy người chơi');
    const nextSpectating = !p.spectating;
    if (!nextSpectating) {
      const activeCount = room.players.filter((x) => !x.spectating).length;
      if (activeCount >= MAX_PLAYERS) throw new RoomError(`Đã đủ ${MAX_PLAYERS} người chơi`);
    }
    p.spectating = nextSpectating;
    room.lastActivity = Date.now();
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
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.socketId !== null,
        spectating: Boolean(p.spectating),
      })),
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
