import { DiscordSDK } from '@discord/embedded-app-sdk';

const memStorage = new Map<string, string>();

export function safeLocalGet(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memStorage.get(key) ?? null;
  } catch {
    return memStorage.get(key) ?? null;
  }
}

export function safeLocalSet(key: string, val: string): void {
  memStorage.set(key, val);
  try {
    localStorage.setItem(key, val);
  } catch {
    // Ignore storage errors in sandboxed Discord iframe
  }
}

export function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key) ?? memStorage.get(key) ?? null;
  } catch {
    return memStorage.get(key) ?? null;
  }
}

export function safeSessionSet(key: string, val: string): void {
  memStorage.set(key, val);
  try {
    sessionStorage.setItem(key, val);
  } catch {
    // Ignore storage errors in sandboxed Discord iframe
  }
}

export function safeSessionRemove(key: string): void {
  memStorage.delete(key);
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Convert a Discord Activity instance_id into a deterministic 5-char room code. */
export function discordInstanceRoomCode(instanceId: string): string {
  let h1 = 2166136261;
  let h2 = 16777619;
  for (let i = 0; i < instanceId.length; i++) {
    const ch = instanceId.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 16777619);
    h2 = Math.imul(h2 ^ (ch + i), 2166136261);
  }
  let out = '';
  let seed = Math.abs(h1 ^ h2);
  for (let i = 0; i < 5; i++) {
    out += CODE_CHARS[(seed + i * 7) % CODE_CHARS.length];
    seed = Math.floor(seed / CODE_CHARS.length) ^ Math.abs(h1 >> (i * 3));
  }
  return out;
}

export interface DiscordContext {
  isEmbedded: boolean;
  instanceId: string | null;
  autoRoomCode: string | null;
  sdk: DiscordSDK | null;
}

export function initDiscordActivity(): DiscordContext {
  if (typeof window === 'undefined') {
    return { isEmbedded: false, instanceId: null, autoRoomCode: null, sdk: null };
  }
  const params = new URLSearchParams(window.location.search);
  const frameId = params.get('frame_id');
  const instanceId = params.get('instance_id');
  const hostParts = window.location.hostname.split('.');
  const isDiscordHost = window.location.hostname.endsWith('.discordsays.com');
  const isEmbedded = Boolean(frameId && instanceId) || isDiscordHost;

  if (!isEmbedded) {
    return { isEmbedded: false, instanceId: null, autoRoomCode: null, sdk: null };
  }

  const envClientId = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_DISCORD_CLIENT_ID;
  const hostClientId = isDiscordHost && /^\d+$/.test(hostParts[0]) ? hostParts[0] : null;
  const clientId = envClientId || params.get('client_id') || hostClientId;

  let sdk: DiscordSDK | null = null;
  if (clientId) {
    try {
      sdk = new DiscordSDK(clientId);
      sdk.ready().catch((err) => {
        console.warn('DiscordSDK ready warning:', err);
      });
    } catch (err) {
      console.warn('DiscordSDK init warning:', err);
    }
  }

  const autoRoomCode = instanceId ? discordInstanceRoomCode(instanceId) : 'DISC1';
  return {
    isEmbedded: true,
    instanceId,
    autoRoomCode,
    sdk,
  };
}
