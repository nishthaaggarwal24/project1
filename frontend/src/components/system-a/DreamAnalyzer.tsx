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
    <div className="bg-dream-dark/50 border border-dream-border rounded-lg p-4 space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-gray-200">Analysis Results</h4>
        <EmotionBadge emotion={analysis.sentiment} />
      </div>
      
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Compound Score</span>
          <span className="font-mono">{analysis.compound_score.toFixed(2)}</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full rounded-full ${analysis.compound_score > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
            style={{ width: `${Math.abs(analysis.compound_score) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-400 mb-2">Matched Symbols</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(analysis.matched_symbols).map(([sym, count]) => (
            <span key={sym} className="px-2 py-1 text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
              {sym} <span className="text-indigo-400/70 ml-1">x{count}</span>
            </span>
          ))}
          {Object.keys(analysis.matched_symbols).length === 0 && (
            <span className="text-xs text-gray-500">No known symbols detected.</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card p-6 flex flex-col">
        <h3 className="text-xl font-bold mb-4">Submit New Dream</h3>
        <p className="text-sm text-gray-400 mb-4">
          Submit a real dream. It appends verbatim to the source CSV; unsupported fields stay blank. Narratives under 20 words are retained and marked low confidence.
        </p>
        <textarea
          className="w-full h-48 bg-dream-dark/80 border border-dream-border rounded-lg p-3 text-sm focus:outline-none focus:border-dream-purple transition-colors resize-none mb-2"
          placeholder="Describe your dream in detail..."
          value={submitText}
          onChange={(e) => setSubmitText(e.target.value)}
        />
        <div className="flex justify-between items-center mb-4">
          <span className={`text-xs ${submitText.trim().length === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {submitText.split(/\s+/).filter(w => w.length > 0).length} words
          </span>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || submitText.trim().length === 0}
            className="px-4 py-2 bg-dream-purple hover:bg-dream-indigo disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-semibold transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit to Twin'}
          </button>
        </div>
        
        {submitResult && (
          <div className="mt-4 p-4 border border-emerald-500/30 bg-emerald-500/10 rounded-lg">
            <p className="text-emerald-400 text-sm font-medium mb-2">Successfully ingested!</p>
            <p className="text-xs text-gray-400 font-mono mb-2">ID: {submitResult.dream_id}</p>
            <AnalysisCard analysis={submitResult.analysis} />
          </div>
        )}
      </div>

      <div className="glass-card p-6 flex flex-col">
        <h3 className="text-xl font-bold mb-4">Analyze Any Text</h3>
        <p className="text-sm text-gray-400 mb-4">
          Test the analysis engine on any text snippet without saving it to your history.
        </p>
        <textarea
          className="w-full h-32 bg-dream-dark/80 border border-dream-border rounded-lg p-3 text-sm focus:outline-none focus:border-dream-purple transition-colors resize-none mb-4"
          placeholder="Enter text to analyze..."
          value={analyzeText}
          onChange={(e) => setAnalyzeText(e.target.value)}
        />
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !analyzeText.trim()}
          className="px-4 py-2 bg-dream-dark border border-dream-border hover:bg-white/5 disabled:opacity-50 rounded-md text-sm font-semibold transition-colors self-end mb-4"
        >
          {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>

        {isAnalyzing && <LoadingSpinner message="Running text analysis..." />}
        {analyzeError && <p className="text-red-400 text-sm">{analyzeError}</p>}
        
        {analyzeResult && !isAnalyzing && (
          <div className="space-y-6">
            <AnalysisCard analysis={analyzeResult} />
            
            <div>
              <h4 className="font-semibold text-gray-200 mb-3 text-sm">Similar Past Dreams</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {similarDreams.length > 0 ? similarDreams.map(dream => (
                  <div key={dream.dream_id} className="bg-dream-dark/30 border border-dream-border/50 rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-indigo-300">{dream.dream_id}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-emerald-400">{(dream.similarity * 100).toFixed(0)}% match</span>
                        <EmotionBadge emotion={dream.emotion} className="!text-[10px] !px-1.5 !py-0" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 italic">"{dream.text}"</p>
                  </div>
                )) : (
                  <p className="text-xs text-gray-500">No similar dreams found in history.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
