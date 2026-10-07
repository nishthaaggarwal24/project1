import React, { useState } from 'react';
import { api } from '../../api/api';
import { DreamAnalysisResponse, SimilarDreamResponse } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmotionBadge from '../shared/EmotionBadge';

export default function DreamAnalyzer() {
  const [submitText, setSubmitText] = useState('');
  const [analyzeText, setAnalyzeText] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [submitResult, setSubmitResult] = useState<{ dream_id: string; analysis: DreamAnalysisResponse } | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<DreamAnalysisResponse | null>(null);
  const [similarDreams, setSimilarDreams] = useState<SimilarDreamResponse[]>([]);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!submitText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api.submitDream(submitText);
      setSubmitResult(res);
      setSubmitText('');
      window.dispatchEvent(new Event('dreamtwin:updated'));
    } catch (err: any) {
      alert(err.message || 'Failed to submit dream');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!analyzeText.trim()) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const analysis = await api.analyzeDream(analyzeText);
      setAnalyzeResult(analysis);
      setSimilarDreams((analysis as DreamAnalysisResponse & { similar_dreams?: SimilarDreamResponse[] }).similar_dreams || []);
    } catch (err: any) {
      setAnalyzeError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const AnalysisCard = ({ analysis }: { analysis: DreamAnalysisResponse }) => (
    <div className="bg-[#FAF7F2] border border-[#E8AEA0] rounded-xl p-4 space-y-4 mt-4">
      <div className="flex justify-between items-center border-b border-[#E8AEA0]/50 pb-2">
        <h4 className="font-editorial font-bold text-sm text-[#1F2421]">Analysis Results</h4>
        <EmotionBadge emotion={analysis.sentiment} />
      </div>
      
      <div>
        <div className="flex justify-between text-xs text-[#78716C] mb-1.5 font-mono">
          <span>Compound Sentiment</span>
          <span className="font-bold text-[#DE6B48]">{analysis.compound_score.toFixed(2)}</span>
        </div>
        <div className="w-full bg-[#FFFDF9] border border-[#E8AEA0]/60 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full ${analysis.compound_score >= 0 ? 'bg-[#3A8898]' : 'bg-[#DE6B48]'}`} 
            style={{ width: `${Math.min(100, Math.abs(analysis.compound_score) * 100)}%` }}
          />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-mono uppercase tracking-wider text-[#78716C] mb-2">Matched Lexical Symbols</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(analysis.matched_symbols).map(([sym, count]) => (
            <span key={sym} className="px-2 py-0.5 text-xs bg-[#FFFDF9] text-[#2D3142] border border-[#E8AEA0] rounded-md font-mono">
              {sym} <span className="text-[#DE6B48] font-bold">×{count}</span>
            </span>
          ))}
          {Object.keys(analysis.matched_symbols).length === 0 && (
            <span className="text-xs text-[#78716C] italic">No known symbols detected.</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Submit Real Record */}
      <div className="glass-card p-6 sm:p-7 flex flex-col relative overflow-hidden group">
        <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>
        
        <div className="flex items-center gap-2 mb-3 border-b border-[#E8AEA0]/50 pb-3">
          <span className="font-mono text-xs font-bold text-[#D95338]">5a/6</span>
          <span className="text-[#E8AEA0]">|</span>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#78716C]">
            CORPUS APPEND (U-ID)
          </span>
        </div>

        <h3 className="text-2xl font-bold font-editorial text-[#1F2421] mb-2">Submit New Dream</h3>
        <p className="text-xs text-[#78716C] mb-4 leading-5">
          Appends verbatim to the source CSV with a distinct U-ID. Unannotated fields remain blank to preserve corpus fidelity.
        </p>

        <textarea
          className="w-full h-44 bg-[#FAF7F2] border border-[#E8AEA0] rounded-xl p-3.5 text-sm text-[#1F2421] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#DE6B48] focus:bg-[#FFFDF9] transition resize-none mb-3"
          placeholder="Narrate your dream in detail..."
          value={submitText}
          onChange={(e) => setSubmitText(e.target.value)}
        />

        <div className="flex justify-between items-center mb-4">
          <span className={`text-xs font-mono ${submitText.trim().length === 0 ? 'text-[#A8A29E]' : 'text-[#3A8898] font-bold'}`}>
            {submitText.split(/\s+/).filter(w => w.length > 0).length} words recorded
          </span>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || submitText.trim().length === 0}
            className="px-4 py-2 bg-[#DE6B48] hover:bg-[#D95338] text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold font-mono tracking-wide transition shadow-xs"
          >
            {isSubmitting ? 'Ingesting…' : 'Submit to Corpus'}
          </button>
        </div>
        
        {submitResult && (
          <div className="mt-4 p-4 border border-[#86EFAC] bg-[#F0FDF4] rounded-xl">
            <p className="text-[#15803D] text-xs font-bold uppercase tracking-wider mb-1">Successfully ingested!</p>
            <p className="text-xs text-[#57534E] font-mono mb-2">Assigned Record ID: <span className="font-bold text-[#D95338]">{submitResult.dream_id}</span></p>
            <AnalysisCard analysis={submitResult.analysis} />
          </div>
        )}
      </div>

      {/* Right Column: Ephemeral Text Analysis */}
      <div className="glass-card p-6 sm:p-7 flex flex-col relative overflow-hidden group">
        <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

        <div className="flex items-center gap-2 mb-3 border-b border-[#E8AEA0]/50 pb-3">
          <span className="font-mono text-xs font-bold text-[#D95338]">5b/6</span>
          <span className="text-[#E8AEA0]">|</span>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#78716C]">
            EPHEMERAL DIAGNOSTIC
          </span>
        </div>

        <h3 className="text-2xl font-bold font-editorial text-[#1F2421] mb-2">Analyze Any Text</h3>
        <p className="text-xs text-[#78716C] mb-4 leading-5">
          Execute sentiment and lexical symbol checks without saving entries to the permanent dataset.
        </p>

        <textarea
          className="w-full h-32 bg-[#FAF7F2] border border-[#E8AEA0] rounded-xl p-3.5 text-sm text-[#1F2421] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#DE6B48] focus:bg-[#FFFDF9] transition resize-none mb-3"
          placeholder="Paste or draft any excerpt to test..."
          value={analyzeText}
          onChange={(e) => setAnalyzeText(e.target.value)}
        />

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !analyzeText.trim()}
          className="px-4 py-2 border border-[#E8AEA0] bg-[#FAF7F2] hover:border-[#DE6B48] hover:text-[#D95338] disabled:opacity-40 rounded-xl text-xs font-semibold font-mono tracking-wide transition self-end mb-4"
        >
          {isAnalyzing ? 'Evaluating…' : 'Run Analysis'}
        </button>

        {isAnalyzing && <LoadingSpinner message="Evaluating text characteristics…" />}
        {analyzeError && <p className="text-[#B91C1C] text-xs font-mono">{analyzeError}</p>}
        
        {analyzeResult && !isAnalyzing && (
          <div className="space-y-5">
            <AnalysisCard analysis={analyzeResult} />
            
            <div>
              <h4 className="font-editorial font-bold text-sm text-[#1F2421] mb-2.5">Nearest Historical Matches</h4>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {similarDreams.length > 0 ? similarDreams.map(dream => (
                  <div key={dream.dream_id} className="bg-[#FAF7F2] border border-[#E8AEA0]/70 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-mono font-bold text-[#D95338]">{dream.dream_id}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-mono text-[#3A8898] font-bold">{(dream.similarity * 100).toFixed(0)}% match</span>
                        <EmotionBadge emotion={dream.emotion} className="!text-[10px] !px-1.5 !py-0" />
                      </div>
                    </div>
                    <p className="text-xs text-[#57534E] line-clamp-2 italic">“{dream.text}”</p>
                  </div>
                )) : (
                  <p className="text-xs text-[#78716C]">No similar narratives identified in corpus.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
