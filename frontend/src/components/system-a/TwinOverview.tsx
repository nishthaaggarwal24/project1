import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { TwinProfileResponse } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBanner from '../shared/ErrorBanner';
import { Activity } from 'lucide-react';

export default function TwinOverview() {
  const [data, setData] = useState<TwinProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try { setLoading(true); setError(null); setData(await api.getOverview()); }
    catch (err: any) { setError(err.message || 'Failed to fetch twin profile'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;
  if (!data) return null;

  return <div className="mx-auto max-w-4xl space-y-5">
    <section className="glass-card p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="mb-2 text-xs uppercase tracking-[.2em] text-gray-500">Progression</p><h2 className="text-2xl font-bold">Digital Twin Status</h2><div className="mt-3 inline-flex items-center gap-2 rounded-full border border-dream-purple/30 bg-dream-purple/20 px-4 py-1.5 text-dream-purple"><span className="h-2 w-2 rounded-full bg-dream-purple"/><span className="font-semibold">{data.stage}</span></div></div>
        <div className="w-full max-w-md"><div className="mb-2 flex justify-between text-sm"><span className="text-gray-400">Progress score</span><span className="font-mono text-dream-purple">{Math.round(data.progress_score)}%</span></div><div className="h-2.5 overflow-hidden rounded-full border border-dream-border bg-dream-dark/50"><div className="h-full rounded-full bg-gradient-to-r from-dream-indigo to-dream-purple transition-all duration-700" style={{width:`${Math.max(0,Math.min(100,data.progress_score))}%`}}/></div></div>
      </div>
    </section>
    <section className="glass-card p-6"><h3 className="flex items-center gap-2 font-semibold"><Activity size={16} className="text-dream-purple"/>How progress is calculated</h3><p className="mt-3 text-sm leading-6 text-gray-400">{data.confidence_formula}</p><p className="mt-4 border-t border-dream-border pt-4 text-xs leading-5 text-amber-300">This is a corpus-level heuristic. The dataset has no individual owner field, so progression does not represent a single person's subconscious history.</p></section>
  </div>;
}
