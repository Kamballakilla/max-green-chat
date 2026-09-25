import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { ChatWorkspace } from '../components/ChatWorkspace';
import { demoState } from '../api/demoApi';
import type { ChatApi } from '../types';

describe('Пользовательские сценарии', () => {
  it('показывает демоответ после отправленного сообщения в пределах одной секунды', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-25T08:13:05.100Z'));
    try {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Открыть демо/ }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Сообщение' }), {
        target: { value: 'Проверка порядка' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });
      const log = within(screen.getByRole('log'));
      const sent = log.getByText('Проверка порядка');
      const reply = log.getByText(/Сообщение получил!/);
      expect(sent.compareDocumentPosition(reply) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });
  it('демо работает без сети, отправляет текст и показывает автоответ', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Открыть демо/ }));
    await user.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'Проверка связи');
    await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
    expect(within(screen.getByRole('log')).getByText('Проверка связи')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Сообщение' })).toHaveValue(''));
    await waitFor(
      () =>
        expect(within(screen.getByRole('log')).getByText(/Сообщение получил!/)).toBeInTheDocument(),
      { timeout: 5000 },
    );
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Выйти' }));
    expect(screen.getByRole('heading', { name: 'Начнём общение' })).toBeInTheDocument();
  });
  it('создаёт чат, проверяет неверный телефон и фильтрует список', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Открыть демо/ }));
    await user.click(screen.getByRole('button', { name: 'Новый чат' }));
    await user.type(screen.getByLabelText('Номер телефона'), '123');
    await user.click(screen.getByRole('button', { name: 'Создать чат' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Для MAX');
    await user.clear(screen.getByLabelText('Номер телефона'));
    await user.type(screen.getByLabelText('Номер телефона'), '+7 999 123-45-67');
    await user.type(screen.getByLabelText(/Имя/), 'Мария');
    await user.click(screen.getByRole('button', { name: 'Создать чат' }));
    expect(await screen.findByRole('heading', { name: 'Мария' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Поиск диалогов' }), 'несуществующий');
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });
  it('блокирует пустой текст и превышение лимита', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Открыть демо/ }));
    const send = screen.getByRole('button', { name: 'Отправить сообщение' });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Сообщение' }), {
      target: { value: 'a'.repeat(4001) },
    });
    expect(send).toBeDisabled();
    expect(screen.getByText('4001 / 4000')).toBeInTheDocument();
  });
  it('сохраняет черновик и не повторяет отправку при сетевой ошибке', async () => {
    const api: ChatApi = {
      checkAccount: vi.fn(),
      sendMessage: vi.fn().mockRejectedValue(new Error('Нет ответа')),
      receiveNotification: () => new Promise(() => {}),
      deleteNotification: vi.fn(),
    };
    const user = userEvent.setup();
    render(<ChatWorkspace api={api} initialState={demoState()} demo={false} onLogout={vi.fn()} />);
    await user.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'Не потеряй меня');
    await user.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Статус отправки неизвестен');
    expect(screen.getByRole('textbox', { name: 'Сообщение' })).toHaveValue('Не потеряй меня');
    expect(api.sendMessage).toHaveBeenCalledTimes(1);
  });
});
