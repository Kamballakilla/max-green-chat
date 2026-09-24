import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LoaderCircle, MessageSquarePlus, X } from 'lucide-react';
import { errorMessage } from '../lib/validation';

export function NewChatDialog({
  onClose,
  onCreate,
  demo,
}: {
  onClose: () => void;
  onCreate: (phone: string, name: string) => Promise<void>;
  demo: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await onCreate(phone, name);
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="new-chat-dialog"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      aria-labelledby="new-chat-title"
    >
      <button
        className="icon-button dialog-close"
        aria-label="Закрыть"
        onClick={onClose}
        disabled={busy}
      >
        <X size={20} />
      </button>
      <span className="login-lock">
        <MessageSquarePlus size={23} />
      </span>
      <h2 id="new-chat-title">Новый диалог</h2>
      <p>Начните с номера телефона собеседника.</p>
      <form onSubmit={submit}>
        <label htmlFor="phone">Номер телефона</label>
        <input
          id="phone"
          type="tel"
          placeholder="+7 999 123-45-67"
          autoFocus
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={busy}
        />
        <small>Россия (+7) или Беларусь (+375)</small>
        <label htmlFor="contact-name">
          Имя <span>необязательно</span>
        </label>
        <input
          id="contact-name"
          placeholder="Как зовут собеседника?"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
        />
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <button className="primary login-submit" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle size={18} className="spin" /> Проверяем номер…
            </>
          ) : (
            'Создать чат'
          )}
        </button>
        {demo && <p className="privacy">Деморежим: номер не отправляется в MAX.</p>}
      </form>
    </dialog>
  );
}
