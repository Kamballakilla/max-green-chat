export type Credentials = { apiUrl: string; idInstance: string; apiTokenInstance: string };
export type MessageStatus = 'sending' | 'queued' | 'delivered' | 'read' | 'failed' | 'uncertain';
export type Message = {
  id: string;
  chatId: string;
  text: string;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  status?: MessageStatus;
};
export type Chat = { id: string; name: string; phone?: string; unread: number };
export type ChatState = {
  chats: Chat[];
  messages: Message[];
  activeId: string | null;
  pendingStatuses?: Record<string, MessageStatus>;
};
export type Notification = { receiptId: number; body: unknown };
export type ChatEvent =
  | { type: 'message'; message: Message; name: string; phone?: string }
  | { type: 'status'; id: string; chatId: string; status: MessageStatus }
  | { type: 'account'; authorized: boolean };
export interface ChatApi {
  checkAccount(phone: string, signal: AbortSignal): Promise<string>;
  sendMessage(chatId: string, text: string, signal: AbortSignal): Promise<string>;
  receiveNotification(signal: AbortSignal): Promise<Notification | null>;
  deleteNotification(receiptId: number, signal: AbortSignal): Promise<void>;
}
