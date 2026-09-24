import { describe, expect, it } from 'vitest';
import { chatReducer, emptyState } from '../lib/chatReducer';
import { parseNotification } from '../lib/notifications';
import type { ChatEvent, ChatState } from '../types';

const event: ChatEvent = {
  type: 'message',
  name: 'Анна',
  message: { id: 'remote-1', chatId: '123', text: 'Привет', timestamp: 100, direction: 'incoming' },
};

describe('Состояние чата', () => {
  it('не дублирует повторно полученное событие и счётчик', () => {
    const first = chatReducer(emptyState, { type: 'event', event });
    const second = chatReducer(first, { type: 'event', event });
    expect(second.messages).toHaveLength(1);
    expect(second.chats[0].unread).toBe(1);
    expect(chatReducer(second, { type: 'select', id: '123' }).chats[0].unread).toBe(0);
  });
  it('связывает ответ с существующим чатом по MAX chatId', () => {
    const state = chatReducer(emptyState, {
      type: 'addChat',
      chat: { id: '123', name: '+79991234567', phone: '79991234567', unread: 0 },
    });
    const next = chatReducer(state, { type: 'event', event });
    expect(next.chats).toHaveLength(1);
    expect(next.chats[0].unread).toBe(0);
  });
  it('сохраняет ранний статус и не понижает прочитанное до доставленного', () => {
    let state: ChatState = chatReducer(emptyState, {
      type: 'send',
      message: {
        id: 'local',
        chatId: '123',
        text: 'hi',
        timestamp: 0,
        direction: 'outgoing',
        status: 'sending',
      },
    });
    state = chatReducer(state, {
      type: 'event',
      event: { type: 'status', id: 'server', chatId: '123', status: 'read' },
    });
    state = chatReducer(state, { type: 'sent', localId: 'local', serverId: 'server' });
    state = chatReducer(state, {
      type: 'event',
      event: { type: 'status', id: 'server', chatId: '123', status: 'delivered' },
    });
    expect(state.messages[0].status).toBe('read');
  });
});

describe('Входящие уведомления', () => {
  const body = {
    typeWebhook: 'incomingMessageReceived',
    idMessage: 'm1',
    timestamp: 123,
    senderData: { chatId: '123', senderName: 'Анна' },
    messageData: {
      typeMessage: 'textMessage',
      textMessageData: { textMessage: '<script>alert(1)</script>' },
    },
  };
  it('сохраняет обычный текст и преобразует секунды в миллисекунды', () => {
    expect(parseNotification(body)).toMatchObject({
      type: 'message',
      message: { timestamp: 123000, text: '<script>alert(1)</script>' },
    });
  });
  it('обрабатывает текст с URL', () => {
    expect(
      parseNotification({
        ...body,
        messageData: {
          typeMessage: 'extendedTextMessage',
          extendedTextMessageData: { text: 'https://example.com' },
        },
      }),
    ).toMatchObject({ message: { text: 'https://example.com' } });
  });
  it.each([
    null,
    {},
    { ...body, messageData: { typeMessage: 'imageMessage' } },
    { ...body, senderData: { chatId: '-123', chatType: 'group' } },
    { ...body, timestamp: 'bad' },
  ])('безопасно пропускает неподдерживаемое событие', (value) =>
    expect(parseNotification(value)).toBeNull(),
  );
  it('показывает noAccount как ошибку отправки', () =>
    expect(
      parseNotification({
        typeWebhook: 'outgoingMessageStatus',
        chatId: '123',
        idMessage: 'm1',
        status: 'noAccount',
      }),
    ).toMatchObject({ status: 'failed' }));
});
