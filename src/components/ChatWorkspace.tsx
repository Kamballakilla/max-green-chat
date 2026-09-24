import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  FlaskConical,
  LoaderCircle,
  LogOut,
  MessageCircle,
  MessageSquarePlus,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { ChatApi, ChatState, MessageStatus } from '../types';
import { useChat } from '../hooks/useChat';
import { MESSAGE_LIMIT, timeLabel } from '../lib/validation';
import { Brand } from './Brand';
import { NewChatDialog } from './NewChatDialog';

const statusLabels: Record<MessageStatus, string> = {
  sending: 'Отправляется',
  queued: 'В очереди отправки',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
  uncertain: 'Статус неизвестен',
};

function Status({ status }: { status: MessageStatus }) {
  return (
    <span
      className={`message-status status-${status}`}
      title={statusLabels[status]}
      aria-label={statusLabels[status]}
    >
      {status === 'sending' ? (
        <Clock3 size={13} />
      ) : status === 'failed' || status === 'uncertain' ? (
        <CircleAlert size={14} />
      ) : status === 'queued' ? (
        <Check size={14} />
      ) : (
        <CheckCheck size={15} />
      )}
    </span>
  );
}

function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  return (
    <span className={`avatar color-${index % 4}`} aria-hidden="true">
      {name.startsWith('+') ? <MessageCircle size={21} /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function ChatWorkspace({
  api,
  initialState,
  demo,
  onLogout,
}: {
  api: ChatApi;
  initialState: ChatState;
  demo: boolean;
  onLogout: () => void;
}) {
  const chat = useChat(api, initialState);
  const [query, setQuery] = useState('');
  const [newChat, setNewChat] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [nearBottom, setNearBottom] = useState(true);
  const [help, setHelp] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const active = chat.state.chats.find((item) => item.id === chat.state.activeId);
  const messages = chat.state.messages
    .filter((message) => message.chatId === active?.id)
    .sort((a, b) => a.timestamp - b.timestamp);
  const draft = active ? (drafts[active.id] ?? '') : '';
  const last = messages.at(-1);
  const lastMessages = new Map(chat.state.messages.map((message) => [message.chatId, message]));
  const chats = [...chat.state.chats]
    .sort(
      (a, b) => (lastMessages.get(b.id)?.timestamp ?? 0) - (lastMessages.get(a.id)?.timestamp ?? 0),
    )
    .filter((item) =>
      `${item.name} ${item.phone ?? ''}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase().trim()),
    );

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
    setNearBottom(true);
  }, [active?.id]);
  useEffect(() => {
    if (nearBottom && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [last?.id, last?.status, nearBottom]);
  useEffect(() => {
    const input = composer.current;
    if (input) {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
    }
  }, [draft]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!active || chat.sending || !draft.trim() || draft.length > MESSAGE_LIMIT) return;
    const id = active.id;
    const sentText = draft;
    setNearBottom(true);
    const success = await chat.send(sentText);
    if (success)
      setDrafts((previous) => (previous[id] === sentText ? { ...previous, [id]: '' } : previous));
    composer.current?.focus();
  }

  function select(id: string | null) {
    chat.selectChat(id);
    chat.clearSendError();
  }

  return (
    <main className="workspace-page">
      <div className="workspace-top">
        <Brand compact />
        <div className="integration-label">
          <span className="green-dot" /> GREEN-API <span className="small-separator">/</span> MAX
        </div>
      </div>
      <div className={`chat-shell ${active ? 'has-active' : ''}`}>
        <aside className="sidebar" aria-label="Диалоги">
          <div className="sidebar-heading">
            <h1>
              Сообщения <span>{chat.state.chats.length}</span>
            </h1>
            <button
              className="icon-button add-chat"
              title="Новый чат"
              aria-label="Новый чат"
              onClick={() => setNewChat(true)}
            >
              <MessageSquarePlus size={21} />
            </button>
          </div>
          <div className="search-field">
            <Search size={18} />
            <input
              aria-label="Поиск диалогов"
              placeholder="Поиск диалогов"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Очистить поиск" onClick={() => setQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
          <div className="chat-list">
            {chats.map((item, index) => {
              const latest = lastMessages.get(item.id);
              return (
                <button
                  key={item.id}
                  className={`chat-item ${item.id === active?.id ? 'selected' : ''}`}
                  onClick={() => select(item.id)}
                  aria-current={item.id === active?.id ? 'true' : undefined}
                >
                  <Avatar name={item.name} index={index} />
                  <span className="chat-item-copy">
                    <span className="chat-item-line">
                      <strong>{item.name}</strong>
                      {latest && <time>{timeLabel(latest.timestamp)}</time>}
                    </span>
                    <span className="chat-item-line">
                      <span className="chat-preview">
                        {latest?.direction === 'outgoing' ? 'Вы: ' : ''}
                        {latest?.text ?? 'Начните разговор'}
                      </span>
                      {item.unread > 0 && (
                        <span className="unread" aria-label={`${item.unread} непрочитанных`}>
                          {item.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
            {chats.length === 0 && (
              <div className="sidebar-empty">
                <MessageCircle size={28} />
                <strong>{query ? 'Ничего не найдено' : 'Пока нет диалогов'}</strong>
                <p>
                  {query ? 'Попробуйте другое имя или номер.' : 'Создайте чат по номеру телефона.'}
                </p>
                {!query && (
                  <button className="text-button" onClick={() => setNewChat(true)}>
                    Начать общение
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="sidebar-bottom">
            <span className="account-avatar">Я</span>
            <div>
              <strong>{demo ? 'Демо-аккаунт' : 'Мой аккаунт'}</strong>
              <small>
                <span className={`connection-dot ${chat.connectionError ? 'warning' : ''}`} />
                {demo
                  ? 'Знакомство с интерфейсом'
                  : chat.connectionError
                    ? 'Нет соединения'
                    : 'Подключён к MAX'}
              </small>
            </div>
            <button
              className="icon-button"
              aria-label="Выйти"
              title="Выйти и очистить сессию"
              onClick={onLogout}
            >
              <LogOut size={19} />
            </button>
          </div>
        </aside>
        <section
          className="conversation"
          aria-label={active ? `Переписка: ${active.name}` : 'Переписка'}
        >
          {active ? (
            <>
              <header className="conversation-header">
                <button
                  className="icon-button mobile-back"
                  aria-label="Назад к диалогам"
                  onClick={() => select(null)}
                >
                  <ArrowLeft size={21} />
                </button>
                <Avatar name={active.name} />
                <div className="contact-title">
                  <h2>{active.name}</h2>
                  <p>{active.phone ? `+${active.phone} · ` : ''}MAX</p>
                </div>
                <span className="text-only">
                  <MessageCircle size={15} /> Текстовые сообщения
                </span>
              </header>
              {demo && (
                <div className="demo-banner">
                  <FlaskConical size={16} />
                  <span>
                    Деморежим{' '}
                    <span className="demo-description">· Сообщения не отправляются в MAX</span>
                  </span>
                  <button onClick={onLogout}>
                    Подключить аккаунт <ArrowUp size={14} />
                  </button>
                </div>
              )}
              {chat.connectionError && (
                <div className="connection-error" role="alert">
                  <CircleAlert size={17} />
                  <span>
                    {chat.connectionError} {!chat.stopped && 'Переподключаемся автоматически…'}
                  </span>
                  {chat.stopped && <button onClick={onLogout}>Переподключиться</button>}
                </div>
              )}
              <div
                className="messages"
                ref={list}
                role="log"
                aria-label="Сообщения чата"
                aria-live="polite"
                aria-relevant="additions text"
                onScroll={() => {
                  const el = list.current!;
                  setNearBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 100);
                }}
              >
                <div className="chat-start">
                  <ShieldCheck size={14} />
                  <span>{demo ? 'Демонстрационная переписка' : 'Сообщения текущей сессии'}</span>
                </div>
                {messages.length === 0 && (
                  <div className="first-message">
                    <span className="empty-icon">
                      <MessageCircle size={30} />
                    </span>
                    <h3>Начните с «Привет!»</h3>
                    <p>Первое сообщение — начало хорошего разговора.</p>
                  </div>
                )}
                {messages.map((message, index) => {
                  const day = new Date(message.timestamp).toLocaleDateString('ru', {
                    day: 'numeric',
                    month: 'long',
                  });
                  const previousDay = index
                    ? new Date(messages[index - 1].timestamp).toLocaleDateString('ru', {
                        day: 'numeric',
                        month: 'long',
                      })
                    : '';
                  return (
                    <div className="message-group" key={message.id}>
                      {day !== previousDay && <div className="date-separator">{day}</div>}
                      <div className={`message-row ${message.direction}`}>
                        <div className="message-bubble">
                          <p>{message.text}</p>
                          <div className="message-meta">
                            <time dateTime={new Date(message.timestamp).toISOString()}>
                              {timeLabel(message.timestamp)}
                            </time>
                            {message.status && <Status status={message.status} />}
                          </div>
                          {(message.status === 'failed' || message.status === 'uncertain') && (
                            <small className="failure-label">{statusLabels[message.status]}</small>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!nearBottom && (
                <button
                  className="scroll-bottom icon-button"
                  aria-label="К последним сообщениям"
                  onClick={() => setNearBottom(true)}
                >
                  <ArrowDown size={20} />
                </button>
              )}
              <div className="composer-area">
                {chat.sendError && (
                  <div className="error-box send-error" role="alert">
                    <span>{chat.sendError}</span>
                    <button
                      className="icon-button"
                      aria-label="Скрыть ошибку"
                      onClick={chat.clearSendError}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                <form className="composer" onSubmit={submit}>
                  <textarea
                    ref={composer}
                    aria-label="Сообщение"
                    placeholder="Напишите сообщение…"
                    rows={1}
                    value={draft}
                    disabled={chat.stopped}
                    onChange={(e) => setDrafts({ ...drafts, [active.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        void submit();
                      }
                    }}
                  />
                  <button
                    className="send-button"
                    aria-label="Отправить сообщение"
                    disabled={
                      !draft.trim() || draft.length > MESSAGE_LIMIT || chat.sending || chat.stopped
                    }
                  >
                    {chat.sending ? (
                      <LoaderCircle className="spin" size={22} />
                    ) : (
                      <ArrowUp size={24} />
                    )}
                  </button>
                </form>
                <div className="composer-hint">
                  <span>
                    Enter — отправить <span>·</span> Shift + Enter — новая строка
                  </span>
                  <span
                    className={draft.length > MESSAGE_LIMIT ? 'over-limit' : ''}
                    aria-live={draft.length > MESSAGE_LIMIT ? 'polite' : 'off'}
                  >
                    {draft.length > 0
                      ? `${draft.length} / ${MESSAGE_LIMIT}`
                      : 'Только текст. Ничего лишнего.'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="welcome">
              <span className="empty-icon">
                <MessageCircle size={36} />
              </span>
              <h2>
                Хороший разговор
                <br />
                начинается здесь
              </h2>
              <p>
                Выберите диалог слева или создайте новый,
                <br />
                чтобы отправить сообщение в MAX.
              </p>
              <button className="primary" onClick={() => setNewChat(true)}>
                <MessageSquarePlus size={18} /> Новый диалог
              </button>
              {demo && <small>Вы в деморежиме. Отправка в MAX отключена.</small>}
            </div>
          )}
        </section>
      </div>
      <footer className="workspace-footer">
        <span>
          <ShieldCheck size={14} />{' '}
          {demo ? 'Демонстрация без подключения к API' : 'Ключ хранится только в памяти вкладки'}
        </span>
        <button onClick={() => setHelp(!help)} aria-expanded={help}>
          О приложении
        </button>
      </footer>
      {help && (
        <div className="about-panel">
          <strong>MAX Chat · React + GREEN-API</strong>
          <p>
            Неофициальный клиент для личных текстовых диалогов. История и ключ доступа очищаются при
            выходе или обновлении страницы. Входящие события очереди подтверждаются после обработки;
            вложения и групповые чаты не отображаются.
          </p>
          <button className="text-button" onClick={() => setHelp(false)}>
            Понятно
          </button>
        </div>
      )}
      {newChat && (
        <NewChatDialog onClose={() => setNewChat(false)} onCreate={chat.createChat} demo={demo} />
      )}
    </main>
  );
}
