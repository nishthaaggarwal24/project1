import React, { useEffect, useState } from 'react';
import { Search, Sparkles, Activity, Moon, HeartPulse, ArrowUpRight } from 'lucide-react';
import { api } from '../../api/api';
import TwinConversation from './TwinConversation';

type Snapshot = {
  total_dreams:number; source_row_count:number; excluded_row_count:number; excluded_source_rows:number[]; average_sentiment:number|null; lucid_count:number; lucidity_rate:number|null;
  lucid_average_sentiment:number|null; nonlucid_average_sentiment:number|null;
  most_common_emotion:{value:string;count:number;evidence_ids:string[]}|null; most_common_activity:{value:string;count:number;evidence_ids:string[]}|null;
  lucid_evidence_ids:string[]; lucid_labeled_records:number;
  lucid_activities:Record<string,number>; emotion_distribution:{name:string;count:number;percentage:number;evidence_ids:string[]}[];
  top_keywords:{keyword:string;count:number;evidence_ids:string[]}[]; timeline:{available:boolean;limitation:string};
  provenance:{source:string;record_count:number;sentiment_evidence_ids:string[]}; scope:string;
};
type Result = {dream_id:string;text:string;emotion:string;activity:string;date:string|null;similarity:number|null;matched_fields:string[];keywords?:string[]};

const panel='rounded-2xl border border-white/[0.08] bg-[#101113] shadow-[0_16px_50px_rgba(0,0,0,.28)]';
const pill='rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 hover:border-orange-400/50 hover:text-white transition';

