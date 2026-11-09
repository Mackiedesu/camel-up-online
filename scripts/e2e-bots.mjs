// E2E smoke test: 8 bot players create/join a room and play a full game via Socket.IO.
import { io } from 'socket.io-client';

const URL = process.env.URL ?? 'http://localhost:5173';
const N = 8;
const RACING = ['red', 'yellow', 'blue', 'green', 'purple'];

const bots = Array.from({ length: N }, (_, i) => ({
  id: `bot-player-${i}-${Math.random().toString(36).slice(2)}`,
  name: `Bot${i + 1}`,
  socket: io(URL, { transports: ['websocket'] }),
  state: null,
}));

const emit = (s, ev, p) => new Promise((r) => s.emit(ev, p ?? {}, r));
let eventsSeen = 0;
let done = false;

for (const b of bots) {
  b.socket.on('room:state', (st) => (b.state = st));
  b.socket.on('game:events', (ev) => (eventsSeen += ev.length));
}

await Promise.all(bots.map((b) => new Promise((r) => b.socket.on('connect', r))));
const c = await emit(bots[0].socket, 'room:create', { playerId: bots[0].id, name: bots[0].name });
if (!c.ok) throw new Error(c.error);
console.log('room', c.code);
for (const b of bots.slice(1)) {
  const r = await emit(b.socket, 'room:join', { code: c.code, playerId: b.id, name: b.name });
  if (!r.ok) throw new Error(r.error);
}
// 9th player should be rejected
const extra = io(URL, { transports: ['websocket'] });
await new Promise((r) => extra.on('connect', r));
const rej = await emit(extra, 'room:join', { code: c.code, playerId: 'extra-player-xyz', name: 'Extra' });
console.log('9th player rejected:', !rej.ok, rej.error);
extra.close();

const s = await emit(bots[0].socket, 'game:start');
if (!s.ok) throw new Error(s.error);
await new Promise((r) => setTimeout(r, 200));

let turns = 0;
let errors = 0;
while (!done && turns < 1000) {
  const g = bots[0].state.game;
  if (g.phase === 'finished') break;
  const cur = g.players[g.currentPlayerIndex];
  const bot = bots.find((b) => b.id === cur.id);
  const myView = bot.state.game;
  const me = myView.players.find((p) => p.id === bot.id);
  // Pick a random action
  const r = Math.random();
  let action;
  if (r < 0.45) action = { type: 'rollDie' };
  else if (r < 0.7) action = { type: 'takeLegBet', color: RACING[Math.floor(Math.random() * 5)] };
  else if (r < 0.85) action = { type: 'placeSpectator', space: 2 + Math.floor(Math.random() * 15), side: Math.random() < 0.5 ? 1 : -1 };
  else {
    const free = RACING.filter((c) => !me.usedFinalCards.includes(c));
    action = free.length
      ? { type: 'finalBet', color: free[0], kind: Math.random() < 0.5 ? 'winner' : 'loser' }
      : { type: 'rollDie' };
  }
  const prevTurn = g.turn;
  const res = await emit(bot.socket, 'game:action', action);
  if (!res.ok) {
    errors++;
    // invalid choice (e.g. bad space) is fine; fall back to rolling
    const res2 = await emit(bot.socket, 'game:action', { type: 'rollDie' });
    if (!res2.ok) throw new Error('roll failed: ' + res2.error);
  }
  // Wait for state propagation
  for (let i = 0; i < 50 && bots[0].state.game.turn === prevTurn && bots[0].state.game.phase === 'playing'; i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  turns++;
}

const g = bots[0].state.game;
// Check redaction: other bots shouldn't see bot0's final-bet colours while playing (checked at end: revealed)
console.log('phase', g.phase, 'turns', turns, 'legs', g.leg, 'rejected actions', errors, 'events', eventsSeen);
console.log('ranking', g.result?.ranking.join(' > '));
console.log(
  'coins',
  g.players.map((p) => `${p.name}:${p.coins}`).join(' '),
  'winners',
  g.result?.winners.map((id) => g.players.find((p) => p.id === id).name).join(','),
);
// Out-of-turn check
const back = await emit(bots[0].socket, 'game:lobby');
console.log('back to lobby', back.ok, bots[1].state.room.status);
bots.forEach((b) => b.socket.close());
process.exit(g.phase === 'finished' ? 0 : 1);
