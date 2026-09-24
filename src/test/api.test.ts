import { describe, expect, it, vi } from 'vitest';
import { GreenApi } from '../api/greenApi';

const credentials = {
  apiUrl: 'https://3100.api.green-api.com',
  idInstance: '3100000001',
  apiTokenInstance: 'test-secret',
};
const api = new GreenApi(credentials);
const signal = new AbortController().signal;
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

describe('Контракт GREEN-API', () => {
  it('создаёт чат через checkAccount с числовым phoneNumber', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ exist: true, chatId: '987654321' }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await api.checkAccount('79991234567', signal)).toBe('987654321');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/checkAccount/test-secret'),
      expect.objectContaining({ method: 'POST', body: '{"phoneNumber":79991234567}' }),
    );
  });
  it('посылает текст по chatId, не по номеру', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ idMessage: 'message-1' }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await api.sendMessage('987654321', 'Привет', signal)).toBe('message-1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/sendMessage/'),
      expect.objectContaining({ body: '{"chatId":"987654321","message":"Привет"}' }),
    );
  });
  it('не показывает токен из ошибки сервера', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'test-secret' }, 401)));
    await expect(api.sendMessage('123', 'hi', signal)).rejects.toThrow('Неверные учётные данные');
  });
  it('принимает пустую очередь', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')));
    expect(await api.receiveNotification(signal)).toBeNull();
  });
  it('подтверждает конкретный receiptId методом DELETE', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ result: true }));
    vi.stubGlobal('fetch', fetchMock);
    await api.deleteNotification(55, signal);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/deleteNotification/test-secret/55'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
  it('блокирует подключение при чужом webhookUrl', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json({ stateInstance: 'authorized' }))
        .mockResolvedValueOnce(json({ incomingWebhook: 'yes', webhookUrl: 'https://example.com' })),
    );
    await expect(api.connect(signal)).rejects.toThrow('webhookUrl');
  });
});
