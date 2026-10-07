import React, { lazy, Suspense, useState } from 'react';

const SystemA = lazy(() => import('./pages/SystemA'));
const SystemB = lazy(() => import('./pages/SystemB'));

function App() {
  const [activeTab, setActiveTab] = useState<'system-a' | 'system-b'>('system-a');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a1035] to-[#0d1b2a] text-white">
      <header className="border-b border-dream-border bg-dream-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <span className="text-3xl">🌙</span>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-dream-purple to-indigo-400">DreamTwin AI</h1>
          </div>
          <nav className="flex space-x-2 bg-dream-dark/50 p-1 rounded-lg border border-dream-border">
            <button onClick={() => setActiveTab('system-a')} className={`px-4 py-2 rounded-md transition-all ${activeTab === 'system-a' ? 'bg-dream-purple text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Dream Workspace (Corpus)</button>
            <button onClick={() => setActiveTab('system-b')} className={`px-4 py-2 rounded-md transition-all ${activeTab === 'system-b' ? 'bg-dream-purple text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Organization Workspace</button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<div className="rounded-2xl border border-dream-border bg-dream-card p-8 text-sm text-gray-400">Opening workspace…</div>}>
          {activeTab === 'system-a' ? <SystemA /> : <SystemB />}
        </Suspense>
      </main>
    </div>
  );
}
export default App;
