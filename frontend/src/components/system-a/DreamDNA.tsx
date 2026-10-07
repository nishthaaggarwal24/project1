import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { DreamDNAResponse } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBanner from '../shared/ErrorBanner';
import { BookOpen } from 'lucide-react';

export default function DreamDNA() {
  const [data, setData] = useState<DreamDNAResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await api.getDreamDNA());
    } catch (err: any) {
      setError(err.message || 'Failed to load source summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner message="Calculating narrative richness…" />;
  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;
  if (!data) return null;

  const score = Number.isFinite(data.narrative_richness) ? data.narrative_richness.toFixed(0) : '—';

  return (
    <div className="mx-auto max-w-3xl">
      <section className="glass-card p-6 sm:p-9 relative overflow-hidden group">
        <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

        <div className="flex items-center gap-2 mb-4 border-b border-[#E8AEA0]/50 pb-3">
          <span className="font-mono text-xs font-bold text-[#D95338]">6/6</span>
          <span className="text-[#E8AEA0]">|</span>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#78716C]">
            NARRATIVE TAXONOMY
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-[#E8AEA0] bg-[#FAF7F2] p-3.5 text-[#DE6B48]">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-bold font-editorial text-[#1F2421]">Narrative Richness Index</h2>
            <p className="mt-2 text-sm leading-6 text-[#57534E]">
              A syntactic density evaluation measuring descriptive verbosity across the 11,400 raw narratives.
            </p>
          </div>
        </div>

        {/* Oversized Anchor Number Inspired by Reference Image */}
        <div className="my-8 rounded-2xl border border-[#E8AEA0] bg-[#FAF7F2]/60 p-8 text-center relative overflow-hidden">
          {/* Decorative background typography accents */}
          <span className="absolute -top-4 -left-2 text-6xl text-[#E8AEA0]/20 font-editorial select-none">“</span>
          <span className="absolute -bottom-8 -right-2 text-7xl text-[#E8AEA0]/20 font-editorial select-none">”</span>

          <p className="text-xs font-mono tracking-widest uppercase text-[#78716C] mb-2">
            CORPUS RICHNESS RATING
          </p>

          <div className="flex items-center justify-center gap-2">
            <span className="text-7xl sm:text-8xl font-bold font-editorial text-[#D95338] tracking-tight">
              {score}
            </span>
            <span className="text-2xl font-editorial text-[#78716C] self-end pb-3">/ 100</span>
          </div>

          <div className="mt-6 max-w-md mx-auto h-3 overflow-hidden rounded-full border border-[#E8AEA0] bg-[#FFFDF9]">
            <div
              className="h-full rounded-full bg-[#DE6B48] transition-all duration-700"
              style={{ width: `${Math.max(0, Math.min(100, data.narrative_richness || 0))}%` }}
            />
          </div>
        </div>

        <p className="text-xs leading-5 text-[#78716C]">
          Calculated as the mean narrative word count divided by 3, capped at 100. It is a corpus-level length measure, not a psychological trait or personal profile.
        </p>
        <p className="mt-5 border-t border-[#E8AEA0]/50 pt-4 font-mono text-[11px] text-[#A8A29E]">
          Derived from {data.records_count.toLocaleString()} analyzable records in the source dataset.
        </p>
      </section>
    </div>
  );
}
