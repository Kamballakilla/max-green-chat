import type { Credentials } from '../types';

export const MESSAGE_LIMIT = 4000;

export function normalizePhone(input: string): string {
  if (!/^[+\d\s()-]+$/.test(input))
    throw new Error('Введите номер телефона, используя цифры, +, пробелы или скобки.');
  const digits = input.replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7');
  if (!/^(7\d{10}|375\d{9})$/.test(digits)) {
    throw new Error('Для MAX укажите номер РФ (+7) или Беларуси (+375).');
  }
  return digits;
}

export function validateCredentials(value: Credentials): Credentials {
  const idInstance = value.idInstance.trim();
  const apiTokenInstance = value.apiTokenInstance.trim();
  if (!/^\d+$/.test(idInstance)) throw new Error('idInstance должен состоять из цифр.');
  if (!/^[a-zA-Z0-9_-]+$/.test(apiTokenInstance))
    throw new Error('Проверьте apiTokenInstance: скопируйте ключ целиком из кабинета.');
  let url: URL;
  try {
    url = new URL(value.apiUrl.trim());
  } catch {
    throw new Error('Укажите корректный apiUrl из личного кабинета.');
  }
  if (
    url.protocol !== 'https:' ||
    !/^(?:[a-z0-9-]+\.)*api\.green-api\.com$/.test(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !['', '/'].includes(url.pathname)
  ) {
    throw new Error('apiUrl должен быть HTTPS-адресом API GREEN-API без пути и параметров.');
  }
  return { apiUrl: url.origin, idInstance, apiTokenInstance };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Не удалось выполнить запрос. Попробуйте ещё раз.';
}

export function timeLabel(timestamp: number): string {
  return new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(timestamp);
}
