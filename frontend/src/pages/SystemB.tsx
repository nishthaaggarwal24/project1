import React, { useState } from 'react';
import EmotionalClimate from '../components/system-b/EmotionalClimate';
import ClusterAnalysis from '../components/system-b/ClusterAnalysis';
import LiveIngestionStream from '../components/system-b/LiveIngestionStream';
import GovernanceAudit from '../components/system-b/GovernanceAudit';
import AdvancedObservatory from '../components/system-b/AdvancedObservatory';

const tabs = [
  { id: 'climate', index: '1/5', label: 'Emotional Climate' },
  { id: 'analysis', index: '2/5', label: 'Stress · Sleep · Network' },
  { id: 'cluster', index: '3/5', label: 'Cluster Analysis' },
  { id: 'stream', index: '4/5', label: 'Live Ingestion Stream' },
  { id: 'governance', index: '5/5', label: 'Governance & Audit' },
];

export default function SystemB() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="space-y-6">
      {/* Editorial Section Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E8AEA0] gap-4">
        <div>
          <span className="text-[11px] font-mono tracking-widest uppercase text-[#DE6B48]">
            SECTION II · ORGANIZATIONAL RESEARCH
          </span>
          <h2 className="text-2xl font-bold font-editorial text-[#1F2421]">
            Population Dynamics & Integrity
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
        {activeTab === 'climate' && <EmotionalClimate />}
        {activeTab === 'analysis' && <AdvancedObservatory />}
        {activeTab === 'cluster' && <ClusterAnalysis />}
        {activeTab === 'stream' && <LiveIngestionStream />}
        {activeTab === 'governance' && <GovernanceAudit />}
      </div>
    </div>
  );
}
