import { createContext, useContext, useState } from 'react';
import { AUTHORIZED_USER, checkCredentials, saveSession, hasSession, clearSession } from '../lib/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(hasSession());

  function login(email, password) {
    if (checkCredentials(email, password)) {
      saveSession();
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }

  function logout() {
    clearSession();
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, user: AUTHORIZED_USER }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
