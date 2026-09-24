import type { ChatApi, Credentials, Notification } from '../types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export class GreenApi implements ChatApi {
  constructor(private credentials: Credentials) {}

  private async request(
    method: string,
    verb: string,
    signal: AbortSignal,
    body?: unknown,
    suffix = '',
  ): Promise<unknown> {
    const { apiUrl, idInstance, apiTokenInstance } = this.credentials;
    const url = `${apiUrl}/waInstance${idInstance}/${method}/${apiTokenInstance}${suffix}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: verb,
        signal: AbortSignal.any([signal, AbortSignal.timeout(45_000)]),
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
    } catch {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      throw new ApiError('Нет ответа от GREEN-API. Проверьте интернет и apiUrl.');
    }
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: 'GREEN-API отклонил запрос. Проверьте данные и настройки инстанса.',
        401: 'Неверные учётные данные. Проверьте idInstance и apiTokenInstance.',
        403: 'Доступ запрещён. Проверьте ключ, состояние аккаунта и ограничения тарифа.',
        404: 'Инстанс не найден. Проверьте apiUrl и idInstance.',
        429: 'Слишком много запросов. Повторите попытку немного позже.',
      };
      // Не включаем URL или тело ответа: они могут содержать ключ доступа.
      throw new ApiError(
        messages[response.status] ?? 'GREEN-API временно недоступен. Попробуйте позже.',
        response.status,
      );
    }
    const text = await response.text();
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      throw new ApiError('GREEN-API вернул некорректный ответ.');
    }
  }

  async connect(signal: AbortSignal): Promise<void> {
    const state = await this.request('getStateInstance', 'GET', signal);
    if (!isRecord(state) || state.stateInstance !== 'authorized') {
      throw new ApiError('Сначала авторизуйте MAX-инстанс в личном кабинете GREEN-API.');
    }
    const settings = await this.request('getSettings', 'GET', signal);
    if (!isRecord(settings) || settings.incomingWebhook !== 'yes' || settings.webhookUrl) {
      throw new ApiError(
        'В настройках инстанса включите входящие уведомления и очистите webhookUrl. Подробности — в инструкции ниже.',
      );
    }
  }

  async checkAccount(phone: string, signal: AbortSignal): Promise<string> {
    const data = await this.request('checkAccount', 'POST', signal, { phoneNumber: Number(phone) });
    if (!isRecord(data) || typeof data.exist !== 'boolean')
      throw new ApiError('Не удалось проверить получателя.');
    if (!data.exist)
      throw new ApiError(
        'Аккаунт MAX не найден или скрыт настройками приватности. Проверьте номер.',
      );
    if (typeof data.chatId !== 'string' || !data.chatId)
      throw new ApiError('GREEN-API не вернул идентификатор чата.');
    return data.chatId;
  }

  async sendMessage(chatId: string, message: string, signal: AbortSignal): Promise<string> {
    const data = await this.request('sendMessage', 'POST', signal, { chatId, message });
    if (!isRecord(data) || typeof data.idMessage !== 'string' || !data.idMessage) {
      throw new ApiError(
        'Не удалось подтвердить отправку. Проверьте сообщение в MAX перед повтором.',
      );
    }
    return data.idMessage;
  }

  async receiveNotification(signal: AbortSignal): Promise<Notification | null> {
    const data = await this.request(
      'receiveNotification',
      'GET',
      signal,
      undefined,
      '?receiveTimeout=25',
    );
    if (data === null) return null;
    if (!isRecord(data) || !Number.isSafeInteger(data.receiptId) || !isRecord(data.body)) {
      throw new ApiError('Некорректное уведомление GREEN-API. Получение будет повторено.');
    }
    return { receiptId: data.receiptId as number, body: data.body };
  }

  async deleteNotification(receiptId: number, signal: AbortSignal): Promise<void> {
    const data = await this.request(
      'deleteNotification',
      'DELETE',
      signal,
      undefined,
      `/${receiptId}`,
    );
    if (!isRecord(data) || data.result !== true)
      throw new ApiError('Не удалось подтвердить получение уведомления.');
  }
}
