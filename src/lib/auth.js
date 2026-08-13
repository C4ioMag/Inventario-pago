export const AUTHORIZED_USER = {
  email: 'caio@powerconnectusa.com',
  password: 'Caio123',
  name: 'Caio',
};

const SESSION_KEY = 'estoque_session';

export function checkCredentials(email, password) {
  return (
    email.trim().toLowerCase() === AUTHORIZED_USER.email &&
    password === AUTHORIZED_USER.password
  );
}

export function saveSession() {
  localStorage.setItem(SESSION_KEY, '1');
}

export function hasSession() {
  return localStorage.getItem(SESSION_KEY) === '1';
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
