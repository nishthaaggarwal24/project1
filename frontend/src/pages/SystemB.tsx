import React, { useState } from 'react';
import EmotionalClimate from '../components/system-b/EmotionalClimate';
import ClusterAnalysis from '../components/system-b/ClusterAnalysis';
import LiveIngestionStream from '../components/system-b/LiveIngestionStream';
import GovernanceAudit from '../components/system-b/GovernanceAudit';
import AdvancedObservatory from '../components/system-b/AdvancedObservatory';

const tabs = [
  { id: 'climate', label: 'Emotional Climate' },
  { id: 'analysis', label: 'Stress · Sleep · Network' },
  { id: 'cluster', label: 'Cluster Analysis' },
  { id: 'stream', label: 'Live Ingestion Stream' },
  { id: 'governance', label: 'Governance & Audit' },
];

export default function SystemB() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-dream-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-dream-indigo/20 text-indigo-400 border-b-2 border-indigo-500'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === 'climate' && <EmotionalClimate />}
        {activeTab === 'analysis' && <AdvancedObservatory />}
        {activeTab === 'cluster' && <ClusterAnalysis />}
        {activeTab === 'stream' && <LiveIngestionStream />}
        {activeTab === 'governance' && <GovernanceAudit />}
      </div>
    </div>
  );
}
