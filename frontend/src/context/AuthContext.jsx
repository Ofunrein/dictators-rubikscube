/**
 * AuthContext.jsx — Global authentication state for the app
 *
 * Wraps the entire app (see main.jsx) so any component can read the current
 * user or call login/signup/logout without prop drilling.
 *
 * CURRENT STATE: all functions use mock data — no real backend calls yet.
 * When the database is ready, replace the bodies of login(), signup(), and
 * logout() with real fetch() calls. The shape of currentUser should match
 * MOCK_USER so the rest of the UI requires no changes.
 *
 * Usage anywhere in the app:
 *   const { currentUser, login, signup, logout } = useAuth();
 */
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const MOCK_USER = {
  id: '1',
  username: 'SpeedSolver',
  email: 'solver@example.com',
  joinedAt: 'January 2025',
  stats: {
    solves: 142,
    solvesBySize: { '3x3': 98, '2x2': 44 },
    best: { '3x3': 18.43, '2x2': 5.21 },
    avg: { '3x3': 24.7, '2x2': 7.8 },
    ranks: {
      '3x3': { fastest: 6, average: 6, solves: 6 },
      '2x2': { fastest: 3, average: 3, solves: 4 },
    },
  },
  recentSolves: [
    { cube: '3x3', time: 19.82, date: 'Apr 19' },
    { cube: '3x3', time: 21.05, date: 'Apr 19' },
    { cube: '2x2', time: 5.91, date: 'Apr 18' },
    { cube: '3x3', time: 18.43, date: 'Apr 16' },
  ],
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  function login(_email, _password) {
    // TODO: replace with real API call
    setCurrentUser(MOCK_USER);
  }

  function signup(username, _email, _password) {
    // TODO: replace with real API call
    setCurrentUser({ ...MOCK_USER, username });
  }

  function logout() {
    setCurrentUser(null);
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
