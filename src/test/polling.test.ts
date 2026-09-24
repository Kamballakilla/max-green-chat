import { afterEach, describe, expect, it, vi } from 'vitest';
import { pollNotifications } from '../lib/polling';
import { ApiError } from '../api/greenApi';
import type { ChatApi } from '../types';

afterEach(() => vi.useRealTimers());
const notification = {
  receiptId: 7,
  body: {
    typeWebhook: 'incomingMessageReceived',
    idMessage: 'm1',
    timestamp: 1,
    senderData: { chatId: '123' },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'hi' } },
  },
};
const mockApi = (): ChatApi => ({
  checkAccount: vi.fn(),
  sendMessage: vi.fn(),
  receiveNotification: vi.fn(),
  deleteNotification: vi.fn(),
});

describe('Последовательная очередь', () => {
  it('сначала обрабатывает, затем подтверждает и не запускает запросы параллельно', async () => {
    vi.useFakeTimers();
    const api = mockApi();
    const controller = new AbortController();
    const order: string[] = [];
    vi.mocked(api.receiveNotification)
      .mockImplementationOnce(async () => {
        order.push('receive');
        return notification;
      })
      .mockImplementationOnce(async () => {
        controller.abort();
        return null;
      });
    vi.mocked(api.deleteNotification).mockImplementation(async () => {
      order.push('delete');
    });
    const running = pollNotifications(api, controller.signal, () => order.push('process'), vi.fn());
    await vi.advanceTimersByTimeAsync(200);
    await running;
    expect(order).toEqual(['receive', 'process', 'delete']);
    expect(api.deleteNotification).toHaveBeenCalledWith(7, controller.signal);
  });
  it('при сбое подтверждения повторно получает событие', async () => {
    vi.useFakeTimers();
    const api = mockApi();
    const controller = new AbortController();
    const received = vi.fn();
    vi.mocked(api.receiveNotification).mockResolvedValue(notification);
    vi.mocked(api.deleteNotification)
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(async () => controller.abort());
    const running = pollNotifications(api, controller.signal, received, vi.fn());
    await vi.advanceTimersByTimeAsync(1100);
    await running;
    expect(received).toHaveBeenCalledTimes(2);
  });
  it('останавливается при 401 без бесконечных повторов', async () => {
    const api = mockApi();
    vi.mocked(api.receiveNotification).mockRejectedValue(new ApiError('Ключ недействителен', 401));
    const status = vi.fn();
    await pollNotifications(api, new AbortController().signal, vi.fn(), status);
    expect(api.receiveNotification).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledWith('Ключ недействителен', true);
  });
  it('не подтверждает уведомление, если обработка завершилась ошибкой', async () => {
    const api = mockApi();
    const controller = new AbortController();
    vi.mocked(api.receiveNotification).mockResolvedValue(notification);
    await pollNotifications(
      api,
      controller.signal,
      () => {
        controller.abort();
        throw new Error('processing failed');
      },
      vi.fn(),
    );
    expect(api.deleteNotification).not.toHaveBeenCalled();
  });
});
