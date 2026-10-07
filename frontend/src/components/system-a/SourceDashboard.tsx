import React, { useEffect, useState } from 'react';
import { Search, Sparkles, Activity, Moon, HeartPulse, ArrowUpRight } from 'lucide-react';
import { api } from '../../api/api';
import TwinConversation from './TwinConversation';

type Snapshot = {
  total_dreams: number; source_row_count: number; excluded_row_count: number; excluded_source_rows: number[]; average_sentiment: number | null; lucid_count: number; lucidity_rate: number | null;
  lucid_average_sentiment: number | null; nonlucid_average_sentiment: number | null;
  most_common_emotion: { value: string; count: number; evidence_ids: string[] } | null; most_common_activity: { value: string; count: number; evidence_ids: string[] } | null;
  lucid_evidence_ids: string[]; lucid_labeled_records: number;
  lucid_activities: Record<string, number>; emotion_distribution: { name: string; count: number; percentage: number; evidence_ids: string[] }[];
  top_keywords: { keyword: string; count: number; evidence_ids: string[] }[]; timeline: { available: boolean; limitation: string };
  provenance: { source: string; record_count: number; sentiment_evidence_ids: string[] }; scope: string;
};
type Result = { dream_id: string; text: string; emotion: string; activity: string; date: string | null; similarity: number | null; matched_fields: string[]; keywords?: string[] };

const panel = 'rounded-2xl border border-[#E8AEA0] bg-[#FFFDF9] shadow-[0_4px_20px_-2px_rgba(222,107,72,0.06)] transition-all hover:border-[#DE6B48] hover:shadow-[0_10px_30px_-4px_rgba(222,107,72,0.12)] relative';
const pill = 'rounded-full border border-[#E8AEA0] bg-[#FAF7F2] px-3 py-1.5 text-xs text-[#78716C] hover:border-[#DE6B48] hover:text-[#D95338] transition';

