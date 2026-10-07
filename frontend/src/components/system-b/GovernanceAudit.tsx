import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { AuditLogResponse, SyntheticCheckResponse } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import { ShieldCheck, ShieldAlert, FileSearch, History } from 'lucide-react';

export default function GovernanceAudit() {
  const [logs, setLogs] = useState<AuditLogResponse | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(true);
  
  const [checkResult, setCheckResult] = useState<SyntheticCheckResponse | null>(null);
  const [runningCheck, setRunningCheck] = useState(false);
  
  const [searchId, setSearchId] = useState('');
  const [provResult, setProvResult] = useState<any | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.getAuditLog();
      setLogs(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const runSyntheticCheck = async () => {
    try {
      setRunningCheck(true);
      const res = await api.getSyntheticCheck();
      setCheckResult(res);
    } catch (err) {
      console.error(err);
      setCheckResult({ clean: false, count_verified: false, violations: ['Failed to run check'], message: 'Error communicating with server' });
    } finally {
      setRunningCheck(false);
    }
  };

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    try {
      setProvResult(await api.getProvenance(searchId.trim()));
    } catch {
      setProvResult({ error: 'No matching record found.' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-[#1F2421]">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Synthetic Check Panel */}
        <div className="glass-card p-6 sm:p-7 relative overflow-hidden group">
          <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

          <div className="flex items-center gap-2 mb-3 border-b border-[#E8AEA0]/50 pb-2">
            <span className="font-mono text-xs font-bold text-[#D95338]">5a/5</span>
            <span className="text-[#E8AEA0]">|</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
              CORPUS INTEGRITY
            </span>
          </div>

          <div className="flex justify-between items-start mb-5 gap-3">
            <div>
              <h3 className="text-xl font-bold font-editorial text-[#1F2421] flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-[#DE6B48]" />
                Dataset Integrity Verification
              </h3>
              <p className="text-xs text-[#78716C] mt-1">Verify that no synthetic data has contaminated the workspace.</p>
            </div>
            <button 
              onClick={runSyntheticCheck}
              disabled={runningCheck}
              className="bg-[#DE6B48] hover:bg-[#D95338] text-white px-4 py-2 rounded-xl text-xs font-mono font-semibold transition disabled:opacity-50 shadow-xs"
            >
              {runningCheck ? 'Auditing…' : 'Run Audit'}
            </button>
          </div>

          {checkResult && (
            <div className={`p-4 rounded-xl border ${checkResult.clean ? 'bg-[#F0FDF4] border-[#86EFAC]' : 'bg-[#FFF1F2] border-[#FDA4AF]'}`}>
              <div className="flex items-center space-x-2.5 mb-2">
                {checkResult.clean ? <ShieldCheck className="w-5 h-5 text-[#15803D]" /> : <ShieldAlert className="w-5 h-5 text-[#BE123C]" />}
                <span className={`font-semibold text-sm ${checkResult.clean ? 'text-[#15803D]' : 'text-[#BE123C]'}`}>
                  {checkResult.message}
                </span>
              </div>
              <ul className="text-xs text-[#57534E] space-y-1 ml-7 font-mono">
                <li>Count Verified: {checkResult.count_verified ? 'Yes (Verified)' : 'No'}</li>
                {!checkResult.clean && checkResult.violations.map((v, i) => (
                  <li key={i} className="text-[#BE123C] text-xs mt-1">• {v}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Data Provenance Explorer */}
        <div className="glass-card p-6 sm:p-7 relative overflow-hidden group">
          <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

          <div className="flex items-center gap-2 mb-3 border-b border-[#E8AEA0]/50 pb-2">
            <span className="font-mono text-xs font-bold text-[#D95338]">5b/5</span>
            <span className="text-[#E8AEA0]">|</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
              SOURCE PROVENANCE
            </span>
          </div>

          <h3 className="text-xl font-bold font-editorial text-[#1F2421] flex items-center mb-3">
            <FileSearch className="w-5 h-5 mr-2 text-[#DE6B48]" />
            Data Provenance Explorer
          </h3>

          <div className="flex space-x-2 mb-4">
            <input 
              type="text" 
              placeholder="Enter a Dream_ID from source CSV..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="flex-1 bg-[#FAF7F2] border border-[#E8AEA0] rounded-xl px-3.5 py-2.5 text-xs text-[#1F2421] focus:outline-none focus:border-[#DE6B48] focus:bg-[#FFFDF9] transition"
            />
            <button 
              onClick={handleSearch} 
              className="border border-[#E8AEA0] bg-[#FAF7F2] hover:border-[#DE6B48] hover:text-[#D95338] px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition"
            >
              Lookup
            </button>
          </div>

          {provResult && (
            <div className="bg-[#FAF7F2] rounded-xl p-4 border border-[#E8AEA0]">
              {provResult.error ? (
                <p className="text-[#B91C1C] text-xs font-mono">{provResult.error}</p>
              ) : (
                <>
                  <h4 className="text-xs font-mono font-bold text-[#D95338] mb-3 border-b border-[#E8AEA0]/60 pb-2">
                    Record ID: {provResult.dream_id}
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <span className="text-[#78716C]">Source Dataset:</span>
                    <span className="text-[#1F2421] font-mono">{provResult.source}</span>
                    
                    <span className="text-[#78716C]">Validation Status:</span>
                    <span className="text-[#15803D] font-mono flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> {provResult.validation_status}
                    </span>
                    
                    <span className="text-[#78716C]">Schema Match:</span>
                    <span className="text-[#57534E] text-[11px] font-mono">{provResult.columns_present.join(', ')}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Audit Log */}
      <div className="glass-card p-6 sm:p-7 flex flex-col h-[620px] relative overflow-hidden group">
        <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

        <div className="flex items-center gap-2 mb-2 border-b border-[#E8AEA0]/50 pb-2">
          <span className="font-mono text-xs font-bold text-[#D95338]">5c/5</span>
          <span className="text-[#E8AEA0]">|</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">APPEND AUDIT LOG</span>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold font-editorial text-[#1F2421] flex items-center">
            <History className="w-5 h-5 mr-2 text-[#DE6B48]" />
            System Audit Log
          </h3>
          <button onClick={fetchLogs} className="text-xs font-mono text-[#DE6B48] hover:underline">
            Refresh
          </button>
        </div>

        {loadingLogs ? (
          <div className="flex-1 flex justify-center items-center"><LoadingSpinner message="Reading audit entries…" /></div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar border border-[#E8AEA0] rounded-xl bg-[#FAF7F2]/50">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#FAF7F2] sticky top-0 border-b border-[#E8AEA0] font-mono text-[#78716C]">
                <tr>
                  <th className="px-3.5 py-2.5 font-medium uppercase">Timestamp</th>
                  <th className="px-3.5 py-2.5 font-medium uppercase">Event</th>
                  <th className="px-3.5 py-2.5 font-medium uppercase">Target ID</th>
                  <th className="px-3.5 py-2.5 font-medium uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8AEA0]/50">
                {logs?.logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-[#FFFDF9] transition">
                    <td className="px-3.5 py-2 text-[#78716C] font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3.5 py-2">
                      <span className="bg-[#FAF7F2] text-[#D95338] px-2 py-0.5 rounded border border-[#E8AEA0] font-mono text-[10px]">
                        {log.event_type}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 font-mono font-bold text-[#DE6B48]">{log.dream_id || '-'}</td>
                    <td className="px-3.5 py-2 text-[#57534E] truncate max-w-[180px]" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
