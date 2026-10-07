import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/api';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';

const panel = 'rounded-2xl border border-[#E8AEA0] bg-[#FFFDF9] p-5 sm:p-6 relative overflow-hidden shadow-[0_4px_20px_-2px_rgba(222,107,72,0.06)]';
type Node = { id: string; label: string; type: string; count?: number; text?: string; emotion?: string };
type GraphEdge = { source: string; target: string; type?: string };

export default function AdvancedObservatory() {
  const [stress, setStress] = useState<any>();
  const [sleep, setSleep] = useState<any>();
  const [graph, setGraph] = useState<any>();
  const [selected, setSelected] = useState<Node | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ kind: 'node'; id: string } | { kind: 'pan'; clientX: number; clientY: number; startX: number; startY: number } | null>(null);
  const [error, setError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    Promise.all([api.getStressAnalysis(), api.getSleepStageAnalysis(), api.getDreamNetwork()])
      .then(([a, b, c]) => { setStress(a); setSleep(b); setGraph(c); })
      .catch(e => setError(e.message || 'Observatory data unavailable.'));
  }, []);

  const basePositions = useMemo(() => {
    if (!graph) return new Map<string, { x: number; y: number }>();
    const byType = {
      keyword: graph.nodes.filter((n: Node) => n.type === 'keyword'),
      dream: graph.nodes.filter((n: Node) => n.type === 'dream'),
      emotion: graph.nodes.filter((n: Node) => n.type === 'emotion'),
    };
    const out = new Map<string, { x: number; y: number }>();
    const put = (arr: Node[], x: number) => arr.forEach((n, i) => out.set(n.id, { x, y: 48 + i * (440 / Math.max(arr.length - 1, 1)) }));
    put(byType.keyword, 100);
    put(byType.dream, 390);
    put(byType.emotion, 680);
    return out;
  }, [graph]);

  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  useEffect(() => {
    setPositions(basePositions);
    setSelected(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [basePositions]);

  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    (graph?.edges || []).forEach((edge: GraphEdge) => {
      if (edge.source === selected?.id) ids.add(edge.target);
      if (edge.target === selected?.id) ids.add(edge.source);
    });
    return ids;
  }, [graph, selected]);

  const graphPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const sx = (clientX - rect.left) * 780 / rect.width;
    const sy = (clientY - rect.top) * 540 / rect.height;
    return { x: (sx - ((1 - zoom) * 390 + pan.x)) / zoom, y: (sy - ((1 - zoom) * 270 + pan.y)) / zoom };
  };

  const moveGraphPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    if (dragging.kind === 'node') {
      const point = graphPoint(event.clientX, event.clientY);
      if (point) setPositions(previous => {
        const next = new Map(previous);
        next.set(dragging.id, point);
        return next;
      });
    } else {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) setPan({
        x: dragging.startX + (event.clientX - dragging.clientX) * 780 / rect.width,
        y: dragging.startY + (event.clientY - dragging.clientY) * 540 / rect.height
      });
    }
  };

  const seen = new Map<string, number>();

  return (
    <div className="space-y-6 text-[#1F2421]">
      {error && <p className="text-sm font-mono text-[#B91C1C]">{error}</p>}

      {/* Top Split: Stress Analysis & Relationship */}
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className={panel}>
          <span className="corner-plus text-[#DE6B48]/50">+</span>
          <div className="flex items-center gap-2 mb-2 border-b border-[#E8AEA0]/50 pb-2">
            <span className="font-mono text-xs font-bold text-[#D95338]">2a/5</span>
            <span className="text-[#E8AEA0]">|</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">PHYSIOLOGICAL COVARIATION</span>
          </div>

          <h2 className="text-xl font-bold font-editorial text-[#1F2421]">Pre-Sleep Stress Analysis</h2>
          <p className="mt-1 text-xs text-[#78716C]">Observed Stress_Before_Sleep distribution against source sentiment.</p>
          
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#E8AEA0]/70 bg-[#FAF7F2] p-3.5">
              <p className="text-[11px] font-mono uppercase text-[#78716C]">Records with stress</p>
              <p className="mt-1 text-2xl font-bold font-editorial text-[#1F2421]">{stress?.record_count?.toLocaleString() ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-[#E8AEA0]/70 bg-[#FAF7F2] p-3.5">
              <p className="text-[11px] font-mono uppercase text-[#78716C]">Mean stress</p>
              <p className="mt-1 text-2xl font-bold font-editorial text-[#1F2421]">{stress?.mean_stress?.toFixed(2) ?? '—'}</p>
            </div>
            <div className="col-span-2 rounded-xl border border-[#DE6B48] bg-[#FCE8E0]/40 p-4">
              <p className="text-[11px] font-mono uppercase text-[#D95338] font-semibold">Stress / Sentiment Pearson r</p>
              <p className="mt-1 text-3xl font-bold font-editorial text-[#D95338]">{stress?.stress_sentiment_correlation?.toFixed(3) ?? 'Unavailable'}</p>
              <p className="mt-1 text-[11px] text-[#78716C]">{stress?.correlation_records?.toLocaleString() ?? 0} rows contain both values. Correlation describes statistical association only.</p>
            </div>
          </div>

          <div className="mt-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stress?.distribution || []}>
                <CartesianGrid stroke="#EED7CF" strokeDasharray="3 3" />
                <XAxis dataKey="range" stroke="#78716C" fontSize={11} />
                <YAxis stroke="#78716C" fontSize={11} />
                <Tooltip contentStyle={{ background: '#FFFDF9', border: '1px solid #E8AEA0', borderRadius: 12, color: '#1F2421' }} />
                <Bar dataKey="count" fill="#DE6B48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={panel}>
          <span className="corner-plus text-[#DE6B48]/50">+</span>
          <div className="flex items-center gap-2 mb-2 border-b border-[#E8AEA0]/50 pb-2">
            <span className="font-mono text-xs font-bold text-[#D95338]">2b/5</span>
            <span className="text-[#E8AEA0]">|</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">SCATTER CORRELATION</span>
          </div>

          <h2 className="text-xl font-bold font-editorial text-[#1F2421]">Stress & Sentiment Scatter</h2>
          <p className="mb-2 mt-1 text-xs text-[#78716C]">Each plotted point corresponds to an exact CSV Dream_ID with both numeric coordinates.</p>
          
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 18, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="#EED7CF" strokeDasharray="3 3" />
                <XAxis type="number" dataKey="stress" name="Pre-sleep stress" domain={[0, 1]} stroke="#78716C" fontSize={11} />
                <YAxis type="number" dataKey="sentiment" name="Sentiment" domain={[-1, 1]} stroke="#78716C" fontSize={11} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#FFFDF9', border: '1px solid #E8AEA0', borderRadius: 12, color: '#1F2421' }} formatter={(v: any, n: any) => [Number(v).toFixed(3), n]} />
                <Scatter data={stress?.points || []} fill="#DE6B48" fillOpacity={0.45} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] font-mono text-[#78716C] mt-2 border-t border-[#E8AEA0]/40 pt-2">Supplied source annotations · no causal inference claimed.</p>
        </section>
      </div>

      {/* Sleep Stage Analysis Table */}
      <section className={panel}>
        <span className="corner-plus text-[#DE6B48]/50">+</span>
        <div className="flex items-center gap-2 mb-2 border-b border-[#E8AEA0]/50 pb-2">
          <span className="font-mono text-xs font-bold text-[#D95338]">2c/5</span>
          <span className="text-[#E8AEA0]">|</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">SLEEP TAXONOMY</span>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-bold font-editorial text-[#1F2421]">Sleep Stage Partitioning</h2>
          <p className="mt-1 text-xs text-[#78716C]">Corpus breakdowns by Sleep_Stage column values.</p>
        </div>

        {sleep?.stages?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs font-mono text-[#78716C] border-b border-[#E8AEA0]">
                <tr>
                  <th className="pb-3 uppercase">Stage</th>
                  <th className="pb-3 uppercase">Records</th>
                  <th className="pb-3 uppercase">Mean sentiment</th>
                  <th className="pb-3 uppercase">Mean words</th>
                  <th className="pb-3 uppercase">Emotion distribution</th>
                  <th className="pb-3 uppercase">Activity distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8AEA0]/50 font-sans">
                {sleep.stages.map((s: any) => (
                  <tr key={s.sleep_stage} className="hover:bg-[#FAF7F2] transition">
                    <td className="py-3 font-bold font-editorial text-[#D95338]">{s.sleep_stage}</td>
                    <td className="font-mono text-xs">{s.dream_count.toLocaleString()}</td>
                    <td className="font-mono text-xs">{s.average_sentiment?.toFixed(2) ?? '—'}</td>
                    <td className="font-mono text-xs">{s.average_word_count?.toFixed(0) ?? '—'}</td>
                    <td className="max-w-48 truncate text-xs text-[#57534E]">
                      {Object.entries(s.emotion_distribution).map(([k, v]) => `${k} (${v})`).join(' · ') || 'Unlabeled'}
                    </td>
                    <td className="max-w-48 truncate text-xs text-[#57534E]">
                      {Object.entries(s.activity_distribution).map(([k, v]) => `${k} (${v})`).join(' · ') || 'Unlabeled'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#78716C]">No sleep-stage annotations available.</p>
        )}
      </section>

      {/* Dream Network Graph */}
      <section className={panel}>
        <span className="corner-plus text-[#DE6B48]/50">+</span>
        <div className="flex items-center gap-2 mb-2 border-b border-[#E8AEA0]/50 pb-2">
          <span className="font-mono text-xs font-bold text-[#D95338]">2d/5</span>
          <span className="text-[#E8AEA0]">|</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">TOPOLOGY GRAPH</span>
        </div>

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold font-editorial text-[#1F2421]">Dream Network Graph</h2>
            <p className="mt-1 text-xs text-[#78716C]">Interactive topology · drag nodes to reposition · drag background to pan · scroll to zoom</p>
          </div>
          <div className="flex gap-2 font-mono">
            <button onClick={() => setZoom(Math.max(0.65, zoom - 0.15))} className="rounded-xl border border-[#E8AEA0] bg-[#FAF7F2] px-3 py-1 text-sm hover:border-[#DE6B48] transition">−</button>
            <span className="self-center text-xs text-[#78716C] px-1">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(2.2, zoom + 0.15))} className="rounded-xl border border-[#E8AEA0] bg-[#FAF7F2] px-3 py-1 text-sm hover:border-[#DE6B48] transition">+</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setPositions(basePositions); }} className="rounded-xl border border-[#E8AEA0] bg-[#FAF7F2] px-3 py-1 text-xs text-[#78716C] hover:border-[#DE6B48] hover:text-[#D95338] transition">Reset</button>
          </div>
        </div>

        {graph && (
          <div className="grid gap-4 lg:grid-cols-[1fr_310px]">
            <div className="overflow-hidden rounded-xl border border-[#E8AEA0] bg-[#FAF7F2]/50">
              <svg
                ref={svgRef}
                viewBox="0 0 780 540"
                className={`min-h-[380px] w-full ${dragging?.kind === 'pan' ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{ minWidth: 650, touchAction: 'none' }}
                onPointerDown={e => {
                  if (e.target === e.currentTarget) {
                    setDragging({ kind: 'pan', clientX: e.clientX, clientY: e.clientY, startX: pan.x, startY: pan.y });
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }
                }}
                onPointerMove={moveGraphPointer}
                onPointerUp={e => {
                  setDragging(null);
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                }}
                onPointerCancel={() => setDragging(null)}
                onWheel={e => {
                  e.preventDefault();
                  setZoom(value => Math.max(0.65, Math.min(2.2, value + (e.deltaY < 0 ? 0.1 : -0.1))));
                }}
              >
                <g transform={`translate(${(1 - zoom) * 390 + pan.x} ${(1 - zoom) * 270 + pan.y}) scale(${zoom})`}>
                  {graph.edges.map((e: any, i: number) => {
                    const a = positions.get(e.source), b = positions.get(e.target);
                    if (!a || !b) return null;
                    const key = e.source + '|' + e.target;
                    const repeat = seen.get(key) || 0;
                    seen.set(key, repeat + 1);
                    const shift = (repeat % 7 - 3) * 2.5;
                    return (
                      <line
                        key={i}
                        x1={a.x}
                        y1={a.y + shift}
                        x2={b.x}
                        y2={b.y + shift}
                        stroke={e.type === 'emotion' ? '#DE6B48' : '#3A8898'}
                        strokeOpacity={selected ? ((e.source === selected.id || e.target === selected.id) ? 0.8 : 0.08) : 0.28}
                        strokeWidth={selected && (e.source === selected.id || e.target === selected.id) ? 2 : 1.2}
                      />
                    );
                  })}
                  {graph.nodes.map((n: Node) => {
                    const p = positions.get(n.id);
                    if (!p) return null;
                    const color = n.type === 'keyword' ? '#DE6B48' : n.type === 'emotion' ? '#D9822B' : '#3A8898';
                    const active = selected?.id === n.id;
                    const linked = connectedIds.has(n.id);
                    return (
                      <g
                        key={n.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${n.type}: ${n.label}`}
                        onClick={() => setSelected(n)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(n); } }}
                        onPointerDown={e => {
                          e.stopPropagation();
                          setSelected(n);
                          setDragging({ kind: 'node', id: n.id });
                          svgRef.current?.setPointerCapture(e.pointerId);
                        }}
                        className="cursor-grab active:cursor-grabbing"
                        style={{ opacity: selected && !active && !linked ? 0.25 : 1, transition: 'opacity 140ms ease' }}
                      >
                        <title>{`${n.type}: ${n.label}${n.count !== undefined ? ` · ${n.count} records` : ''}. Drag to move; click to inspect.`}</title>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={active ? 9 : n.type === 'dream' ? 3.5 : 7}
                          fill={color}
                          fillOpacity={n.type === 'dream' ? 0.75 : 1}
                          stroke={active ? '#1F2421' : linked ? '#DE6B48' : '#FFFDF9'}
                          strokeWidth={active ? 2.5 : 1.5}
                        />
                        {n.type !== 'dream' && (
                          <text
                            pointerEvents="none"
                            x={p.x + 12}
                            y={p.y + 4}
                            fill={active ? '#1F2421' : '#57534E'}
                            fontSize={active ? '11' : '10'}
                            fontWeight={active ? '700' : '500'}
                            fontFamily="Plus Jakarta Sans"
                          >
                            {n.label.length > 19 ? n.label.slice(0, 18) + '…' : n.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>

              <div className="flex flex-wrap gap-4 border-t border-[#E8AEA0] bg-[#FFFDF9] px-4 py-2.5 text-[11px] font-mono text-[#78716C]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#DE6B48]" /> Keyword</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#D9822B]" /> Emotion</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3A8898]" /> Dream</span>
                <span className="ml-auto">{graph.shown_dreams} dream nodes</span>
              </div>
            </div>

            {/* Inspector aside */}
            <aside className="rounded-xl border border-[#E8AEA0] bg-[#FAF7F2] p-4 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#DE6B48]">SELECTED NODE</p>
                {selected ? (
                  <>
                    <p className="mt-2 text-base font-bold font-editorial text-[#1F2421]">{selected.label}</p>
                    {selected.type === 'dream' && (
                      <>
                        <p className="mt-1 text-xs font-mono text-[#D95338]">{selected.emotion} · {selected.id.replace('dream:', '')}</p>
                        <p className="mt-3 max-h-52 overflow-y-auto text-xs leading-5 text-[#57534E] custom-scrollbar bg-[#FFFDF9] p-3 rounded-lg border border-[#E8AEA0]/60">
                          {selected.text}
                        </p>
                      </>
                    )}
                    {selected.type === 'keyword' && (
                      <p className="mt-2 text-xs text-[#57534E]">{selected.count?.toLocaleString()} source records contain this keyword.</p>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-xs text-[#78716C]">Select any node on the graph to inspect underlying dream citations.</p>
                )}
              </div>

              <div className="mt-4 border-t border-[#E8AEA0]/50 pt-3 text-[11px] font-mono text-[#78716C]">
                <p>{connectedIds.size} connected nodes</p>
                <p className="mt-1 text-[10px] text-[#A8A29E] leading-4">{graph.method}</p>
              </div>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
