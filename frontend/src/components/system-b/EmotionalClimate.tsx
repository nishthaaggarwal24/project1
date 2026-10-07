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

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      <p className="text-xs text-amber-300">These percentages count exact source Emotion labels among labeled rows. They are corpus summaries, not validated psychological indices.</p>

      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold">Observed Emotional Climate</h3>
          <span className="text-xs text-zinc-400">{(climate?.supporting_records ?? 0).toLocaleString()} labeled records</span>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={climate?.indices || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2060" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1035', borderColor: '#2d2060', color: '#fff' }}
                formatter={(value: number, _name: string, item: any) => [`${(value * 100).toFixed(1)}% · ${item.payload.count} records`, 'Share']}
              />
              <Bar dataKey="percentage" name="Share of labeled dreams" fill="#ff8c00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
