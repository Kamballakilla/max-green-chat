import type { ChatApi, ChatState, Notification } from '../types';
import { delay } from '../lib/polling';

export function demoState(): ChatState {
  const now = Date.now();
  return {
    activeId: 'demo-alex',
    chats: [
      { id: 'demo-alex', name: 'Александр', phone: '79990000001', unread: 0 },
      { id: 'demo-anna', name: 'Анна', phone: '79990000002', unread: 1 },
      { id: 'demo-team', name: 'Команда GREEN-API', unread: 0 },
    ],
    messages: [
      {
        id: 'd1',
        chatId: 'demo-alex',
        direction: 'incoming',
        text: 'Привет! Как продвигается наш проект?',
        timestamp: now - 600_000,
      },
      {
        id: 'd2',
        chatId: 'demo-alex',
        direction: 'outgoing',
        text: 'Привет! Уже можно отправлять сообщения и получать ответы в одном окне.',
        timestamp: now - 540_000,
        status: 'read',
      },
      {
        id: 'd3',
        chatId: 'demo-alex',
        direction: 'incoming',
        text: 'Здорово. Давай проверим 🙂',
        timestamp: now - 480_000,
      },
      {
        id: 'd4',
        chatId: 'demo-alex',
        direction: 'incoming',
        text: 'Напиши что-нибудь — в деморежиме я отвечу автоматически.',
        timestamp: now - 470_000,
      },
      {
        id: 'd5',
        chatId: 'demo-anna',
        direction: 'incoming',
        text: 'Всё получилось, спасибо!',
        timestamp: now - 3_600_000,
      },
      {
        id: 'd6',
        chatId: 'demo-team',
        direction: 'incoming',
        text: 'Добро пожаловать! Здесь начинается общение.',
        timestamp: now - 7_200_000,
      },
    ],
  };
}

export class DemoApi implements ChatApi {
  private queue: Notification[] = [];
  private nextReceipt = 1;

  async checkAccount(phone: string, signal: AbortSignal): Promise<string> {
    await delay(300, signal);
    return phone === '79990000001'
      ? 'demo-alex'
      : phone === '79990000002'
        ? 'demo-anna'
        : `demo-${phone}`;
  }

  async sendMessage(chatId: string, _text: string, signal: AbortSignal): Promise<string> {
    await delay(400, signal);
    const id = crypto.randomUUID();
    this.queue.push({
      receiptId: this.nextReceipt++,
      body: { typeWebhook: 'outgoingMessageStatus', chatId, idMessage: id, status: 'read' },
    });
    this.queue.push({
      receiptId: this.nextReceipt++,
      body: {
        typeWebhook: 'incomingMessageReceived',
        idMessage: crypto.randomUUID(),
        timestamp: Math.floor(Date.now() / 1000),
        senderData: { chatId, senderName: 'Демо-собеседник' },
        messageData: {
          typeMessage: 'textMessage',
          textMessageData: {
            textMessage:
              'Сообщение получил! Это демонстрационный ответ. В реальном режиме здесь появится ответ из MAX.',
          },
        },
      },
    });
    return id;
  }

  async receiveNotification(signal: AbortSignal): Promise<Notification | null> {
    await delay(1000, signal);
    return this.queue[0] ?? null;
  }

  async deleteNotification(receiptId: number, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    this.queue = this.queue.filter((item) => item.receiptId !== receiptId);
  }
}
