import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { SymbolFrequencyResponse, EmotionDistributionResponse, SentimentTrajectoryResponse } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBanner from '../shared/ErrorBanner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

const COLORS = ['#7c3aed', '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function SymbolEmotionMap() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [symbolData, setSymbolData] = useState<SymbolFrequencyResponse | null>(null);
  const [emotionData, setEmotionData] = useState<EmotionDistributionResponse | null>(null);
  const [trajectoryData, setTrajectoryData] = useState<SentimentTrajectoryResponse | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sym, emo, traj] = await Promise.all([
        api.getSymbolFrequencies(),
        api.getEmotionDistribution(),
        api.getSentimentTrajectory()
      ]);
      setSymbolData(sym);
      setEmotionData(emo);
      setTrajectoryData(traj);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visualization data');
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Top Symbol Frequencies</h3>
            <span className="text-xs text-gray-500">Based on {symbolData?.records_count} records</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symbolData?.symbols.slice(0, 11)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="symbol" type="category" stroke="#6b7280" fontSize={12} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1035', borderColor: '#2d2060', color: '#fff' }}
                  itemStyle={{ color: '#c4b5fd' }}
                />
                <Bar dataKey="frequency" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Emotion Distribution</h3>
            <span className="text-xs text-gray-500">Based on {emotionData?.records_count} records</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={emotionData?.distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="emotion"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {emotionData?.distribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1035', borderColor: '#2d2060', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 h-[400px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Source Sentiment Distribution</h3>
        </div>
        <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trajectoryData?.distribution || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2060" />
                <XAxis dataKey="sentiment" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1035', borderColor: '#2d2060', color: '#fff' }} />
                <Bar dataKey="count" name="Dream records" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-2">Source scores grouped as negative (≤ -0.05), neutral, and positive (≥ 0.05). Matching record IDs are available from the API response.</p>
      </div>
    </div>
  );
}
