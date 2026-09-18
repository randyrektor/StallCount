import {
  applyWatchMessage,
  nextRoomAlarm,
  normalizeRoomId,
  parseClientMessage,
  type RoomState,
} from '../src/utils/watchRoom';

export interface Env {
  ROOMS: DurableObjectNamespace;
  ASSETS?: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/watch-ws') {
      const room = normalizeRoomId(url.searchParams.get('room') ?? '');
      if (!room) return new Response('bad-room', { status: 400 });
      const stub = env.ROOMS.get(env.ROOMS.idFromName(room));
      return stub.fetch(request);
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};

type SocketMeta = { role?: 'host' | 'viewer' };

export class WatchRoom {
  private ctx: DurableObjectState;

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ctx = ctx;
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const parsed = parseClientMessage(typeof message === 'string' ? message : new TextDecoder().decode(message));
    if (!parsed) {
      ws.send(JSON.stringify({ type: 'error', error: 'bad-message' }));
      return;
    }
    const expired = await this.isExpired(Date.now());
    if (expired) {
      await this.expire();
      ws.send(JSON.stringify({ type: 'error', error: 'expired' }));
      ws.close(4000, 'expired');
      return;
    }
    const room = await this.load();
    const result = applyWatchMessage(room, parsed);
    const now = Date.now();
    const createdAt = ((await this.ctx.storage.get<number>('createdAt')) ?? now);
    await this.ctx.storage.put({
      key: result.room.key,
      snap: result.room.snap,
      createdAt,
      lastActive: now,
    });
    const alarmAt = nextRoomAlarm(now, createdAt, now);
    if (alarmAt != null) await this.ctx.storage.setAlarm(alarmAt);
    if (result.role) ws.serializeAttachment({ role: result.role } satisfies SocketMeta);
    ws.send(JSON.stringify(result.reply));
    if (result.broadcast) {
      const payload = JSON.stringify(result.broadcast);
      for (const client of this.ctx.getWebSockets()) {
        const meta = client.deserializeAttachment() as SocketMeta | undefined;
        if (meta?.role === 'viewer') client.send(payload);
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    ws.close(code, reason);
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    if (!(await this.isExpired(now))) {
      const createdAt = (await this.ctx.storage.get<number>('createdAt')) ?? now;
      const lastActive = (await this.ctx.storage.get<number>('lastActive')) ?? now;
      const alarmAt = nextRoomAlarm(now, createdAt, lastActive);
      if (alarmAt != null) await this.ctx.storage.setAlarm(alarmAt);
      return;
    }
    await this.expire();
  }

  private async isExpired(now: number): Promise<boolean> {
    const createdAt = await this.ctx.storage.get<number>('createdAt');
    const lastActive = await this.ctx.storage.get<number>('lastActive');
    if (createdAt == null && lastActive == null) return false;
    return nextRoomAlarm(now, createdAt ?? now, lastActive ?? createdAt ?? now) == null;
  }

  private async expire(): Promise<void> {
    const payload = JSON.stringify({ type: 'error', error: 'expired' });
    for (const client of this.ctx.getWebSockets()) {
      try {
        client.send(payload);
        client.close(4000, 'expired');
      } catch {
        // already closed
      }
    }
    await this.ctx.storage.deleteAll();
  }

  private async load(): Promise<RoomState> {
    const stored = await this.ctx.storage.get(['key', 'snap']);
    return {
      key: (stored.get('key') as string | undefined) ?? null,
      snap: (stored.get('snap') as RoomState['snap']) ?? null,
    };
  }
}
