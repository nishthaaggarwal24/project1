import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { EmotionalClimateResponse } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBanner from '../shared/ErrorBanner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function EmotionalClimate() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [climate, setClimate] = useState<EmotionalClimateResponse | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const clim = await api.getEmotionalClimate();
      setClimate(clim);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch climate data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner message="Calculating affective climate…" />;
  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 sm:p-8 relative overflow-hidden group">
        <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

        <div className="flex items-center gap-2 mb-3 border-b border-[#E8AEA0]/50 pb-3">
          <span className="font-mono text-xs font-bold text-[#D95338]">1/5</span>
          <span className="text-[#E8AEA0]">|</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
            POPULATION AFFECT
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <div>
            <h3 className="text-2xl font-bold font-editorial text-[#1F2421]">Observed Emotional Climate</h3>
            <p className="text-xs text-[#78716C] mt-1">Relative frequency of verbatim emotion annotations across all records.</p>
          </div>
          <span className="font-mono text-xs text-[#DE6B48] font-semibold px-2.5 py-1 rounded-lg border border-[#E8AEA0] bg-[#FAF7F2] self-start sm:self-auto">
            {(climate?.supporting_records ?? 0).toLocaleString()} labeled records
          </span>
        </div>

        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={climate?.indices || []} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EED7CF" vertical={false} />
              <XAxis dataKey="name" stroke="#78716C" fontSize={11} />
              <YAxis stroke="#78716C" fontSize={11} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFFDF9', borderColor: '#E8AEA0', borderRadius: 12, color: '#1F2421' }}
                formatter={(value: number, _name: string, item: any) => [`${(value * 100).toFixed(1)}% · ${item.payload.count} records`, 'Proportion']}
              />
              <Bar dataKey="percentage" name="Share of labeled dreams" fill="#DE6B48" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] font-mono text-[#78716C] mt-4 border-t border-[#E8AEA0]/40 pt-3">
          Percentages count exact source Emotion labels among labeled rows. They are empirical corpus summaries, not clinical indices.
        </p>
      </div>
    </div>
  );
}
