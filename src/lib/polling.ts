import { ApiError } from '../api/greenApi';
import type { ChatApi, ChatEvent } from '../types';
import { parseNotification } from './notifications';
import { errorMessage } from './validation';

export function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

export async function pollNotifications(
  api: ChatApi,
  signal: AbortSignal,
  onEvent: (event: ChatEvent) => void,
  onStatus: (error: string | null, stopped?: boolean) => void,
): Promise<void> {
  let failures = 0;
  while (!signal.aborted) {
    try {
      const notification = await api.receiveNotification(signal);
      if (signal.aborted) return;
      if (notification) {
        const event = parseNotification(notification.body);
        if (event) onEvent(event);
        // Подтверждаем после обработки. При сбое DELETE повтор не создаст дубль в reducer.
        await api.deleteNotification(notification.receiptId, signal);
        if (event?.type === 'account' && !event.authorized) {
          onStatus('Сессия MAX завершена. Авторизуйте инстанс и подключитесь заново.', true);
          return;
        }
      }
      failures = 0;
      onStatus(null);
      await delay(notification ? 150 : 350, signal);
    } catch (error) {
      if (signal.aborted) return;
      const stopped = error instanceof ApiError && [401, 403, 404].includes(error.status);
      onStatus(errorMessage(error), stopped);
      if (stopped) return;
      failures += 1;
      try {
        await delay(Math.min(1000 * 2 ** Math.min(failures - 1, 5), 30_000), signal);
      } catch {
        return;
      }
    }
  }
}
