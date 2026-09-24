import { useState } from 'react';
import type { ChatApi, ChatState } from './types';
import { DemoApi, demoState } from './api/demoApi';
import { emptyState } from './lib/chatReducer';
import { Login } from './components/Login';
import { ChatWorkspace } from './components/ChatWorkspace';

type Session = { api: ChatApi; initialState: ChatState; demo: boolean };

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  return session ? (
    <ChatWorkspace {...session} onLogout={() => setSession(null)} />
  ) : (
    <Login
      onConnect={(api) => setSession({ api, initialState: emptyState, demo: false })}
      onDemo={() => setSession({ api: new DemoApi(), initialState: demoState(), demo: true })}
    />
  );
}
