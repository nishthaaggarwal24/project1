import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { TwinProfileResponse } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBanner from '../shared/ErrorBanner';

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
    <section className="glass-card p-6"><h3 className="font-semibold">What this score means</h3><p className="mt-3 text-sm leading-6 text-gray-400">It summarizes how much pattern information is in the dataset. The score gives equal weight to three things: the number of dreams (up to 100), how many tracked symbols recur in at least three dreams, and the average length of the narratives (up to 300 words).</p><p className="mt-3 text-sm leading-6 text-gray-400">The stages are simple score ranges: Dream Explorer (below 34), Pattern Recognition (34 to under 67), and Digital Twin Activated (67 or higher).</p><p className="mt-4 border-t border-dream-border pt-4 text-xs leading-5 text-amber-300">This CSV does not identify who recorded each dream or when it was recorded. The score describes the dataset as a whole; it does not track one person's progress or psychological development. It is a simple measure, not a probability.</p></section>
  </div>;
}
