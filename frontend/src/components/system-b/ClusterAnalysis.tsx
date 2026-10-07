import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';
import { ClusterAnalysisResponse } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorBanner from '../shared/ErrorBanner';
import EmotionBadge from '../shared/EmotionBadge';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ClusterAnalysis() {
  const [data, setData] = useState<ClusterAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getClusterAnalysis();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cluster data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <LoadingSpinner message="Deriving cluster groupings…" />;
  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;
  if (!data) return null;

  const scatterData = data.clusters.map(c => ({
    cluster_id: c.cluster_id,
    size: c.size,
    name: (c as any).name || `Cluster ${c.cluster_id}`
  }));

  return (
    <div className="space-y-6 text-[#1F2421]">
      <div className="glass-card p-6 sm:p-8 relative overflow-hidden group">
        <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

        <div className="flex items-center gap-2 mb-3 border-b border-[#E8AEA0]/50 pb-3">
          <span className="font-mono text-xs font-bold text-[#D95338]">3/5</span>
          <span className="text-[#E8AEA0]">|</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
            UNSUPERVISED CLUSTERING
          </span>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-2xl font-bold font-editorial text-[#1F2421]">Source Cluster Overview</h3>
            <p className="text-xs text-[#78716C] mt-1">{data.method}</p>
          </div>
          <span className="font-mono text-xs text-[#DE6B48] font-semibold px-2.5 py-1 rounded-lg border border-[#E8AEA0] bg-[#FAF7F2]">
            {data.records_count?.toLocaleString()} records
          </span>
        </div>

        {data.available && (
          <p className="text-xs leading-5 text-[#3A8898] mb-4">
            Selected {data.selected_k} groups by comparing silhouette and elbow scores. Every source narrative is assigned; the silhouette uses a fixed sample of up to 2,000 records to keep the calculation responsive.
          </p>
        )}
        {data.available && data.limitations?.length ? <ul className="mb-4 space-y-1 text-xs leading-5 text-[#78716C]">{data.limitations.map(item => <li key={item}>• {item}</li>)}</ul> : null}
        {!data.available && (
          <p className="text-xs text-[#B45309] mb-4 font-mono">{data.limitation}</p>
        )}

        {data.cluster_count_scores && data.cluster_count_scores.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs font-mono text-[#78716C] mb-5">
            {data.cluster_count_scores.map(score => (
              <span key={score.k} className="px-2 py-1 rounded-md border border-[#E8AEA0]/60 bg-[#FAF7F2]">
                k={score.k}: inertia {score.inertia.toFixed(1)}, sil {score.silhouette.toFixed(3)}, elbow {score.elbow_strength?.toFixed(2)}
              </span>
            ))}
          </div>
        )}

        {data.available && scatterData.length > 0 ? (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EED7CF" />
                <XAxis type="category" dataKey="name" name="Cluster" stroke="#78716C" fontSize={11} />
                <YAxis type="number" dataKey="size" name="Size" stroke="#78716C" fontSize={11} />
                <ZAxis type="number" range={[120, 1000]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  contentStyle={{ backgroundColor: '#FFFDF9', borderColor: '#E8AEA0', borderRadius: 12, color: '#1F2421' }}
                  formatter={(value: any, name: any) => [value, name === 'size' ? 'Size' : name]}
                />
                <Scatter name="Clusters" data={scatterData}>
                  {scatterData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="#DE6B48" />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div role="status" className="rounded-xl border border-[#E8AEA0] bg-[#FAF7F2] p-5 text-sm text-[#78716C]">
            {data.limitation || 'Clusters could not be derived from the available source narratives.'}
          </div>
        )}
      </div>

      {/* Cluster Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.clusters.map(cluster => (
          <div key={cluster.cluster_id} className="glass-card p-5 sm:p-6 flex flex-col relative overflow-hidden group">
            <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

            <div className="flex justify-between items-start mb-4 border-b border-[#E8AEA0]/50 pb-3">
              <div>
                <span className="px-2.5 py-1 bg-[#FAF7F2] text-[#D95338] rounded-lg text-xs font-mono font-bold border border-[#E8AEA0]">
                  {((cluster as any).name || `Cluster ${cluster.cluster_id}`)}
                </span>
                <span className="block text-[11px] font-mono text-[#78716C] mt-1.5">{cluster.size} narratives</span>
              </div>
              <EmotionBadge emotion={cluster.dominant_emotion} />
            </div>

            <div className="mb-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#78716C] mb-1.5">Top Cluster Keywords</p>
              <div className="flex flex-wrap gap-1">
                {cluster.top_keywords.map((kw, i) => (
                  <span key={i} className="text-[11px] font-mono bg-[#FAF7F2] border border-[#E8AEA0]/70 px-2 py-0.5 rounded text-[#2D3142]">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-auto border-t border-[#E8AEA0]/40 pt-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#78716C] mb-2">Representative Records</p>
              <div className="space-y-2">
                {cluster.representative_dreams.map(dream => (
                  <div key={dream.dream_id} className="bg-[#FAF7F2] border border-[#E8AEA0]/60 rounded-lg p-2.5">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-mono font-bold text-[#D95338]">{dream.dream_id}</span>
                      <EmotionBadge emotion={dream.emotion} className="!text-[9px] !px-1.5 !py-0" />
                    </div>
                    <p className="text-xs text-[#57534E] line-clamp-2 italic">“{dream.text}”</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
