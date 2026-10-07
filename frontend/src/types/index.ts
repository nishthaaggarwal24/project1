export interface TwinProfileResponse {
  stage: string;
  progress_score: number;
  confidence: number;
  total_dreams: number;
  dominant_emotion: string;
  emotional_diversity: number;
  patterns_detected: number;
  symbols_learned: number;
  top_symbols: { symbol: string; count: number; evidence_ids: string[] }[];
  top_emotions: { emotion: string; count: number; evidence_ids: string[] }[];
  historical_consistency: string;
  limitation: string;
  confidence_formula: string;
}

export interface DreamAnalysisResponse {
  dream_id?: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  compound_score: number;
  emotional_polarity: number;
  matched_symbols: Record<string, number>;
}

export interface SimilarDreamResponse {
  dream_id: string;
  similarity: number;
  text: string;
  emotion: string;
}

export interface SymbolFrequencyResponse {
  records_count: number;
  symbols: { symbol: string; frequency: number }[];
}

export interface EmotionDistributionResponse {
  records_count: number;
  distribution: { emotion: string; value: number; evidence_ids?: string[] }[];
  timeline_available?: boolean;
  limitation?: string;
}

export interface SentimentTrajectoryResponse {
  records_count: number;
  trajectory: { season: string; mean_sentiment_score: number; positive_pct: number; negative_pct: number }[];
  distribution?: { sentiment: string; count: number; percentage: number; evidence_ids: string[] }[];
  limitation?: string;
}

export interface DreamDNAResponse {
  records_count: number;
  dominant_emotions: { emotion: string; strength: number; evidence_ids: string[] }[];
  dominant_symbols: { symbol: string; count: number; evidence_ids: string[] }[];
  limitation: string;
  narrative_richness: number;
  emotional_polarity: number;
  evidence_ids: string[];
  total_dreams: number;
}

export interface TwinChatResponse {
  response: string;
  cited_dreams: { dream_id: string; similarity?: number; excerpt: string; keywords?: string[]; emotion?: string }[];
  reasoning_chain: string[];
}

export interface SubmitDreamResponse {
  dream_id: string;
  analysis: DreamAnalysisResponse;
}

export interface DreamListResponse {
  page: number;
  total: number;
  dreams: any[];
}

export interface EmotionalClimateResponse {
  records_count: number;
  supporting_records?: number;
  indices: { name: string; percentage: number; count: number }[];
}

export interface EmotionalClimateSeasonResponse {
  records_count: number;
  seasons: { name: string; fear: number; hope: number; stress: number; belonging: number; loneliness: number }[];
}

export interface ClusterAnalysisResponse {
  available?: boolean;
  records_count: number;
  selected_k?: number;
  method?: string;
  limitation?: string;
  cluster_count_scores?: { k: number; inertia: number; silhouette: number; elbow_strength?: number; selection_score?: number }[];
  clusters: {
    cluster_id: number;
    size: number;
    top_keywords: string[];
    dominant_emotion: string;
    sentiment: string;
    emotion_distribution: { emotion: string; value: number }[];
    representative_dreams: { dream_id: string; text: string; emotion: string }[];
  }[];
}

export interface SymbolEvolutionResponse {
  records_count: number;
  data: any[];
}

export interface StreamingEventResponse {
  events: { dream_id: string; emotion?: string; word_count: number; timestamp?: string }[];
  total_processed: number;
  avg_word_count: number;
  emotion_distribution: Record<string, number>;
  available?: boolean;
  total?: number;
  has_more?: boolean;
  limitation?: string;
}

export interface OrgOverviewResponse {
  total_dreams: number;
  active_users: number;
}

export interface CorrelationDataResponse {
  data: any[];
}

export interface AuditLogResponse {
  logs: { event_type: string; dream_id: string; timestamp: string; details: string }[];
}

export interface SyntheticCheckResponse {
  clean: boolean;
  count_verified: boolean;
  violations: string[];
  message: string;
}
