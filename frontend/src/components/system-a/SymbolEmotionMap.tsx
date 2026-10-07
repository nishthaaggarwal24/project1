import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { SymbolFrequencyResponse, EmotionDistributionResponse, SentimentTrajectoryResponse } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBanner from '../shared/ErrorBanner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

const EDITORIAL_PALETTE = ['#DE6B48', '#3A8898', '#D9822B', '#5A7D7C', '#C2410C', '#4F5D75', '#B45309', '#78716C'];

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

  if (loading) return <LoadingSpinner message="Rendering editorial signals…" />;
  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      {/* Top 2 Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Symbol Frequencies */}
        <div className="glass-card p-6 sm:p-7 flex flex-col h-[420px] relative overflow-hidden group">
          <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>
          
          <div className="flex items-center gap-2 mb-2 border-b border-[#E8AEA0]/50 pb-2">
            <span className="font-mono text-xs font-bold text-[#D95338]">4a/6</span>
            <span className="text-[#E8AEA0]">|</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">LEXICAL TAXONOMY</span>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold font-editorial text-[#1F2421]">Top Symbol Frequencies</h3>
            <span className="text-xs font-mono text-[#78716C]">{symbolData?.records_count?.toLocaleString()} records</span>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symbolData?.symbols.slice(0, 11)} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EED7CF" horizontal={false} />
                <XAxis type="number" stroke="#78716C" fontSize={11} />
                <YAxis dataKey="symbol" type="category" stroke="#78716C" fontSize={11} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFDF9', borderColor: '#E8AEA0', borderRadius: 12, color: '#1F2421' }}
                  itemStyle={{ color: '#D95338' }}
                />
                <Bar dataKey="frequency" fill="#DE6B48" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Emotion Distribution */}
        <div className="glass-card p-6 sm:p-7 flex flex-col h-[420px] relative overflow-hidden group">
          <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

          <div className="flex items-center gap-2 mb-2 border-b border-[#E8AEA0]/50 pb-2">
            <span className="font-mono text-xs font-bold text-[#D95338]">4b/6</span>
            <span className="text-[#E8AEA0]">|</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">AFFECTIVE COMPOSITION</span>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold font-editorial text-[#1F2421]">Emotion Label Share</h3>
            <span className="text-xs font-mono text-[#78716C]">{emotionData?.records_count?.toLocaleString()} records</span>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={emotionData?.distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="emotion"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {emotionData?.distribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={EDITORIAL_PALETTE[index % EDITORIAL_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFDF9', borderColor: '#E8AEA0', borderRadius: 12, color: '#1F2421' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sentiment Trajectory */}
      <div className="glass-card p-6 sm:p-7 h-[380px] flex flex-col relative overflow-hidden group">
        <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

        <div className="flex items-center gap-2 mb-2 border-b border-[#E8AEA0]/50 pb-2">
          <span className="font-mono text-xs font-bold text-[#D95338]">4c/6</span>
          <span className="text-[#E8AEA0]">|</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">POLARITY METRICS</span>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold font-editorial text-[#1F2421]">Source Sentiment Distribution</h3>
          <span className="text-xs font-mono text-[#78716C]">Binned Corpus Ratings</span>
        </div>

        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trajectoryData?.distribution || []} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EED7CF" />
              <XAxis dataKey="sentiment" stroke="#78716C" fontSize={11} />
              <YAxis stroke="#78716C" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#FFFDF9', borderColor: '#E8AEA0', borderRadius: 12, color: '#1F2421' }} />
              <Bar dataKey="count" name="Dream records" fill="#3A8898" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] font-mono text-[#78716C] mt-3 border-t border-[#E8AEA0]/40 pt-2">
          Categorized into negative (≤ -0.05), neutral, and positive (≥ 0.05). Derived directly from supplied column scores.
        </p>
      </div>
    </div>
  );
}
