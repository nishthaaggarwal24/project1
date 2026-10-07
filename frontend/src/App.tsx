import React, { lazy, Suspense, useState } from 'react';

const SystemA = lazy(() => import('./pages/SystemA'));
const SystemB = lazy(() => import('./pages/SystemB'));

function App() {
  const [activeTab, setActiveTab] = useState<'system-a' | 'system-b'>('system-a');

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1F2421]">
      {/* Top Editorial Hairline Header */}
      <div className="border-b border-[#E8AEA0]/60 bg-[#FFFDF9] px-4 py-1 text-[11px] text-[#78716C]">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono font-semibold text-[#D95338]">VOL. IV</span>
            <span className="hidden sm:inline text-[#E8AEA0]">|</span>
            <span className="hidden sm:inline">DREAM DATASET OBSERVATORY</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-wider">
            <span className="text-[#3A8898]">11,400 NARRATIVES</span>
            <span className="text-[#E8AEA0]">+</span>
            <span>VERIFIED CORPUS</span>
          </div>
        </div>
      </div>

      {/* Main Masthead Header */}
      <header className="border-b border-[#E8AEA0] bg-[#FFFDF9]/95 backdrop-blur-md sticky top-0 z-50 shadow-[0_2px_12px_rgba(222,107,72,0.04)]">
        <div className="container mx-auto px-4 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl border border-[#E8AEA0] bg-[#FAF7F2] flex items-center justify-center text-xl shadow-xs">
              <span className="text-[#D95338]">🌙</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-editorial tracking-tight text-[#D95338]">
                  DreamTwin AI
                </h1>
                <span className="text-xs font-mono font-bold text-[#DE6B48] px-2 py-0.5 rounded border border-[#E8AEA0] bg-[#FAF7F2]">
                  N° 01
                </span>
              </div>
              <p className="text-[11px] text-[#78716C] tracking-wide">
                Grounded Narrative Intelligence & Observational Records
              </p>
            </div>
          </div>

          {/* Editorial Workspace Switcher */}
          <nav className="flex space-x-1.5 bg-[#FAF7F2] p-1 rounded-xl border border-[#E8AEA0]">
            <button
              onClick={() => setActiveTab('system-a')}
              className={`px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all ${
                activeTab === 'system-a'
                  ? 'bg-[#DE6B48] text-white shadow-sm font-semibold'
                  : 'text-[#78716C] hover:text-[#D95338] hover:bg-[#FFFDF9]'
              }`}
            >
              Dream Workspace (Corpus)
            </button>
            <button
              onClick={() => setActiveTab('system-b')}
              className={`px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all ${
                activeTab === 'system-b'
                  ? 'bg-[#DE6B48] text-white shadow-sm font-semibold'
                  : 'text-[#78716C] hover:text-[#D95338] hover:bg-[#FFFDF9]'
              }`}
            >
              Organization Workspace
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-[#E8AEA0] bg-[#FFFDF9] p-8 text-center text-sm text-[#78716C]">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#E8AEA0] border-t-[#DE6B48] mb-3" />
              <p className="font-editorial text-base text-[#D95338]">Opening workspace…</p>
            </div>
          }
        >
          {activeTab === 'system-a' ? <SystemA /> : <SystemB />}
        </Suspense>
      </main>

      {/* Editorial Footer / Colophon */}
      <footer className="mt-16 border-t border-[#E8AEA0]/70 bg-[#FFFDF9] py-6 text-xs text-[#78716C]">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="font-bold text-[#D95338]">EN</span>
            <span className="text-[#E8AEA0]">·</span>
            <span>FR</span>
            <span className="text-[#E8AEA0]">·</span>
            <span>ES</span>
          </div>
          <div className="text-center font-editorial text-[13px] text-[#78716C]">
            Editorial Dream Observatory · Rigorous Source-Field Verification
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-[#3A8898] hover:underline cursor-pointer">Glossary</span>
            <span className="text-[#E8AEA0]">|</span>
            <span className="text-[#DE6B48] hover:underline cursor-pointer">Share</span>
            <span className="text-[#E8AEA0]">+</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
