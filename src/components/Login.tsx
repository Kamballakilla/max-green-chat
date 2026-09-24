import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { GreenApi } from '../api/greenApi';
import { errorMessage, validateCredentials } from '../lib/validation';
import { Brand } from './Brand';

export function Login({
  onConnect,
  onDemo,
}: {
  onConnect: (api: GreenApi) => void;
  onDemo: () => void;
}) {
  const [idInstance, setId] = useState('');
  const [apiTokenInstance, setToken] = useState('');
  const [apiUrl, setUrl] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    try {
      const api = new GreenApi(validateCredentials({ idInstance, apiTokenInstance, apiUrl }));
      const controller = new AbortController();
      pending.current = controller;
      setBusy(true);
      await api.connect(controller.signal);
      if (!controller.signal.aborted) onConnect(api);
    } catch (reason) {
      if (!pending.current?.signal.aborted) setError(errorMessage(reason));
    } finally {
      pending.current = null;
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <header className="login-header">
        <Brand />
        <a href="https://green-api.com/v3/docs/" target="_blank" rel="noreferrer">
          Документация <ArrowRight size={15} />
        </a>
      </header>
      <div className="login-layout">
        <section className="login-story">
          <span className="eyebrow">
            <span className="green-dot" /> НА СВЯЗИ С GREEN-API
          </span>
          <h1>
            Ближе друг к другу.
            <br />
            <span>С каждым сообщением.</span>
          </h1>
          <p className="story-description">
            Ваши диалоги в MAX — в простом и удобном пространстве. Подключитесь и начните общение.
          </p>
          <div className="conversation-preview" aria-hidden="true">
            <div className="preview-top">
              <span className="avatar lavender">А</span>
              <div>
                <strong>Александр</strong>
                <small>MAX · личный чат</small>
              </div>
              <MessageCircle size={20} />
            </div>
            <div className="preview-message">
              Привет! На связи? <span>12:40</span>
            </div>
            <div className="preview-message mine">
              Да, давай обсудим 🙂{' '}
              <span>
                12:41 <Check size={13} />
              </span>
            </div>
            <div className="typing-dots">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="story-notes">
            <span>
              <Check size={16} /> Только нужные функции
            </span>
            <span>
              <Check size={16} /> Без установки
            </span>
          </div>
        </section>
        <section className="login-card" aria-labelledby="login-title">
          <span className="login-lock">
            <LockKeyhole size={22} />
          </span>
          <h2 id="login-title">Начнём общение</h2>
          <p>Подключите свой MAX-инстанс из GREEN-API.</p>
          <form onSubmit={submit}>
            <label htmlFor="instance">idInstance</label>
            <input
              id="instance"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Например, 3100000001"
              required
              value={idInstance}
              onChange={(e) => setId(e.target.value)}
              disabled={busy}
            />
            <label htmlFor="token">apiTokenInstance</label>
            <div className="password-field">
              <input
                id="token"
                type={showToken ? 'text' : 'password'}
                autoComplete="off"
                placeholder="Ваш ключ доступа"
                required
                value={apiTokenInstance}
                onChange={(e) => setToken(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                aria-label={showToken ? 'Скрыть ключ' : 'Показать ключ'}
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <label htmlFor="api-url">
              apiUrl <span>из личного кабинета</span>
            </label>
            <input
              id="api-url"
              type="url"
              placeholder="https://3100.api.green-api.com"
              required
              autoComplete="url"
              value={apiUrl}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
            />
            {error && (
              <p className="error-box" role="alert">
                {error}
              </p>
            )}
            <button className="primary login-submit" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={18} /> Подключаемся…
                </>
              ) : (
                <>
                  Подключиться <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <p className="privacy">
            <ShieldCheck size={16} /> Ключ доступа хранится только в памяти вкладки.
          </p>
          <div className="divider">
            <span>Хотите сначала посмотреть?</span>
          </div>
          <button className="secondary demo-button" disabled={busy} onClick={onDemo}>
            Открыть демо <ArrowRight size={16} />
          </button>
          <details className="setup-help">
            <summary>
              Как подготовить инстанс <ChevronDown size={15} />
            </summary>
            <ol>
              <li>
                Создайте MAX-инстанс в{' '}
                <a href="https://console.green-api.com/" target="_blank" rel="noreferrer">
                  кабинете GREEN-API
                </a>{' '}
                и авторизуйте его.
              </li>
              <li>Включите входящие уведомления. Поле webhookUrl оставьте пустым.</li>
              <li>
                Для статусов включите outgoingWebhook, outgoingAPIMessageWebhook и
                outgoingMessageWebhook.
              </li>
              <li>
                Скопируйте три значения из кабинета. Используйте инстанс только в одном клиенте
                получения.
              </li>
            </ol>
            <p>
              Чаты и сообщения сохраняются до обновления страницы. Клиент обрабатывает очередь
              уведомлений инстанса.
            </p>
          </details>
        </section>
      </div>
      <footer className="login-footer">
        <span>React · TypeScript · GREEN-API</span>
        <span>Учебный клиент MAX · Неофициальное приложение</span>
      </footer>
    </main>
  );
}
