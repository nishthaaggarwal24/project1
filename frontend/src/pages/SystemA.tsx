import React, { useState } from 'react';
import TwinOverview from '../components/system-a/TwinOverview';
import DreamAnalyzer from '../components/system-a/DreamAnalyzer';
import SymbolEmotionMap from '../components/system-a/SymbolEmotionMap';
import TwinConversation from '../components/system-a/TwinConversation';
import DreamDNA from '../components/system-a/DreamDNA';
import SourceDashboard from '../components/system-a/SourceDashboard';

const tabs = [
  { id: 'overview', label: 'Twin Overview' },
  { id: 'chat', label: 'Twin Chat' },
  { id: 'progress', label: 'Progress' },
  { id: 'map', label: 'Signal Explorer' },
  { id: 'analyzer', label: 'Add or Analyze a Dream' },
  { id: 'dna', label: 'Dream Insights' },
];

export default function SystemA() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-dream-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-dream-purple/20 text-dream-purple border-b-2 border-dream-purple'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && <SourceDashboard />}
        {activeTab === 'progress' && <TwinOverview />}
        {activeTab === 'analyzer' && <DreamAnalyzer />}
        {activeTab === 'map' && <SymbolEmotionMap />}
        {activeTab === 'chat' && <TwinConversation />}
        {activeTab === 'dna' && <DreamDNA />}
      </div>
    </div>
  );
}
