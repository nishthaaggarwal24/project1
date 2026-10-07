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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, actionLoading]);

  const handleSend = async (prompt?: string) => {
    const question = (prompt ?? input).trim();
    if (!question || isLoading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await api.chatWithTwin(question, history);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.response,
        cited_dreams: response.cited_dreams || [],
        reasoning_chain: response.reasoning_chain || []
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: error.response?.data?.detail || error.message || 'I could not retrieve an answer right now.',
        cited_dreams: []
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEvidence = (messageIndex: number) => {
    setMessages(prev => prev.map((m, i) => i === messageIndex ? { ...m, evidence_open: !m.evidence_open } : m));
  };

  const showSimilar = async (messageIndex: number) => {
    const sourceId = messages[messageIndex]?.cited_dreams?.[0]?.dream_id;
    if (!sourceId || actionLoading !== null) return;
    setActionLoading(messageIndex);
    try {
      const result = await api.getSimilarById(sourceId, 5);
      if (!result.available) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.limitation || 'Sentence embedding retrieval is unavailable; no keyword similarity fallback was used.',
          cited_dreams: []
        }]);
      } else if (!result.results?.length) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I could not find other similar records for ${sourceId}.`,
          cited_dreams: []
        }]);
      } else {
        const cited: Evidence[] = result.results.map((dream: any) => ({
          dream_id: dream.dream_id,
          excerpt: dream.text,
          similarity: dream.similarity,
          keywords: dream.shared_keywords || [],
          emotion: dream.emotion
        }));
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I compared ${sourceId} with the source narratives using sentence-embedding cosine similarity. Here are the closest records:`,
          cited_dreams: cited,
          reasoning_chain: [result.method || 'all-MiniLM-L6-v2 cosine similarity', 'Similarity ranks text relevance; it does not establish a psychological cause.']
        }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: error.response?.data?.detail || 'Similar-dream retrieval failed.', cited_dreams: [] }]);
    } finally {
      setActionLoading(null);
    }
  };

  const showEmotionTrend = async () => {
    if (actionLoading !== null) return;
    setActionLoading(-1);
    try {
      const result = await api.getEmotionDistribution();
      const distribution = result.distribution || [];
      const cited: Evidence[] = distribution.slice(0, 5).flatMap((entry: any) => (entry.evidence_ids || []).slice(0, 2).map((id: string) => ({
        dream_id: id,
        excerpt: `Source emotion label: ${entry.emotion}`,
        keywords: [],
        emotion: entry.emotion
      })));
      const summary = distribution.slice(0, 5).map((entry: any) => `• ${entry.emotion}: ${Number(entry.value).toLocaleString()} records`).join('\n');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `A chronological emotion trend cannot be calculated because the source has no timestamps. The current source-label distribution is:\n${summary || 'No labeled emotions are available.'}`,
        cited_dreams: cited
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: error.response?.data?.detail || 'Emotion summary is unavailable right now.', cited_dreams: [] }]);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E8AEA0] bg-[#FFFDF9] flex flex-col h-[650px] shadow-[0_4px_20px_-2px_rgba(222,107,72,0.06)] relative overflow-hidden">
      {/* Editorial Header Partition */}
      <div className="p-4 border-b border-[#E8AEA0] bg-[#FAF7F2] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-[#FFFDF9] border border-[#E8AEA0] text-[#DE6B48]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-editorial text-[#1F2421]">Twin Intelligence Inquirer</h4>
            <p className="text-[11px] text-[#78716C]">Answers cite verbatim records from the 11,400 corpus.</p>
          </div>
        </div>
        <span className="font-mono text-[10px] text-[#DE6B48] font-semibold px-2 py-0.5 rounded border border-[#E8AEA0] bg-[#FFFDF9]">
          2/6
        </span>
      </div>

      {/* Message scroll container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-[#FFFDF9]">
        {messages.length === 0 && (
          <div className="text-center text-[#78716C] my-auto py-10 px-4">
            <span className="inline-block p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8AEA0] text-2xl text-[#DE6B48] mb-3">
              ✦
            </span>
            <p className="font-editorial text-base font-semibold text-[#1F2421]">Ask Your Grounded Corpus Twin</p>
            <p className="text-xs text-[#78716C] mt-1 max-w-sm mx-auto">
              Query recurring themes, emotional labels, or retrieve real narrative citations.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {[
                "Which records mention water?",
                "What emotions appear most often?",
                "Have exams appeared in the narratives?",
                "What patterns exist around flying?"
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="text-xs px-3 py-1.5 rounded-xl border border-[#E8AEA0] bg-[#FAF7F2] text-[#57534E] hover:border-[#DE6B48] hover:text-[#D95338] hover:bg-white transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2.5`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center border ${
                msg.role === 'user' 
                  ? 'bg-[#DE6B48] border-[#DE6B48] text-white' 
                  : 'bg-[#FAF7F2] border-[#E8AEA0] text-[#DE6B48]'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="flex min-w-0 flex-col">
                <div className={`p-4 rounded-2xl whitespace-pre-wrap leading-6 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#FCE8E0] border border-[#E8AEA0] text-[#1F2421] rounded-tr-xs'
                    : 'bg-[#FAF7F2] border border-[#E8AEA0] text-[#2D3142] rounded-tl-xs shadow-2xs'
                }`}>
                  {msg.content}
                </div>

                {msg.role === 'assistant' && (
                  <div className="mt-2 space-y-2">
                    <button
                      onClick={() => toggleEvidence(idx)}
                      className="inline-flex items-center gap-1.5 ml-1 text-xs font-medium text-[#78716C] hover:text-[#DE6B48] transition"
                    >
                      <BookOpen size={13} className="text-[#DE6B48]" />
                      <span>Evidence Used</span>
                      <span className="text-[#A8A29E]">({msg.cited_dreams?.length || 0} citations)</span>
                      <ChevronDown size={13} className={`transition-transform ${msg.evidence_open ? 'rotate-180' : ''}`} />
                    </button>

                    {msg.evidence_open && (
                      <div className="space-y-2 rounded-xl border border-[#E8AEA0] bg-[#FFFDF9] p-3 text-xs">
                        {msg.cited_dreams?.length ? (
                          msg.cited_dreams.map((dream, i) => (
                            <div key={`${dream.dream_id}-${i}`} className="rounded-lg border border-[#E8AEA0]/60 bg-[#FAF7F2]/50 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                <span className="font-mono font-bold text-[#D95338]">{dream.dream_id}</span>
                                <span className="text-[#78716C] text-[11px]">
                                  {dream.emotion || 'Unlabeled'}
                                  {dream.similarity !== undefined ? ` · ${(dream.similarity * 100).toFixed(1)}% match` : ''}
                                </span>
                              </div>
                              <p className="text-[#57534E] leading-5">{dream.excerpt}</p>
                              {dream.keywords?.length ? (
                                <p className="mt-2 text-[10px] text-[#A8A29E]">
                                  Keywords: {dream.keywords.join(', ')}
                                </p>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[#78716C]">No supporting records were retrieved for this query.</p>
                        )}

                        {msg.reasoning_chain?.length ? (
                          <details className="pt-2 text-xs text-[#78716C] border-t border-[#E8AEA0]/40">
                            <summary className="cursor-pointer font-medium hover:text-[#1F2421]">Methodology notes</summary>
                            <ul className="list-disc pl-4 mt-2 space-y-1">
                              {msg.reasoning_chain.map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => toggleEvidence(idx)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E8AEA0] bg-[#FAF7F2] px-2.5 py-1 text-[11px] text-[#57534E] hover:border-[#DE6B48] hover:text-[#D95338] transition"
                      >
                        <BookOpen size={12} /> View Citations
                      </button>
                      <button
                        onClick={() => void showSimilar(idx)}
                        disabled={actionLoading !== null || !msg.cited_dreams?.length}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E8AEA0] bg-[#FAF7F2] px-2.5 py-1 text-[11px] text-[#57534E] hover:border-[#DE6B48] hover:text-[#D95338] transition disabled:opacity-40"
                      >
                        <Sparkles size={12} /> {actionLoading === idx ? 'Retrieving…' : 'Similar Dreams'}
                      </button>
                      <button
                        onClick={() => void showEmotionTrend()}
                        disabled={actionLoading !== null}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E8AEA0] bg-[#FAF7F2] px-2.5 py-1 text-[11px] text-[#57534E] hover:border-[#DE6B48] hover:text-[#D95338] transition disabled:opacity-40"
                      >
                        <Activity size={12} /> {actionLoading === -1 ? 'Compiling…' : 'Emotion Trend'}
                      </button>
                    </div>

                    {idx > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {contextualQuestions(messages[idx - 1]?.content || '', msg.cited_dreams).map(question => (
                          <button
                            key={question}
                            onClick={() => handleSend(question)}
                            disabled={isLoading}
                            className="rounded-lg bg-[#FAF7F2] border border-[#E8AEA0]/60 px-2.5 py-1 text-[10px] text-[#78716C] hover:border-[#DE6B48] hover:text-[#D95338] transition disabled:opacity-40"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {(isLoading || actionLoading !== null) && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#FAF7F2] border border-[#E8AEA0] flex items-center justify-center text-[#DE6B48]">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8AEA0] rounded-tl-xs flex space-x-2 items-center">
                <span className="text-xs text-[#78716C]">
                  {isLoading ? 'Consulting dream corpus…' : 'Preparing evidence…'}
                </span>
                <div className="w-1.5 h-1.5 bg-[#DE6B48] rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-[#DE6B48] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 bg-[#DE6B48] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input row */}
      <div className="p-3.5 border-t border-[#E8AEA0] bg-[#FAF7F2]">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about themes, emotions, or source records..."
            className="flex-1 bg-[#FFFDF9] border border-[#E8AEA0] rounded-xl px-4 py-2.5 text-sm text-[#1F2421] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#DE6B48] focus:ring-1 focus:ring-[#DE6B48]/30 transition"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-[#DE6B48] hover:bg-[#D95338] text-white disabled:opacity-40 rounded-xl transition shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
