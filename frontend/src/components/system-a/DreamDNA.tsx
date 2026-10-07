import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { DreamDNAResponse } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBanner from '../shared/ErrorBanner';
import { FileText } from 'lucide-react';

export default function DreamDNA() {
  const [data, setData] = useState<DreamDNAResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchData = async () => {
    try { setLoading(true); setError(null); setData(await api.getDreamDNA()); }
    catch (err: any) { setError(err.message || 'Failed to load source summary'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;
  if (!data) return null;

  return <div className="mx-auto max-w-3xl">
    <section className="glass-card p-6 sm:p-8">
      <div className="flex items-start gap-4"><span className="rounded-xl bg-dream-purple/15 p-3 text-dream-purple"><FileText size={21}/></span><div><p className="text-xs uppercase tracking-[.2em] text-gray-500">Narrative profile</p><h2 className="mt-1 text-2xl font-semibold">Narrative richness</h2><p className="mt-2 text-sm leading-6 text-gray-400">A compact description of the source narratives, based only on their recorded word counts.</p></div></div>
      <div className="mt-8 flex items-end gap-3"><span className="text-5xl font-semibold tracking-tight">{Number.isFinite(data.narrative_richness) ? data.narrative_richness.toFixed(0) : '—'}</span><span className="pb-1 text-sm text-gray-500">/ 100</span></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-dream-dark"><div className="h-full rounded-full bg-dream-purple" style={{width:`${Math.max(0,Math.min(100,data.narrative_richness||0))}%`}}/></div>
      <p className="mt-4 text-xs leading-5 text-gray-500">Calculated as the mean narrative word count divided by 3, capped at 100. It is a corpus-level length measure, not a psychological trait or personal profile.</p>
      <p className="mt-5 border-t border-dream-border pt-4 text-[11px] text-gray-600">Based on {data.records_count.toLocaleString()} analyzable records in the source dataset.</p>
    </section>
  </div>;
}