export default function SourceDashboard() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [method, setMethod] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [related, setRelated] = useState<any[]>([]);
  const [relatedFor, setRelatedFor] = useState('');

  const load = () => api.getTwinDashboard().then(setData).catch(e => setNotice(e.message || 'Could not load CSV analytics.'));
  
  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener('dreamtwin:updated', refresh);
    const timer = window.setInterval(load, 30000);
    return () => {
      window.removeEventListener('dreamtwin:updated', refresh);
      window.clearInterval(timer);
    };
  }, []);

  const search = async (q = term) => {
    if (!q.trim()) return;
    setBusy(true);
    setQuery(q);
    setNotice('');
    try {
      const res = await api.searchDreams(q);
      setResults(res.results);
      setTotal(res.total_matches);
      setMethod(res.method);
      if (!res.embedding_available) setNotice(res.embedding_limitation || 'Sentence embeddings are unavailable; results use literal source-field matching.');
    } catch (e: any) {
      setNotice(e.message || 'Search failed.');
    } finally {
      setBusy(false);
    }
  };

  const chooseKeyword = (q: string) => {
    setTerm(q);
    void search(q);
  };

  if (!data) return (
    <div className="rounded-2xl border border-[#E8AEA0] bg-[#FFFDF9] p-8 text-center text-sm text-[#78716C]">
      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#E8AEA0] border-t-[#DE6B48] mb-3" />
      <p className="font-editorial text-base text-[#D95338]">{notice || 'Reading source CSV…'}</p>
    </div>
  );

  const cards = [
    { label: 'Total Dreams', value: data.total_dreams.toLocaleString(), detail: 'analyzable source records', icon: Moon, evidence: [] as string[] },
    { label: 'Average Sentiment', value: data.average_sentiment === null ? 'Unavailable' : data.average_sentiment.toFixed(2), detail: 'mean source score', icon: Activity, evidence: data.provenance.sentiment_evidence_ids },
    { label: 'Dominant Emotion', value: data.most_common_emotion?.value || 'Unavailable', detail: data.most_common_emotion ? `${data.most_common_emotion.count.toLocaleString()} source labels` : 'No labeled rows', icon: HeartPulse, evidence: data.most_common_emotion?.evidence_ids || [] },
    { label: 'Lucid Dream Rate', value: data.lucidity_rate === null ? 'Unavailable' : `${Math.round(data.lucidity_rate * 100)}%`, detail: `${data.lucid_labeled_records.toLocaleString()} labeled records`, icon: Sparkles, evidence: data.lucid_evidence_ids },
  ];

  return (
    <div className="space-y-6 text-[#1F2421]">
      {/* Editorial Hero Section with Reference-style framing */}
      <section className={`${panel} overflow-hidden`}>
        {/* Top bar with fraction index and plus mark */}
        <div className="flex items-center justify-between border-b border-[#E8AEA0]/60 bg-[#FAF7F2]/60 px-6 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#D95338]">1/6</span>
            <span className="text-[#E8AEA0]">|</span>
            <span className="font-mono uppercase tracking-widest text-[#78716C] text-[10px]">
              OBSERVATORY INDEX
            </span>
          </div>
          <span className="font-serif text-[#DE6B48] text-base leading-none select-none">+</span>
        </div>

        <div className="grid gap-8 p-6 xl:grid-cols-[1.1fr_1.3fr] xl:p-8">
          <div className="flex flex-col justify-center">
            <p className="mb-3 flex items-center gap-2 text-xs uppercase font-mono tracking-[.2em] text-[#DE6B48]">
              <span className="h-2 w-2 rounded-full bg-[#DE6B48]" />
              DreamTwin AI · Evidence Grounded
            </p>
            <h2 className="max-w-xl text-3xl font-bold font-editorial leading-[1.15] text-[#1F2421] sm:text-4xl">
              Your dream memories,<br />
              <span className="text-[#D95338] italic">grounded in evidence.</span>
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[#57534E]">
              Explore the 11,400 record corpus, analyze recurring emotional signatures, and consult the assistant using verifiable citations from original narratives.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className={pill}>Verified CSV Source</span>
              <span className={pill}>Deterministic TF-IDF Retrieval</span>
              <span className={pill}>No Fabricated Timestamps</span>
            </div>
          </div>
          
          {/* Embedded Assistant */}
          <div>
            <TwinConversation />
          </div>
        </div>
      </section>

      {/* Metrics Row: 4 Editorial Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon, evidence }, i) => (
          <div
            title={evidence.length ? `Supporting Dream_IDs: ${evidence.join(', ')}` : undefined}
            key={label}
            className={`${panel} p-5 group`}
          >
            <div className="flex items-center justify-between border-b border-[#E8AEA0]/40 pb-3 mb-3">
              <span className="text-[11px] font-mono tracking-wider uppercase text-[#78716C]">{label}</span>
              <div className="p-1.5 rounded-lg bg-[#FAF7F2] border border-[#E8AEA0]/50 text-[#DE6B48] group-hover:scale-110 transition-transform">
                <Icon size={16} />
              </div>
            </div>
            <p className="text-3xl font-bold font-editorial text-[#1F2421] tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-[#78716C]">{detail}</p>
            {evidence.length > 0 && (
              <p className="mt-2 truncate font-mono text-[10px] text-[#A8A29E]">
                IDs: {evidence.slice(0, 3).join(' · ')}
              </p>
            )}
            <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>
          </div>
        ))}
      </section>

      {/* Asymmetric Bottom Grid: Search & Top Keywords */}
      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Search Panel */}
        <div className={`${panel} p-6 sm:p-7`}>
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#E8AEA0]/50 pb-4">
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#DE6B48]">
                CORPUS RETRIEVAL
              </span>
              <h3 className="text-xl font-bold font-editorial text-[#1F2421]">
                Dream Memory Search
              </h3>
              <p className="mt-1 text-xs text-[#78716C]">
                Search narrative verbatim, keywords, emotion, or activity across all records
              </p>
            </div>
            <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E8AEA0] text-[#DE6B48]">
              <Search size={18} />
            </div>
          </div>

          <form className="flex gap-2.5" onSubmit={e => { e.preventDefault(); void search(); }}>
            <input
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder="Try searching water, exams, family, flying..."
              className="min-w-0 flex-1 rounded-xl border border-[#E8AEA0] bg-[#FFFDF9] px-4 py-3 text-sm text-[#1F2421] outline-none placeholder:text-[#A8A29E] focus:border-[#DE6B48] focus:ring-2 focus:ring-[#DE6B48]/15 transition"
            />
            <button
              disabled={busy}
              className="rounded-xl bg-[#DE6B48] px-5 text-sm font-semibold text-white hover:bg-[#D95338] disabled:opacity-50 transition shadow-xs"
            >
              {busy ? 'Searching…' : 'Search'}
            </button>
          </form>

          {query && (
            <div className="mt-6 border-t border-[#E8AEA0]/50 pt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#78716C]">
                <span>{total.toLocaleString()} matching records for “{query}”</span>
                <span className="text-[#DE6B48]">{method}</span>
              </div>
              <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {results.map(r => (
                  <article key={r.dream_id} className="rounded-xl border border-[#E8AEA0]/80 bg-[#FAF7F2]/60 p-4 transition hover:border-[#DE6B48] hover:bg-[#FFFDF9]">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#D95338]">{r.dream_id}</span>
                      <span className="text-[11px] text-[#78716C]">
                        {r.emotion} · {r.activity} · Date unavailable
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-[#2D3142]">{r.text}</p>
                    {r.keywords?.length ? (
                      <p className="mt-2 text-[11px] text-[#78716C]">
                        <span className="font-semibold text-[#57534E]">Keywords:</span> {r.keywords.slice(0, 8).join(', ')}
                      </p>
                    ) : null}
                    <button
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#DE6B48] hover:text-[#D95338] transition"
                      onClick={async () => {
                        setRelatedFor(r.dream_id);
                        try {
                          const out = await api.getSimilarById(r.dream_id);
                          setRelated(out.results);
                          if (!out.embedding_available) setNotice(out.limitation || 'Embedding model unavailable; similar-dream retrieval is unavailable.');
                        } catch (e: any) {
                          setNotice(e.message || 'Similar dream retrieval failed.');
                        }
                      }}
                    >
                      Find related dreams <ArrowUpRight size={13} />
                    </button>
                  </article>
                ))}
                {!results.length && (
                  <p className="py-8 text-center text-sm text-[#78716C]">
                    No matching source records found.
                  </p>
                )}
              </div>

              {/* Related Dreams Popover */}
              {relatedFor && (
                <div className="fixed right-6 top-24 z-50 max-h-[75vh] w-[min(440px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-[#DE6B48] bg-[#FFFDF9] p-5 shadow-2xl custom-scrollbar">
                  <div className="mb-4 flex items-center justify-between border-b border-[#E8AEA0] pb-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#DE6B48]">SIMILARITY CLUSTER</span>
                      <h4 className="text-sm font-bold font-editorial text-[#1F2421]">Related to {relatedFor}</h4>
                    </div>
                    <button
                      className="rounded-lg border border-[#E8AEA0] bg-[#FAF7F2] px-2.5 py-1 text-xs font-medium text-[#78716C] hover:border-[#DE6B48] hover:text-[#D95338]"
                      onClick={() => setRelatedFor('')}
                    >
                      Close ✕
                    </button>
                  </div>
                  <div className="space-y-3">
                    {related.map(d => (
                      <div key={d.dream_id} className="rounded-xl border border-[#E8AEA0]/60 bg-[#FAF7F2]/50 p-3">
                        <div className="flex justify-between gap-2 text-xs font-mono">
                          <span className="font-bold text-[#D95338]">{d.dream_id}</span>
                          <span className="text-[#3A8898]">{(d.similarity * 100).toFixed(1)}% match · {d.emotion || 'unlabeled'}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-[#2D3142]">{d.text}</p>
                        <p className="mt-2 text-[10px] text-[#78716C]">
                          Shared terms: {d.shared_keywords?.join(', ') || 'none'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {notice && <p className="mt-3 text-xs text-[#B45309]">{notice}</p>}
        </div>

        {/* Top 5 Keywords */}
        <div className={`${panel} p-6 sm:p-7 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between border-b border-[#E8AEA0]/50 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#DE6B48]">
                  LEXICAL ANCHORS
                </span>
                <h3 className="text-xl font-bold font-editorial text-[#1F2421]">
                  Top 5 Keywords
                </h3>
              </div>
              <span className="corner-plus text-[#DE6B48]/50">+</span>
            </div>
            <p className="mb-4 text-xs text-[#78716C]">
              Distinct source records per keyword · click to initiate search query
            </p>
            <div className="space-y-1.5">
              {data.top_keywords.slice(0, 5).map((item, i) => (
                <button
                  title={`Supporting Dream_IDs: ${item.evidence_ids.join(', ')}`}
                  onClick={() => chooseKeyword(item.keyword)}
                  key={item.keyword}
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition hover:border-[#E8AEA0] hover:bg-[#FAF7F2]"
                >
                  <span className="w-6 text-right font-mono text-[11px] font-bold text-[#DE6B48]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-[#2D3142] group-hover:text-[#D95338] transition">
                    {item.keyword}
                  </span>
                  <span className="font-mono text-xs text-[#78716C]">
                    {item.count.toLocaleString()}
                  </span>
                  <ArrowUpRight size={14} className="text-[#A8A29E] group-hover:text-[#DE6B48] transition" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-[#E8AEA0]/40 pt-4 text-[11px] text-[#78716C]">
            <p>Keyword frequencies reflect explicit lexical tokens across the corpus.</p>
          </div>
        </div>
      </section>

      {/* Provenance note */}
      <div className="flex items-center justify-between px-2 text-[11px] text-[#78716C] border-t border-[#E8AEA0]/50 pt-3">
        <span>Source: {data.provenance.source} · {data.scope}</span>
        <span className="font-mono">VERIFIED BY SOURCE ROW INTEGRITY</span>
      </div>
    </div>
  );
}
