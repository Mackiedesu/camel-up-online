import { useStore } from './store';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { GameView } from './components/GameView';
import { Toasts } from './components/Toasts';
import { HowToPlayModal } from './components/HowToPlayModal';

export function App() {
  const room = useStore((s) => s.room);
  const game = useStore((s) => s.game);
  const connected = useStore((s) => s.connected);

  return (
    <>
      {!connected && <div className="conn-banner">Đang kết nối tới máy chủ…</div>}
      {!room ? <Home /> : room.status === 'lobby' || !game ? <Lobby /> : <GameView />}
      <HowToPlayModal />
      <Toasts />
    </>
  );
}
