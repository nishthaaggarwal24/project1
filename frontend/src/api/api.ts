import axios from 'axios';
import {
  TwinProfileResponse, DreamAnalysisResponse, SimilarDreamResponse,
  SymbolFrequencyResponse, EmotionDistributionResponse, SentimentTrajectoryResponse,
  DreamDNAResponse, TwinChatResponse, SubmitDreamResponse, DreamListResponse,
  EmotionalClimateResponse, EmotionalClimateSeasonResponse, ClusterAnalysisResponse,
  SymbolEvolutionResponse, StreamingEventResponse, OrgOverviewResponse,
  CorrelationDataResponse, AuditLogResponse, SyntheticCheckResponse
} from '../types';

const client = axios.create({
  baseURL: '/api',
});

export const api = {
  // System A
  getTwinDashboard: () => client.get<any>('/system-a/dashboard').then(res => res.data),
  searchDreams: (q: string, limit = 20) => client.get<any>('/system-a/search', { params: { q, limit } }).then(res => res.data),
  getSimilarById: (id: string, limit = 10) => client.get<any>(`/system-a/similar/${encodeURIComponent(id)}`, { params: { limit } }).then(res => res.data),
  getOverview: () => client.get<TwinProfileResponse>('/system-a/twin-profile').then(res => res.data),
  analyzeDream: (text: string) => client.post<any>('/system-a/analyze', { text }).then(res => ({ sentiment: res.data.sentiment.label, compound_score: res.data.emotional_polarity, emotional_polarity: res.data.emotional_polarity, matched_symbols: Object.fromEntries(res.data.matched_symbols.map((x: any) => [x.symbol, x.count])), similar_dreams: res.data.similar_dreams.map((x: any) => ({ dream_id: x.Dream_ID, similarity: x.similarity_score, text: x.Dream_Text, emotion: x.Emotion || 'Unavailable' })) })),
  getSimilarDreams: (text: string) => client.post<any>('/system-a/analyze', { text }).then(res => res.data.similar_dreams.map((x: any) => ({ dream_id: x.Dream_ID, similarity: x.similarity_score, text: x.Dream_Text, emotion: x.Emotion || 'Unavailable' }))),
  getSymbolFrequencies: () => client.get<SymbolFrequencyResponse>('/system-a/symbol-frequencies').then(res => res.data),
  getEmotionDistribution: () => client.get<EmotionDistributionResponse>('/system-a/emotion-distribution').then(res => res.data),
  getSentimentTrajectory: () => client.get<SentimentTrajectoryResponse>('/system-a/sentiment-trajectory').then(res => res.data),
  getDreamDNA: () => client.get<DreamDNAResponse>('/system-a/dream-dna').then(res => res.data),
  chatWithTwin: (message: string, history: any[]) => client.post<TwinChatResponse>('/system-a/twin-chat', { message, session_history: history }).then(res => res.data),
  submitDream: (dream_text: string) => client.post<any>('/system-a/submit-dream', { dream_text }).then(res => ({ dream_id: res.data.dream_id, analysis: { sentiment: res.data.analysis.sentiment.label, compound_score: res.data.analysis.sentiment.compound, emotional_polarity: res.data.analysis.sentiment.compound, matched_symbols: res.data.analysis.matched_symbols } })),
  getDreams: (page: number, page_size: number) => client.get<DreamListResponse>('/system-a/dreams', { params: { page, page_size } }).then(res => res.data),

  // System B
  getEmotionalClimate: () => client.get<EmotionalClimateResponse>('/system-b/emotional-climate').then(res => res.data),
  getEmotionalClimateBySeason: () => client.get<EmotionalClimateSeasonResponse>('/system-b/emotional-climate-by-season').then(res => res.data),
  getClusterAnalysis: () => client.get<ClusterAnalysisResponse>('/system-b/cluster-analysis').then(res => res.data),
  getSymbolEvolution: () => client.get<SymbolEvolutionResponse>('/system-b/symbol-evolution').then(res => res.data),
  getStreamingEvents: (limit: number, offset: number) => client.get<StreamingEventResponse>('/system-b/streaming-events', { params: { limit, offset } }).then(res => res.data),
  getOrgOverview: () => client.get<OrgOverviewResponse>('/system-b/overview-stats').then(res => res.data),
  getCorrelationData: () => client.get<CorrelationDataResponse>('/system-b/correlation-data').then(res => res.data),
  getStressAnalysis: () => client.get<any>('/system-b/stress-analysis').then(res => res.data),
  getSleepStageAnalysis: () => client.get<any>('/system-b/sleep-stage-analysis').then(res => res.data),
  getDreamNetwork: (limit = 60) => client.get<any>('/system-b/dream-network', { params: { limit } }).then(res => res.data),

  // Governance
  getAuditLog: () => client.get<any>('/governance/audit-log').then(res => ({ logs: (res.data.audit_log || []).map((x: any) => ({ ...x, details: JSON.stringify(x.details) })) })),
  getSyntheticCheck: () => client.get<any>('/governance/synthetic-check').then(res => ({ clean: res.data.status === 'clean', count_verified: !res.data.violations?.length, violations: res.data.violations || [], message: res.data.status === 'clean' ? `Integrity check passed for ${res.data.total_checked} records` : 'Integrity violations found' })),
  getProvenance: (id: string) => client.get<any>(`/governance/data-provenance/${encodeURIComponent(id)}`).then(res => res.data),
};
