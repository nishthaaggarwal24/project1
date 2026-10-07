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
    try {
      setLoading(true);
      setError(null);
      setData(await api.getOverview());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch twin profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner message="Calculating pattern density…" />;
  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Editorial Progress Card */}
      <section className="glass-card p-6 sm:p-8 relative overflow-hidden group">
        <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

        <div className="flex items-center gap-2 mb-4 border-b border-[#E8AEA0]/50 pb-3">
          <span className="font-mono text-xs font-bold text-[#D95338]">3/6</span>
          <span className="text-[#E8AEA0]">|</span>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#78716C]">
            CORPUS PROGRESSION & DEPTH
          </span>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold font-editorial text-[#1F2421]">Digital Twin Status</h2>
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#E8AEA0] bg-[#FAF7F2] px-3.5 py-1.5 text-[#D95338]">
              <span className="h-2 w-2 rounded-full bg-[#DE6B48]" />
              <span className="font-medium text-xs font-mono">{data.stage}</span>
            </div>
          </div>

          <div className="w-full max-w-md bg-[#FAF7F2] border border-[#E8AEA0] rounded-2xl p-4">
            <div className="mb-2 flex justify-between items-baseline">
              <span className="text-xs font-mono uppercase text-[#78716C]">Corpus Pattern Score</span>
              <span className="font-editorial text-2xl font-bold text-[#D95338]">
                {Math.round(data.progress_score)}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border border-[#E8AEA0] bg-[#FFFDF9]">
              <div
                className="h-full rounded-full bg-[#DE6B48] transition-all duration-700"
                style={{ width: `${Math.max(0, Math.min(100, data.progress_score))}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Explanatory Panel */}
      <section className="glass-card p-6 sm:p-8 relative">
        <span className="corner-plus text-[#DE6B48]/50">+</span>
        <h3 className="text-xl font-bold font-editorial text-[#1F2421]">Methodology & Scoring Mechanics</h3>
        <p className="mt-3 text-sm leading-6 text-[#57534E]">
          This index synthesizes three reproducible dimensions with equal weighting: the total number of dream records (calibrated up to 100 entries), the breadth of recurring symbols present in three or more narratives, and average narrative word count (benchmarked up to 300 words).
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-[#E8AEA0]/60 bg-[#FAF7F2]">
            <span className="font-mono text-[10px] text-[#DE6B48]">0 - 33%</span>
            <p className="font-bold text-xs text-[#1F2421] mt-0.5">Dream Explorer</p>
          </div>
          <div className="p-3 rounded-xl border border-[#E8AEA0]/60 bg-[#FAF7F2]">
            <span className="font-mono text-[10px] text-[#DE6B48]">34 - 66%</span>
            <p className="font-bold text-xs text-[#1F2421] mt-0.5">Pattern Recognition</p>
          </div>
          <div className="p-3 rounded-xl border border-[#DE6B48] bg-[#FCE8E0]/40">
            <span className="font-mono text-[10px] text-[#D95338]">67 - 100%</span>
            <p className="font-bold text-xs text-[#1F2421] mt-0.5">Digital Twin Activated</p>
          </div>
        </div>
        <p className="mt-5 border-t border-[#E8AEA0]/50 pt-4 text-xs leading-5 text-[#B45309]">
          The underlying dataset does not specify individual authorship or chronological timestamps. Consequently, this metric models the corpus density as a unified whole, rather than the developmental arc of a single individual.
        </p>
      </section>
    </div>
  );
}
