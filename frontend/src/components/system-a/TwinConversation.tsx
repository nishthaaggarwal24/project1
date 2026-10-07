import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/api';
import { Send, Bot, User, BookOpen, Sparkles, Activity, ChevronDown } from 'lucide-react';

interface Evidence {
  dream_id: string;
  similarity?: number;
  excerpt: string;
  keywords?: string[];
  emotion?: string;
}
interface Message {
  role: 'user' | 'assistant';
  content: string;
  cited_dreams?: Evidence[];
  reasoning_chain?: string[];
  evidence_open?: boolean;
}

const contextualQuestions = (question: string, evidence?: Evidence[]) => {
  const known = ['water', 'exam', 'exams', 'school', 'family', 'flying', 'falling', 'work', 'house', 'animal', 'animals'];
  const topic = known.find(term => new RegExp(`\\b${term}\\b`, 'i').test(question));
  const firstId = evidence?.[0]?.dream_id;
  return [
    topic ? `What emotions are labeled in dreams mentioning ${topic}?` : 'What emotions appear most often in these records?',
    firstId ? `Show source records similar to ${firstId}` : 'Which keywords appear most often?',
  ];
};

export default function TwinConversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading, actionLoading]);

  const handleSend = async (prompt?: string) => {
    const question = (prompt ?? input).trim();
    if (!question || isLoading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await api.chatWithTwin(question, history);
      setMessages(prev => [...prev, { role: 'assistant', content: response.response, cited_dreams: response.cited_dreams || [], reasoning_chain: response.reasoning_chain || [] }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: error.response?.data?.detail || error.message || 'I could not retrieve an answer right now.', cited_dreams: [] }]);
    } finally { setIsLoading(false); }
  };

  const toggleEvidence = (messageIndex: number) => setMessages(prev => prev.map((m, i) => i === messageIndex ? { ...m, evidence_open: !m.evidence_open } : m));

  const showSimilar = async (messageIndex: number) => {
    const sourceId = messages[messageIndex]?.cited_dreams?.[0]?.dream_id;
    if (!sourceId || actionLoading !== null) return;
    setActionLoading(messageIndex);
    try {
      const result = await api.getSimilarById(sourceId, 5);
      if (!result.available) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.limitation || 'Sentence embedding retrieval is unavailable; no keyword similarity fallback was used.', cited_dreams: [] }]);
      } else if (!result.results?.length) {
        setMessages(prev => [...prev, { role: 'assistant', content: `I could not find other similar records for ${sourceId}.`, cited_dreams: [] }]);
      } else {
        const cited: Evidence[] = result.results.map((dream: any) => ({ dream_id: dream.dream_id, excerpt: dream.text, similarity: dream.similarity, keywords: dream.shared_keywords || [], emotion: dream.emotion }));
        setMessages(prev => [...prev, { role: 'assistant', content: `I compared ${sourceId} with the source narratives using sentence-embedding cosine similarity. Here are the closest records:`, cited_dreams: cited, reasoning_chain: [result.method || 'all-MiniLM-L6-v2 cosine similarity', 'Similarity ranks text relevance; it does not establish a psychological cause.'] }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: error.response?.data?.detail || 'Similar-dream retrieval failed.', cited_dreams: [] }]);
    } finally { setActionLoading(null); }
  };

  const showEmotionTrend = async () => {
    if (actionLoading !== null) return;
    setActionLoading(-1);
    try {
      const result = await api.getEmotionDistribution();
      const distribution = result.distribution || [];
      const cited: Evidence[] = distribution.slice(0, 5).flatMap((entry: any) => (entry.evidence_ids || []).slice(0, 2).map((id: string) => ({ dream_id: id, excerpt: `Source emotion label: ${entry.emotion}`, keywords: [], emotion: entry.emotion })));
      const summary = distribution.slice(0, 5).map((entry: any) => `• ${entry.emotion}: ${Number(entry.value).toLocaleString()} records`).join('\n');
      setMessages(prev => [...prev, { role: 'assistant', content: `A chronological emotion trend cannot be calculated because the source has no timestamps. The current source-label distribution is:\n${summary || 'No labeled emotions are available.'}`, cited_dreams: cited }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: error.response?.data?.detail || 'Emotion summary is unavailable right now.', cited_dreams: [] }]);
    } finally { setActionLoading(null); }
  };

  return (
    <div className="glass-card flex flex-col h-[700px]">
      <div className="p-4 border-b border-dream-border bg-dream-purple/5">
        <div className="flex items-center text-sm text-indigo-300"><Bot className="w-4 h-4 mr-2 flex-shrink-0" /><p>Ask Your Digital Twin. Answers cite matching records and source fields only. This CSV has no person identifier or timestamps, so responses describe the dataset rather than a personal timeline.</p></div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.length === 0 && <div className="text-center text-gray-500 mt-10"><p className="mb-2">Ask about a recurring theme, emotion label, or dream entry.</p><div className="flex flex-wrap justify-center gap-2 mt-4">{["Which records mention water?", "What emotions appear most often?", "Have exams appeared in the narratives?", "What changed this month?"].map(prompt => <button key={prompt} onClick={() => handleSend(prompt)} className="text-xs px-3 py-2 rounded-full border border-dream-border bg-white/5 text-gray-300 hover:bg-dream-purple/20 transition-colors">{prompt}</button>)}</div></div>}
        {messages.map((msg, idx) => <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-600 ml-3' : 'bg-dream-purple mr-3'}`}>{msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}</div>
            <div className="flex min-w-0 flex-col">
              <div className={`p-4 rounded-2xl whitespace-pre-wrap leading-6 ${msg.role === 'user' ? 'bg-indigo-600/20 text-white rounded-tr-sm' : 'bg-dream-dark border border-dream-border text-gray-200 rounded-tl-sm'}`}>{msg.content}</div>
              {msg.role === 'assistant' && <div className="mt-2 space-y-2">
                <button onClick={() => toggleEvidence(idx)} className="flex items-center gap-1 ml-1 text-xs text-gray-400 hover:text-indigo-300 transition-colors"><BookOpen size={13}/><span>Evidence Used</span><span className="text-gray-600">({msg.cited_dreams?.length || 0} matching records shown)</span><ChevronDown size={13} className={`transition-transform ${msg.evidence_open ? 'rotate-180' : ''}`}/></button>
                {msg.evidence_open && <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.025] p-3">
                  {msg.cited_dreams?.length ? msg.cited_dreams.map((dream, i) => <div key={`${dream.dream_id}-${i}`} className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 text-xs text-gray-300">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1"><span className="font-mono text-indigo-400">{dream.dream_id}</span><span className="text-gray-500">{dream.emotion || 'Emotion unavailable'}{dream.similarity !== undefined ? ` · ${(dream.similarity * 100).toFixed(1)}% embedding similarity` : ''}</span></div>
                    <p className="text-gray-400 leading-5">{dream.excerpt}</p>
                    {dream.keywords?.length ? <p className="mt-2 text-[11px] text-indigo-200/70">Source keywords: {dream.keywords.join(', ')}</p> : null}
                  </div>) : <p className="text-xs text-gray-500">No matching records were retrieved for this answer.</p>}
                  {msg.reasoning_chain?.length ? <details className="pt-1 text-xs text-gray-500"><summary className="cursor-pointer">How this answer was produced</summary><ul className="list-disc pl-4 mt-2 space-y-1">{msg.reasoning_chain.map((step, i) => <li key={i}>{step}</li>)}</ul></details> : null}
                </div>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => toggleEvidence(idx)} className="inline-flex items-center gap-1 rounded-full border border-dream-border px-3 py-1.5 text-[11px] text-gray-300 hover:border-indigo-400/50 hover:bg-indigo-500/10 transition"><BookOpen size={12}/>View Related Dreams</button>
                  <button onClick={() => void showSimilar(idx)} disabled={actionLoading !== null || !msg.cited_dreams?.length} className="inline-flex items-center gap-1 rounded-full border border-dream-border px-3 py-1.5 text-[11px] text-gray-300 hover:border-indigo-400/50 hover:bg-indigo-500/10 transition disabled:opacity-40"><Sparkles size={12}/>{actionLoading === idx ? 'Finding…' : 'Show Similar Dreams'}</button>
                  <button onClick={() => void showEmotionTrend()} disabled={actionLoading !== null} className="inline-flex items-center gap-1 rounded-full border border-dream-border px-3 py-1.5 text-[11px] text-gray-300 hover:border-indigo-400/50 hover:bg-indigo-500/10 transition disabled:opacity-40"><Activity size={12}/>{actionLoading === -1 ? 'Loading…' : 'Show Emotion Trend'}</button>
                </div>
                {idx > 0 && <div className="flex flex-wrap gap-1.5">{contextualQuestions(messages[idx - 1]?.content || '', msg.cited_dreams).map(question => <button key={question} onClick={() => handleSend(question)} disabled={isLoading} className="rounded-full bg-white/[0.035] px-2.5 py-1 text-[10px] text-gray-400 hover:bg-dream-purple/15 hover:text-gray-200 transition disabled:opacity-40">{question}</button>)}</div>}
              </div>}
            </div>
          </div>
        </div>)}
        {(isLoading || actionLoading !== null) && <div className="flex justify-start"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-dream-purple flex items-center justify-center"><Bot className="w-5 h-5 text-white"/></div><div className="p-4 rounded-2xl bg-dream-dark border border-dream-border rounded-tl-sm flex space-x-2 items-center"><span className="text-xs text-gray-500 mr-1">{isLoading ? 'Searching dream evidence' : 'Preparing related evidence'}</span><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"/><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}/><div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'0.4s'}}/></div></div></div>}
        <div ref={messagesEndRef}/>
      </div>
      <div className="p-4 border-t border-dream-border bg-dream-dark/50"><div className="flex items-center space-x-2"><input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask about symbols, emotions, or a specific dream..." className="flex-1 bg-white/5 border border-dream-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-dream-purple transition-colors" disabled={isLoading}/><button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="p-2 bg-dream-purple hover:bg-dream-indigo disabled:opacity-50 rounded-lg transition-colors"><Send className="w-5 h-5"/></button></div></div>
    </div>
  );
}