export default function SourceDashboard(){
  const [data,setData]=useState<Snapshot|null>(null); const [term,setTerm]=useState('');
  const [results,setResults]=useState<Result[]>([]); const [total,setTotal]=useState(0); const [method,setMethod]=useState('');
  const [query,setQuery]=useState(''); const [busy,setBusy]=useState(false); const [notice,setNotice]=useState('');
  const [related,setRelated]=useState<any[]>([]); const [relatedFor,setRelatedFor]=useState('');
  const load=()=>api.getTwinDashboard().then(setData).catch(e=>setNotice(e.message||'Could not load CSV analytics.'));
  useEffect(()=>{load();const refresh=()=>load();window.addEventListener('dreamtwin:updated',refresh);const timer=window.setInterval(load,30000);return()=>{window.removeEventListener('dreamtwin:updated',refresh);window.clearInterval(timer)}},[]);
  const search=async(q=term)=>{if(!q.trim())return;setBusy(true);setQuery(q);setNotice('');try{const res=await api.searchDreams(q);setResults(res.results);setTotal(res.total_matches);setMethod(res.method);if(!res.embedding_available)setNotice(res.embedding_limitation||'Sentence embeddings are unavailable; results use literal source-field matching.')}catch(e:any){setNotice(e.message||'Search failed.')}finally{setBusy(false)}};
  const chooseKeyword=(q:string)=>{setTerm(q);void search(q)};
  if(!data)return <div className="text-sm text-zinc-400 p-8">{notice||'Reading source CSV…'}</div>;
  const cards=[
    {label:'Total Dreams',value:data.total_dreams.toLocaleString(),detail:'analyzable source records',icon:Moon,evidence:[] as string[]},
    {label:'Average Sentiment',value:data.average_sentiment===null?'Unavailable':data.average_sentiment.toFixed(2),detail:'mean source score',icon:Activity,evidence:data.provenance.sentiment_evidence_ids},
    {label:'Dominant Emotion',value:data.most_common_emotion?.value||'Unavailable',detail:data.most_common_emotion?`${data.most_common_emotion.count.toLocaleString()} source labels`: 'No labeled rows',icon:HeartPulse,evidence:data.most_common_emotion?.evidence_ids||[]},
    {label:'Lucid Dream Percentage',value:data.lucidity_rate===null?'Unavailable':`${Math.round(data.lucidity_rate*100)}%`,detail:`${data.lucid_labeled_records.toLocaleString()} labeled records`,icon:Sparkles,evidence:data.lucid_evidence_ids},
  ];
  return <div className="space-y-5 text-zinc-100">
    <section className={`${panel} overflow-hidden`}>
      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_1.4fr] xl:p-8">
        <div className="flex flex-col justify-center"><p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[.24em] text-orange-400"><span className="h-1.5 w-1.5 rounded-full bg-orange-400"/> DreamTwin AI · source connected</p><h2 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">Your dream memories,<br/><span className="text-orange-400">grounded in evidence.</span></h2><p className="mt-4 max-w-lg text-sm leading-6 text-zinc-400">Search the stored dream history, compare related narratives, and ask the assistant questions grounded in source records.</p><div className="mt-5"><span className={pill}>CSV source · evidence-linked answers</span></div></div>
        <TwinConversation/>
      </div>
    </section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({label,value,detail,icon:Icon,evidence})=><div title={evidence.length?`Supporting Dream_IDs: ${evidence.join(', ')}`:undefined} key={label} className={`${panel} p-5`}><div className="flex items-center justify-between"><span className="text-xs text-zinc-400">{label}</span><Icon size={17} className="text-orange-400"/></div><p className="mt-4 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-zinc-500">{detail}</p>{evidence.length>0&&<p className="mt-2 truncate text-[10px] text-zinc-600">IDs: {evidence.slice(0,3).join(' · ')}</p>}</div>)}</section>
    <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
      <div className={`${panel} p-5 sm:p-6`}><div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">Dream memory search</h3><p className="mt-1 text-xs text-zinc-500">Search narrative, keywords, emotion, or activity</p></div><Search size={18} className="text-orange-400"/></div>
        <form className="flex gap-2" onSubmit={e=>{e.preventDefault();void search()}}><input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Try water, exams, or family…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-orange-400/60"/><button disabled={busy} className="rounded-xl bg-orange-500 px-4 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-50">{busy?'Searching':'Search'}</button></form>
        {query&&<div className="mt-5"><div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500"><span>{total.toLocaleString()} matching records for “{query}”</span><span>{method}</span></div><div className="max-h-[470px] space-y-2 overflow-auto pr-1">{results.map(r=><article key={r.dream_id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs text-orange-300">{r.dream_id}</span><span className="text-[11px] text-zinc-500">{r.emotion} · {r.activity} · Date unavailable</span></div><p className="text-sm leading-6 text-zinc-300">{r.text}</p>{r.keywords?.length ? <p className="mt-2 text-[11px] text-zinc-500">Keywords: {r.keywords.slice(0,8).join(", ")}</p> : null}<button className="mt-3 text-xs text-orange-300 hover:text-orange-200" onClick={async()=>{setRelatedFor(r.dream_id);try{const out=await api.getSimilarById(r.dream_id);setRelated(out.results);if(!out.embedding_available)setNotice(out.limitation||'Embedding model unavailable; similar-dream retrieval is unavailable.')}catch(e:any){setNotice(e.message||'Similar dream retrieval failed.')}}}>Find related dreams <span className="ml-1">↗</span></button></article>)}{!results.length&&<p className="py-6 text-sm text-zinc-500">No matching source records.</p>}</div>{relatedFor&&<div className="fixed right-5 top-28 z-40 max-h-[75vh] w-[min(410px,calc(100vw-2.5rem))] overflow-y-auto rounded-xl border border-orange-400/20 bg-[#111113] p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-medium">Related to {relatedFor}</h4><button className="text-xs text-zinc-500 hover:text-white" onClick={()=>setRelatedFor('')}>Close</button></div><div className="space-y-3">{related.map(d=><div key={d.dream_id} className="border-t border-white/[0.06] pt-3"><div className="flex justify-between gap-2 text-xs"><span className="font-mono text-orange-300">{d.dream_id}</span><span className="text-zinc-400">{(d.similarity*100).toFixed(1)}% · {d.emotion||'emotion unavailable'}</span></div><p className="mt-2 text-xs leading-5 text-zinc-400">{d.text}</p><p className="mt-1 text-[10px] text-zinc-600">Shared terms: {d.shared_keywords?.join(', ')||'none'} · Shared emotion: {d.shared_emotions?.join(', ')||'none'}</p></div>)}</div></div>}</div>}
        {notice&&<p className="mt-3 text-xs text-amber-300">{notice}</p>}
      </div>
      <div className={`${panel} p-5 sm:p-6`}><h3 className="text-lg font-semibold">Top 5 Keywords</h3><p className="mb-4 mt-1 text-xs text-zinc-500">Distinct source records per keyword · select one to search</p><div className="space-y-1">{data.top_keywords.slice(0,5).map((item,i)=><button title={`Supporting Dream_IDs: ${item.evidence_ids.join(', ')}`} onClick={()=>chooseKeyword(item.keyword)} key={item.keyword} className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/[0.04]"><span className="w-6 text-right font-mono text-[10px] text-zinc-600">{String(i+1).padStart(2,'0')}</span><span className="flex-1 truncate text-sm text-zinc-300 group-hover:text-orange-300">{item.keyword}</span><span className="font-mono text-xs text-zinc-500">{item.count.toLocaleString()}</span><ArrowUpRight size={13} className="text-zinc-700 group-hover:text-orange-400"/></button>)}</div></div>
    </section>
    <section className={`${panel} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}><div><h3 className="text-sm font-medium">Dream Activity Over Time</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">Unavailable because the source CSV has no date or timestamp field. The Season column is categorical, so it cannot establish chronological order. No timeline is inferred.</p></div><span className="shrink-0 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">Unavailable · source has no timestamps</span></section>
    {data.excluded_row_count>0&&<p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.035] px-4 py-3 text-xs text-amber-200">{data.excluded_row_count} of {data.source_row_count.toLocaleString()} source rows excluded from dream analytics because Dream_ID or Dream_Text was missing (CSV row {data.excluded_source_rows.join(', ')}). The source file remains unchanged.</p>}
    <p className="px-1 text-[11px] text-zinc-600">Source: {data.provenance.source} · {data.scope} · Dream IDs are shown with each supporting metric.</p>
  </div>
}
