import { describe, expect, it } from 'vitest';
import { normalizePhone, validateCredentials } from '../lib/validation';

describe('Телефон получателя', () => {
  it.each([
    ['+7 (999) 123-45-67', '79991234567'],
    ['8 999 123 45 67', '79991234567'],
    ['+375 29 123-45-67', '375291234567'],
  ])('нормализует %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
  it.each(['123', '+1 555 123 4567', '+7 999 123-45-67abc', ''])('отклоняет %s', (input) =>
    expect(() => normalizePhone(input)).toThrow(),
  );
});

describe('Защита ключа от неверного адреса', () => {
  const credentials = {
    idInstance: '3100000001',
    apiTokenInstance: 'test-token',
    apiUrl: 'https://3100.api.green-api.com/',
  };
  it('принимает хост GREEN-API', () =>
    expect(validateCredentials(credentials).apiUrl).toBe('https://3100.api.green-api.com'));
  it.each([
    'http://3100.api.green-api.com',
    'https://green-api.com.evil.test',
    'https://api.green-api.com.evil.test',
    'https://evil.test',
    'https://api.green-api.com/?token=test',
    'https://user:secret@api.green-api.com',
    'https://api.green-api.com/extra',
  ])('отклоняет %s', (apiUrl) => {
    expect(() => validateCredentials({ ...credentials, apiUrl })).toThrow();
  });
});
