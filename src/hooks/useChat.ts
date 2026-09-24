import { useEffect, useReducer, useRef, useState } from 'react';
import type { ChatApi, ChatState } from '../types';
import { ApiError } from '../api/greenApi';
import { chatReducer } from '../lib/chatReducer';
import { pollNotifications } from '../lib/polling';
import { errorMessage, MESSAGE_LIMIT, normalizePhone } from '../lib/validation';

export function useChat(api: ChatApi, initialState: ChatState) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [stopped, setStopped] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    void pollNotifications(
      api,
      current.signal,
      (event) => dispatch({ type: 'event', event }),
      (error, halted) => {
        setConnectionError(error);
        setStopped(Boolean(halted));
      },
    );
    return () => current.abort();
  }, [api]);

  async function createChat(phoneInput: string, name: string) {
    const phone = normalizePhone(phoneInput);
    const existing = state.chats.find((chat) => chat.phone === phone);
    if (existing) {
      dispatch({ type: 'select', id: existing.id });
      return;
    }
    const signal = controller.current!.signal;
    const id = await api.checkAccount(phone, signal);
    if (!signal.aborted)
      dispatch({
        type: 'addChat',
        chat: { id, name: name.trim() || `+${phone}`, phone, unread: 0 },
      });
  }

  async function send(text: string): Promise<boolean> {
    const chatId = state.activeId;
    if (!chatId || !text.trim() || text.length > MESSAGE_LIMIT || sendingRef.current || stopped)
      return false;
    sendingRef.current = true;
    setSending(true);
    setSendError(null);
    const localId = crypto.randomUUID();
    const signal = controller.current!.signal;
    dispatch({
      type: 'send',
      message: {
        id: localId,
        chatId,
        text: text.trim(),
        timestamp: Date.now(),
        direction: 'outgoing',
        status: 'sending',
      },
    });
    try {
      const serverId = await api.sendMessage(chatId, text.trim(), signal);
      if (signal.aborted) return false;
      dispatch({ type: 'sent', localId, serverId });
      return true;
    } catch (error) {
      if (signal.aborted) return false;
      const certainFailure = error instanceof ApiError && error.status >= 400 && error.status < 500;
      dispatch({ type: 'sendError', localId, status: certainFailure ? 'failed' : 'uncertain' });
      setSendError(
        `${errorMessage(error)}${certainFailure ? '' : ' Статус отправки неизвестен. Проверьте MAX перед повтором.'}`,
      );
      return false;
    } finally {
      sendingRef.current = false;
      if (!signal.aborted) setSending(false);
    }
  }

  return {
    state,
    selectChat: (id: string | null) => dispatch({ type: 'select', id }),
    createChat,
    send,
    sending,
    connectionError,
    stopped,
    sendError,
    clearSendError: () => setSendError(null),
  };
}
