import React, { useState } from 'react';
import TwinOverview from '../components/system-a/TwinOverview';
import DreamAnalyzer from '../components/system-a/DreamAnalyzer';
import SymbolEmotionMap from '../components/system-a/SymbolEmotionMap';
import TwinConversation from '../components/system-a/TwinConversation';
import DreamDNA from '../components/system-a/DreamDNA';
import SourceDashboard from '../components/system-a/SourceDashboard';

const tabs = [
  { id: 'overview', index: '1/6', label: 'Twin Overview' },
  { id: 'chat', index: '2/6', label: 'Twin Chat' },
  { id: 'progress', index: '3/6', label: 'Progress' },
  { id: 'map', index: '4/6', label: 'Signal Explorer' },
  { id: 'analyzer', index: '5/6', label: 'Add or Analyze a Dream' },
  { id: 'dna', index: '6/6', label: 'Dream Insights' },
];

export default function SystemA() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Editorial Section Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E8AEA0] gap-4">
        <div>
          <span className="text-[11px] font-mono tracking-widest uppercase text-[#DE6B48]">
            SECTION I · CORPUS WORKSPACE
          </span>
          <h2 className="text-2xl font-bold font-editorial text-[#1F2421]">
            Dream Corpus & Digital Twin
          </h2>
        </div>

        {/* Tab row */}
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs transition-all ${
                activeTab === tab.id
                  ? 'border-[#DE6B48] bg-[#FFFDF9] text-[#D95338] shadow-sm font-semibold'
                  : 'border-[#E8AEA0]/60 bg-[#FAF7F2] text-[#78716C] hover:border-[#DE6B48] hover:text-[#1F2421]'
              }`}
            >
              <span className={`font-mono text-[10px] ${activeTab === tab.id ? 'text-[#DE6B48]' : 'text-[#78716C]'}`}>
                {tab.index}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && <SourceDashboard />}
        {activeTab === 'chat' && <TwinConversation />}
        {activeTab === 'progress' && <TwinOverview />}
        {activeTab === 'map' && <SymbolEmotionMap />}
        {activeTab === 'analyzer' && <DreamAnalyzer />}
        {activeTab === 'dna' && <DreamDNA />}
      </div>
    </div>
  );
}
