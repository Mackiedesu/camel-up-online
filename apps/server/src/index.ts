import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server, type Socket } from 'socket.io';
import { redactFor, type Ack, type GameAction, type RoomStatePayload } from '@camelup/shared';
import { RoomError, RoomManager, type Room } from './rooms';

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_DIST = fileURLToPath(new URL('../../client/dist', import.meta.url));

/* ---------- Static file serving for production build ---------- */
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
};

const httpServer = createServer((req, res) => {
  if (req.url?.startsWith('/.proxy/')) {
    req.url = req.url.slice('/.proxy'.length);
  }
  if (!existsSync(CLIENT_DIST)) {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Camel Up server đang chạy. Mở client dev tại http://localhost:5173');
    return;
  }
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = normalize(join(CLIENT_DIST, url));
  if (!file.startsWith(CLIENT_DIST) || !existsSync(file) || statSync(file).isDirectory()) {
    file = join(CLIENT_DIST, 'index.html');
  }
  const isAsset = url.startsWith('/assets/') || url.endsWith('.mp3') || url.endsWith('.png');
  res.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  res.end(readFileSync(file));
});

const io = new Server(httpServer, {
  cors: { origin: '*' },
  allowRequest: (req, callback) => {
    if (req.url?.startsWith('/.proxy/')) {
      req.url = req.url.slice('/.proxy'.length);
    }
    callback(null, true);
  },
});
const rooms = new RoomManager((room, events) => {
  io.to(room.code).emit('game:events', events);
  broadcastRoom(room);
});

interface SocketData {
  playerId?: string;
  roomCode?: string;
}

function broadcastRoom(room: Room) {
  const view = rooms.view(room);
  for (const p of room.players) {
    if (!p.socketId) continue;
    const payload: RoomStatePayload = {
      room: view,
      game: room.game ? redactFor(room.game, p.id) : null,
    };
    io.to(p.socketId).emit('room:state', payload);
  }
}

const cleanName = (n: unknown) => String(n ?? '').trim().slice(0, 20);
const validId = (id: unknown) => typeof id === 'string' && id.length >= 8 && id.length <= 64;

function handle<T extends object = {}>(ack: Ack<T> | undefined, fn: () => T | void) {
  try {
    const result = fn();
    ack?.({ ok: true, ...((result ?? {}) as T) });
  } catch (e) {
    const msg = e instanceof RoomError ? e.message : 'Lỗi máy chủ';
    if (!(e instanceof RoomError)) console.error(e);
    ack?.({ ok: false, error: msg });
  }
}

