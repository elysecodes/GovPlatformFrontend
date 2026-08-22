import { TOKEN_KEY } from './api';

export interface RealtimeNotification {
  id: number;
  title: string;
  content: string;
  type: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}

interface RealtimeHandlers {
  onNotification?: (n: RealtimeNotification) => void;
  onUnread?: (count: number) => void;
}

let source: EventSource | null = null;

export function connectRealtime(handlers: RealtimeHandlers) {
  disconnectRealtime();
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  source = new EventSource(`/api/v1/realtime/events?token=${encodeURIComponent(token)}`);
  source.addEventListener('notification', (e) => {
    const data = (e as MessageEvent).data;
    if (data) handlers.onNotification?.(JSON.parse(data) as RealtimeNotification);
  });
  source.addEventListener('unread', (e) => {
    const data = (e as MessageEvent).data;
    if (data) handlers.onUnread?.(Number(JSON.parse(data).count));
  });
}

export function disconnectRealtime() {
  source?.close();
  source = null;
}