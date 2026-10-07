import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api/api';
import { StreamingEventResponse } from '../../types';
import { Play, Pause, Activity, Database, Hash } from 'lucide-react';

export default function LiveIngestionStream() {
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<StreamingEventResponse['events']>([]);
  const [metrics, setMetrics] = useState({
    total_processed: 0,
    avg_word_count: 0,
    emotion_distribution: {} as Record<string, number>
  });
  
  const [offset, setOffset] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchNextBatch = async () => {
    try {
      const res = await api.getStreamingEvents(5, offset);
      if (res.events.length === 0) {
        setMetrics({ total_processed: res.total_processed, avg_word_count: res.avg_word_count, emotion_distribution: res.emotion_distribution });
        return;
      }
      
      setEvents(prev => [...prev, ...res.events].slice(-50));
      setMetrics({
        total_processed: res.total_processed,
        avg_word_count: res.avg_word_count,
        emotion_distribution: res.emotion_distribution
      });
      setOffset(prev => prev + res.events.length);
      
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    } catch (error) {
      console.error("Stream error", error);
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(fetchNextBatch, 2000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, offset]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[620px] text-[#1F2421]">
      {/* Stream Viewer (2 columns) */}
      <div className="lg:col-span-2 glass-card flex flex-col overflow-hidden relative group">
        <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

        <div className="p-4 border-b border-[#E8AEA0] flex justify-between items-center bg-[#FAF7F2]">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-bold text-[#D95338]">4/5</span>
            <span className="text-[#E8AEA0]">|</span>
            <h3 className="font-editorial font-bold text-lg text-[#1F2421]">Live Ingestion Stream</h3>
            <div className="flex items-center space-x-1.5 ml-2">
              <span className="relative flex h-2.5 w-2.5">
                {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3A8898] opacity-75" />}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? 'bg-[#3A8898]' : 'bg-[#A8A29E]'}`} />
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#78716C]">{isRunning ? 'Active' : 'Paused'}</span>
            </div>
          </div>
          
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition border ${
              isRunning 
                ? 'bg-[#FDF2F0] border-[#FDA4AF] text-[#B91C1C] hover:bg-[#FCE8E0]' 
                : 'bg-[#DE6B48] border-[#DE6B48] text-white hover:bg-[#D95338]'
            }`}
          >
            {isRunning ? <><Pause className="w-3.5 h-3.5" /> <span>Pause Stream</span></> : <><Play className="w-3.5 h-3.5" /> <span>Start Stream</span></>}
          </button>
        </div>

        <div className="p-2.5 bg-[#FAF7F2]/50 border-b border-[#E8AEA0]/60 text-center text-[11px] font-mono text-[#78716C]">
          Events arrive from real U-ID rows appended to the source CSV. Submission times reflect the append audit log.
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar bg-[#FFFDF9]">
          {events.length === 0 && !isRunning && (
            <div className="h-full flex items-center justify-center text-[#78716C] text-xs font-mono text-center">
              No timestamped new submissions to display. Click “Start Stream” to monitor live ingestion.
            </div>
          )}
          {events.length === 0 && isRunning && (
            <div className="h-full flex items-center justify-center text-[#78716C] text-xs font-mono text-center">
              Listening for real dream submissions. Events generate as new rows are appended.
            </div>
          )}
          {events.map((ev, i) => (
            <div key={`${ev.dream_id}-${i}`} className="bg-[#FAF7F2] border border-[#E8AEA0] rounded-xl p-3 flex items-center justify-between transition hover:border-[#DE6B48]">
              <div className="flex items-center space-x-3">
                <Database className="w-4 h-4 text-[#DE6B48]" />
                <span className="font-mono text-xs font-bold text-[#D95338]">{ev.dream_id}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-xs text-[#57534E] font-mono">{ev.word_count} words</span>
                <span className="text-[10px] text-[#A8A29E] font-mono">
                  {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'time unavailable'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stream Metrics Sidebar */}
      <div className="glass-card p-6 flex flex-col space-y-5 relative group">
        <span className="corner-plus text-[#DE6B48]/50 group-hover:text-[#DE6B48] transition-colors">+</span>

        <h3 className="font-editorial font-bold text-lg text-[#1F2421] border-b border-[#E8AEA0] pb-2">Stream Metrics</h3>
        
        <div className="bg-[#FAF7F2] border border-[#E8AEA0] rounded-xl p-4">
          <div className="flex items-center space-x-2.5 mb-1.5">
            <Activity className="w-4 h-4 text-[#3A8898]" />
            <h4 className="text-xs font-mono uppercase text-[#78716C]">Total Ingested</h4>
          </div>
          <p className="text-3xl font-editorial font-bold text-[#1F2421]">{metrics.total_processed.toLocaleString()}</p>
        </div>

        <div className="bg-[#FAF7F2] border border-[#E8AEA0] rounded-xl p-4">
          <div className="flex items-center space-x-2.5 mb-1.5">
            <Hash className="w-4 h-4 text-[#DE6B48]" />
            <h4 className="text-xs font-mono uppercase text-[#78716C]">Mean Word Count</h4>
          </div>
          <p className="text-3xl font-editorial font-bold text-[#1F2421]">{metrics.avg_word_count.toFixed(1)}</p>
        </div>

        <div className="flex-1 bg-[#FAF7F2] border border-[#E8AEA0] rounded-xl p-4 flex flex-col">
          <h4 className="text-xs font-mono uppercase text-[#78716C] mb-3">Live Emotion Distribution</h4>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {Object.entries(metrics.emotion_distribution).sort((a,b)=>b[1]-a[1]).map(([emo, count]) => (
              <div key={emo}>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="capitalize text-[#2D3142]">{emo}</span>
                  <span className="text-[#DE6B48] font-bold">{count}</span>
                </div>
                <div className="w-full bg-[#FFFDF9] border border-[#E8AEA0]/60 rounded-full h-2">
                  <div 
                    className="bg-[#DE6B48] h-full rounded-full" 
                    style={{ width: `${Math.min((count / Math.max(metrics.total_processed, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(metrics.emotion_distribution).length === 0 && (
              <p className="text-xs text-[#78716C] italic text-center py-4">No live emotions tabulated yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
