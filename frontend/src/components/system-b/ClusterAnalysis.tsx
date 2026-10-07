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

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} onRetry={fetchData} />;
  if (!data) return null;

  const scatterData = data.clusters.map(c => ({
    cluster_id: c.cluster_id,
    size: c.size,
    name: (c as any).name || `Cluster ${c.cluster_id}`
  }));

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Source Cluster Overview</h3>
          <span className="text-xs text-gray-500">Based on {data.records_count} records</span>
        </div>
        <p className="text-xs text-gray-300 mb-4">{data.method}</p>
        {data.available && <p className="text-xs text-indigo-300 mb-4">Selected k={data.selected_k} from equal-weight normalized elbow-curvature and silhouette scores. Source Cluster_ID values are blank and were not used.</p>}
        {!data.available && <p className="text-xs text-amber-300 mb-4">{data.limitation}</p>}
        {data.cluster_count_scores && data.cluster_count_scores.length > 0 && <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-4">{data.cluster_count_scores.map(score => <span key={score.k}>k={score.k}: inertia {score.inertia.toFixed(1)}, silhouette {score.silhouette.toFixed(3)}, elbow {score.elbow_strength?.toFixed(2)}</span>)}</div>}
        {data.available && scatterData.length > 0 ? <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2060" />
              <XAxis type="category" dataKey="name" name="Cluster" stroke="#9ca3af" />
              <YAxis type="number" dataKey="size" name="Size" stroke="#9ca3af" />
              <ZAxis type="number" range={[100, 1000]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ backgroundColor: '#1a1035', borderColor: '#2d2060', color: '#fff' }}
                formatter={(value: any, name: any) => [value, name === 'size' ? 'Size' : name]}
              />
              <Scatter name="Clusters" data={scatterData}>
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#7c3aed" />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div> : <div role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-5 text-sm leading-6 text-gray-400">The cluster chart is hidden because no cluster assignments are available. When sentence embeddings are ready and clustering succeeds, the chart will appear here.</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.clusters.map(cluster => (
          <div key={cluster.cluster_id} className="glass-card p-5 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-sm font-mono border border-indigo-500/30">
                  {((cluster as any).name || `Cluster ${cluster.cluster_id}`)}
                </span>
              </div>
              <EmotionBadge emotion={cluster.dominant_emotion} />
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">Keywords</p>
              <div className="flex flex-wrap gap-1">
                {cluster.top_keywords.map((kw, i) => (
                  <span key={i} className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-300">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-auto">
              <p className="text-xs text-gray-500 mb-2">Representative Dreams</p>
              <div className="space-y-2">
                {cluster.representative_dreams.map(dream => (
                  <div key={dream.dream_id} className="bg-dream-dark/50 border border-dream-border rounded p-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono text-gray-400">{dream.dream_id}</span>
                      <EmotionBadge emotion={dream.emotion} className="!text-[9px] !px-1.5 !py-0" />
                    </div>
                    <p className="text-[11px] text-gray-300 line-clamp-2 italic">"{dream.text}"</p>
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
