import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { AuditLogResponse, SyntheticCheckResponse } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBanner from '../shared/ErrorBanner';
import { ShieldCheck, ShieldAlert, FileSearch, History } from 'lucide-react';

export default function GovernanceAudit() {
  const [logs, setLogs] = useState<AuditLogResponse | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(true);
  
  const [checkResult, setCheckResult] = useState<SyntheticCheckResponse | null>(null);
  const [runningCheck, setRunningCheck] = useState(false);
  
  const [searchId, setSearchId] = useState('');
  const [provResult, setProvResult] = useState<any | null>(null); // Simplified for provenance

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Left Column */}
      <div className="space-y-6">
        
        {/* Synthetic Check Panel */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-dream-purple" />
                Dataset Integrity Check
              </h3>
              <p className="text-xs text-gray-400 mt-1">Verify no synthetic data has contaminated the workspace.</p>
            </div>
            <button 
              onClick={runSyntheticCheck}
              disabled={runningCheck}
              className="bg-dream-purple hover:bg-dream-indigo px-4 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {runningCheck ? 'Running...' : 'Run Audit Scan'}
            </button>
          </div>

          {checkResult && (
            <div className={`p-4 rounded-lg border ${checkResult.clean ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-rose-900/20 border-rose-500/30'}`}>
              <div className="flex items-center space-x-3 mb-2">
                {checkResult.clean ? <ShieldCheck className="w-6 h-6 text-emerald-400" /> : <ShieldAlert className="w-6 h-6 text-rose-400" />}
                <span className={`font-semibold ${checkResult.clean ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {checkResult.message}
                </span>
              </div>
              <ul className="text-sm text-gray-300 space-y-1 ml-9">
                <li>Count Verified: {checkResult.count_verified ? '✅ Yes' : '❌ No'}</li>
                {!checkResult.clean && checkResult.violations.map((v, i) => (
                  <li key={i} className="text-rose-400 text-xs mt-2">• {v}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Data Provenance */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold flex items-center mb-4">
            <FileSearch className="w-5 h-5 mr-2 text-dream-purple" />
            Data Provenance Explorer
          </h3>
          <div className="flex space-x-2 mb-4">
            <input 
              type="text" 
              placeholder="Enter a Dream_ID from the source CSV"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="flex-1 bg-dream-dark border border-dream-border rounded px-3 py-2 text-sm focus:outline-none focus:border-dream-purple"
            />
            <button onClick={handleSearch} className="bg-dream-dark border border-dream-border hover:bg-white/5 px-4 py-2 rounded text-sm transition-colors">
              Lookup
            </button>
          </div>

          {provResult && (
            <div className="bg-black/30 rounded p-4 border border-white/5">
              {provResult.error ? <p className="text-rose-400">{provResult.error}</p> : <><h4 className="text-sm font-mono text-indigo-300 mb-3 border-b border-white/10 pb-2">{provResult.dream_id}</h4>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-gray-500">Source:</span>
                <span className="text-gray-200">{provResult.source}</span>
                
                <span className="text-gray-500">Validation:</span>
                <span className="text-emerald-400 flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" /> {provResult.validation_status} (row digest {provResult.source_row_hash ? 'available' : 'unavailable'})
                </span>
                
                <span className="text-gray-500">Schema Match:</span>
                <span className="text-gray-200">{provResult.columns_present.join(', ')}</span>
              </div>
            </>}</div>
          )}
        </div>

      </div>

      {/* Right Column: Audit Log */}
      <div className="glass-card p-6 flex flex-col h-[600px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center">
            <History className="w-5 h-5 mr-2 text-dream-purple" />
            System Audit Log
          </h3>
          <button onClick={fetchLogs} className="text-xs text-gray-400 hover:text-white">Refresh</button>
        </div>

        {loadingLogs ? (
          <div className="flex-1 flex justify-center items-center"><LoadingSpinner /></div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar border border-dream-border rounded-lg bg-black/20">
            <table className="w-full text-left text-sm">
              <thead className="bg-dream-dark/80 sticky top-0 border-b border-dream-border">
                <tr>
                  <th className="px-4 py-2 text-xs text-gray-500 font-medium">Timestamp</th>
                  <th className="px-4 py-2 text-xs text-gray-500 font-medium">Event</th>
                  <th className="px-4 py-2 text-xs text-gray-500 font-medium">Target ID</th>
                  <th className="px-4 py-2 text-xs text-gray-500 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dream-border/50">
                {logs?.logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs">
                      <span className="bg-indigo-900/30 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
                        {log.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs font-mono text-gray-400">{log.dream_id || '-'}</td>
                    <td className="px-4 py-2 text-xs text-gray-300 truncate max-w-[200px]" title={log.details}>
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
