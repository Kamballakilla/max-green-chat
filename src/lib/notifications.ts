import { isRecord } from '../api/greenApi';
import type { ChatEvent, MessageStatus } from '../types';

export function parseNotification(body: unknown): ChatEvent | null {
  if (!isRecord(body)) return null;
  if (body.typeWebhook === 'stateInstanceChanged' && typeof body.stateInstance === 'string') {
    return { type: 'account', authorized: body.stateInstance === 'authorized' };
  }
  if (body.typeWebhook === 'outgoingMessageStatus') {
    const statuses: Record<string, MessageStatus> = {
      sent: 'queued',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
      noAccount: 'failed',
    };
    const status = typeof body.status === 'string' ? statuses[body.status] : undefined;
    if (status && typeof body.idMessage === 'string' && typeof body.chatId === 'string') {
      return { type: 'status', id: body.idMessage, chatId: body.chatId, status };
    }
    return null;
  }
  // В этой версии поддерживаем только входящий текст; остальные события подтверждаем и пропускаем.
  if (body.typeWebhook !== 'incomingMessageReceived') return null;
  if (!isRecord(body.senderData) || !isRecord(body.messageData)) return null;
  const sender = body.senderData;
  const data = body.messageData;
  let text: unknown;
  if (data.typeMessage === 'textMessage' && isRecord(data.textMessageData))
    text = data.textMessageData.textMessage;
  if (data.typeMessage === 'extendedTextMessage' && isRecord(data.extendedTextMessageData))
    text = data.extendedTextMessageData.text;
  if (
    typeof text !== 'string' ||
    typeof sender.chatId !== 'string' ||
    typeof body.idMessage !== 'string' ||
    typeof body.timestamp !== 'number' ||
    !Number.isFinite(body.timestamp)
  )
    return null;
  if (sender.chatType === 'group' || sender.chatId.startsWith('-')) return null;
  const name =
    (typeof sender.senderContactName === 'string' && sender.senderContactName) ||
    (typeof sender.senderName === 'string' && sender.senderName) ||
    sender.chatId;
  const phone =
    typeof sender.senderPhoneNumber === 'number' || typeof sender.senderPhoneNumber === 'string'
      ? String(sender.senderPhoneNumber)
      : undefined;
  return {
    type: 'message',
    name,
    phone,
    message: {
      id: body.idMessage,
      chatId: sender.chatId,
      text,
      timestamp: body.timestamp * 1000,
      direction: 'incoming',
    },
  };
}
