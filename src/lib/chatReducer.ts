import type { Chat, ChatEvent, ChatState, Message, MessageStatus } from '../types';

export const emptyState: ChatState = { chats: [], messages: [], activeId: null };
export type Action =
  | { type: 'select'; id: string | null }
  | { type: 'addChat'; chat: Chat }
  | { type: 'send'; message: Message }
  | { type: 'sent'; localId: string; serverId: string }
  | { type: 'sendError'; localId: string; status: 'failed' | 'uncertain' }
  | { type: 'event'; event: ChatEvent };

const rank: Record<MessageStatus, number> = {
  sending: 0,
  uncertain: 0,
  queued: 1,
  failed: 2,
  delivered: 3,
  read: 4,
};

export function chatReducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case 'select':
      return {
        ...state,
        activeId: action.id,
        chats: state.chats.map((chat) => (chat.id === action.id ? { ...chat, unread: 0 } : chat)),
      };
    case 'addChat':
      return {
        ...state,
        activeId: action.chat.id,
        chats: state.chats.some((chat) => chat.id === action.chat.id)
          ? state.chats.map((chat) =>
              chat.id === action.chat.id ? { ...chat, phone: action.chat.phone, unread: 0 } : chat,
            )
          : [...state.chats, action.chat],
      };
    case 'send':
      return { ...state, messages: [...state.messages, action.message] };
    case 'sent': {
      const message = state.messages.find((item) => item.id === action.localId);
      const key = `${message?.chatId}:${action.serverId}`;
      const pendingStatuses = { ...state.pendingStatuses };
      const status = pendingStatuses[key] ?? 'queued';
      delete pendingStatuses[key];
      return {
        ...state,
        pendingStatuses,
        messages: state.messages.map((item) =>
          item.id === action.localId ? { ...item, id: action.serverId, status } : item,
        ),
      };
    }
    case 'sendError':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.localId ? { ...message, status: action.status } : message,
        ),
      };
    case 'event': {
      const event = action.event;
      if (event.type === 'account') return state;
      if (event.type === 'status') {
        const exists = state.messages.some(
          (message) => message.id === event.id && message.chatId === event.chatId,
        );
        if (!exists) {
          // Статус иногда приходит раньше HTTP-ответа sendMessage.
          if (
            !state.messages.some(
              (message) => message.chatId === event.chatId && message.status === 'sending',
            )
          )
            return state;
          const key = `${event.chatId}:${event.id}`;
          const previous = state.pendingStatuses?.[key];
          return {
            ...state,
            pendingStatuses: {
              ...state.pendingStatuses,
              [key]: previous && rank[previous] > rank[event.status] ? previous : event.status,
            },
          };
        }
        return {
          ...state,
          messages: state.messages.map((message) =>
            message.id === event.id &&
            message.chatId === event.chatId &&
            rank[event.status] > rank[message.status ?? 'sending']
              ? { ...message, status: event.status }
              : message,
          ),
        };
      }
      if (
        state.messages.some(
          (message) => message.id === event.message.id && message.chatId === event.message.chatId,
        )
      )
        return state;
      const id = event.message.chatId;
      const unread = state.activeId === id ? 0 : 1;
      const exists = state.chats.some((chat) => chat.id === id);
      return {
        ...state,
        messages: [...state.messages, event.message],
        chats: exists
          ? state.chats.map((chat) =>
              chat.id === id ? { ...chat, unread: chat.unread + unread } : chat,
            )
          : [...state.chats, { id, name: event.name, phone: event.phone, unread }],
      };
    }
  }
}
