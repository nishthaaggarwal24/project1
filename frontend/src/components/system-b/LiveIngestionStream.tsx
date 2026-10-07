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
      const res = await api.getStreamingEvents(5, offset); // fetch 5 at a time
      if (res.events.length === 0) {
        setMetrics({total_processed:res.total_processed,avg_word_count:res.avg_word_count,emotion_distribution:res.emotion_distribution});
        // Keep polling at the current offset so a later real CSV submission appears live.
        return;
      }
      
      setEvents(prev => [...prev, ...res.events].slice(-50)); // keep last 50
      setMetrics({
        total_processed: res.total_processed,
        avg_word_count: res.avg_word_count,
        emotion_distribution: res.emotion_distribution
      });
      setOffset(prev => prev + res.events.length);
      
      // Auto-scroll
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
      intervalRef.current = setInterval(fetchNextBatch, 2000); // Poll every 2 seconds
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, offset]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      <div className="lg:col-span-2 glass-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-dream-border flex justify-between items-center bg-dream-dark/50">
          <div className="flex items-center space-x-4">
            <h3 className="font-bold">Live Dream Stream</h3>
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
              </span>
              <span className="text-xs text-gray-400 uppercase tracking-wider">{isRunning ? 'Running' : 'Paused'}</span>
            </div>
          </div>
          
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              isRunning ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {isRunning ? <><Pause className="w-4 h-4" /> <span>Pause Stream</span></> : <><Play className="w-4 h-4" /> <span>Start Stream</span></>}
          </button>
        </div>

        <div className="p-2 bg-indigo-900/20 border-b border-dream-border text-center">
          <span className="text-[10px] text-indigo-300">Events come from real U-ID rows appended to the source CSV. Submission times are joined from the CSV audit log; historical records are not replayed.</span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-black/20">
          {events.length === 0 && !isRunning && (
            <div className="h-full flex items-center justify-center text-gray-500 text-center">
              No timestamped new submissions to display. No events are generated.
            </div>
          )}
          {events.length === 0 && isRunning && (
            <div className="h-full flex items-center justify-center text-gray-500 text-center">
              Waiting for real dream submissions. No events are generated while the source CSV is unchanged.
            </div>
          )}
          {events.map((ev, i) => (
            <div key={`${ev.dream_id}-${i}`} className="bg-dream-card border border-dream-border rounded-lg p-3 flex items-center justify-between animate-fade-in-up">
              <div className="flex items-center space-x-4">
                <Database className="w-4 h-4 text-gray-500" />
                <span className="font-mono text-sm text-indigo-300">{ev.dream_id}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-500 font-mono">{ev.word_count} words</span>
                <span className="text-[10px] text-gray-600 font-mono">{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'time unavailable'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6 flex flex-col space-y-6">
        <h3 className="font-bold border-b border-dream-border pb-2">Stream Metrics</h3>
        
        <div className="bg-dream-dark/50 border border-dream-border rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm text-gray-400">Total Processed</h4>
          </div>
          <p className="text-3xl font-mono font-bold text-white">{metrics.total_processed.toLocaleString()}</p>
        </div>

        <div className="bg-dream-dark/50 border border-dream-border rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <Hash className="w-5 h-5 text-blue-400" />
            <h4 className="text-sm text-gray-400">Avg Word Count</h4>
          </div>
          <p className="text-3xl font-mono font-bold text-white">{metrics.avg_word_count.toFixed(1)}</p>
        </div>

        <div className="flex-1 bg-dream-dark/50 border border-dream-border rounded-lg p-4 flex flex-col">
          <h4 className="text-sm text-gray-400 mb-4">Emotion Distribution (Stream)</h4>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(metrics.emotion_distribution).sort((a,b)=>b[1]-a[1]).map(([emo, count]) => (
              <div key={emo}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="capitalize text-gray-300">{emo}</span>
                  <span className="font-mono text-gray-500">{count}</span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-1.5">
                  <div 
                    className="bg-indigo-500 h-1.5 rounded-full" 
                    style={{ width: `${Math.min((count / Math.max(metrics.total_processed, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