io.on('connection', (socket: Socket) => {
  const data = socket.data as SocketData;

  const leaveCurrent = (explicit: boolean) => {
    if (!data.roomCode || !data.playerId) return;
    const code = data.roomCode;
    socket.leave(code);
    const room = rooms.leave(code, data.playerId, explicit, socket.id);
    data.roomCode = undefined;
    if (room) broadcastRoom(room);
  };

  socket.on(
    'room:create',
    (msg: { playerId: string; name: string; turnTimerEnabled?: boolean }, ack?: Ack<{ code: string }>) =>
      handle(ack, () => {
        const name = cleanName(msg?.name);
        if (!name) throw new RoomError('Vui lòng nhập tên');
        if (!validId(msg?.playerId)) throw new RoomError('playerId không hợp lệ');
        leaveCurrent(true);
        const room = rooms.create(msg.playerId, name, socket.id, msg.turnTimerEnabled ?? true);
        data.playerId = msg.playerId;
        data.roomCode = room.code;
        socket.join(room.code);
        broadcastRoom(room);
        return { code: room.code };
      }),
  );

  socket.on(
    'room:join',
    (msg: { code: string; playerId: string; name: string }, ack?: Ack<{ code: string }>) =>
      handle(ack, () => {
        const name = cleanName(msg?.name);
        if (!name) throw new RoomError('Vui lòng nhập tên');
        if (!validId(msg?.playerId)) throw new RoomError('playerId không hợp lệ');
        const code = String(msg?.code ?? '').trim().toUpperCase();
        if (data.roomCode && data.roomCode !== code) leaveCurrent(true);
        const room = rooms.join(code, msg.playerId, name, socket.id);
        data.playerId = msg.playerId;
        data.roomCode = room.code;
        socket.join(room.code);
        broadcastRoom(room);
        return { code: room.code };
      }),
  );

  socket.on(
    'room:joinOrCreate',
    (
      msg: { code: string; playerId: string; name: string; turnTimerEnabled?: boolean },
      ack?: Ack<{ code: string }>,
    ) =>
      handle(ack, () => {
        const name = cleanName(msg?.name);
        if (!name) throw new RoomError('Vui lòng nhập tên');
        if (!validId(msg?.playerId)) throw new RoomError('playerId không hợp lệ');
        const code = String(msg?.code ?? '').trim().toUpperCase();
        if (code.length < 4 || code.length > 8) throw new RoomError('Mã phòng không hợp lệ');
        if (data.roomCode && data.roomCode !== code) leaveCurrent(true);
        const room = rooms.joinOrCreate(
          code,
          msg.playerId,
          name,
          socket.id,
          msg.turnTimerEnabled ?? true,
        );
        data.playerId = msg.playerId;
        data.roomCode = room.code;
        socket.join(room.code);
        broadcastRoom(room);
        return { code: room.code };
      }),
  );

  socket.on('room:leave', (_: unknown, ack?: Ack) => handle(ack, () => leaveCurrent(true)));

  socket.on('game:start', (_: unknown, ack?: Ack) =>
    handle(ack, () => {
      if (!data.roomCode || !data.playerId) throw new RoomError('Bạn chưa vào phòng');
      const room = rooms.start(data.roomCode, data.playerId);
      broadcastRoom(room);
    }),
  );

  socket.on('game:lobby', (_: unknown, ack?: Ack) =>
    handle(ack, () => {
      if (!data.roomCode || !data.playerId) throw new RoomError('Bạn chưa vào phòng');
      const room = rooms.backToLobby(data.roomCode, data.playerId);
      broadcastRoom(room);
    }),
  );

  socket.on('game:end', (_: unknown, ack?: Ack) =>
    handle(ack, () => {
      if (!data.roomCode || !data.playerId) throw new RoomError('Bạn chưa vào phòng');
      const { room, events } = rooms.endGame(data.roomCode, data.playerId);
      io.to(room.code).emit('game:events', events);
      broadcastRoom(room);
    }),
  );

  socket.on('room:setTimer', (msg: { enabled: boolean }, ack?: Ack) =>
    handle(ack, () => {
      if (!data.roomCode || !data.playerId) throw new RoomError('Bạn chưa vào phòng');
      const room = rooms.setTurnTimer(data.roomCode, Boolean(msg?.enabled));
      broadcastRoom(room);
    }),
  );

  socket.on('room:toggleSpectate', (_: unknown, ack?: Ack) =>
    handle(ack, () => {
      if (!data.roomCode || !data.playerId) throw new RoomError('Bạn chưa vào phòng');
      const room = rooms.toggleSpectate(data.roomCode, data.playerId);
      broadcastRoom(room);
    }),
  );

  socket.on('game:action', (action: GameAction, ack?: Ack) =>
    handle(ack, () => {
      if (!data.roomCode || !data.playerId) throw new RoomError('Bạn chưa vào phòng');
      const { room, events } = rooms.act(data.roomCode, data.playerId, action);
      io.to(room.code).emit('game:events', events);
      broadcastRoom(room);
    }),
  );

  socket.on('disconnect', () => leaveCurrent(false));
});

setInterval(() => rooms.sweep(30 * 60 * 1000), 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`🐪 Camel Up server listening on http://localhost:${PORT}`);
});
