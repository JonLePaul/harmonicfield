export type SessionType = 'morning' | 'midday' | 'evening' | 'grounding' | 'insight' | 'ambient';

export type GeometryType = 'flower_of_life' | 'metatron_cube' | 'torus_field' | 'golden_spiral' | 'earth_yantra';

export interface SolfeggioFrequency {
  hz: number;
  name: string;
  somaticBenefit: string;
  chakraOrZone: string;
}

export interface SessionConfig {
  id: SessionType;
  title: string;
  subtitle: string;
  durationMinutes: number;
  carrierHz: number;
  entrainmentHz: number;
  entrainmentType: 'alpha' | 'schumann' | 'delta' | 'theta' | 'sub_bass';
  geometry: GeometryType;
  primaryColor: string;
  secondaryColor: string;
  accentGlow: string;
  focus: string;
  soundLabel?: string;
  visualLabel?: string;
  soundPurpose?: string;
  visualPurpose?: string;
  combinedExplanation?: string;
  vocalCues: string[];
}

export interface SomaticInsight {
  id: string;
  timestamp: string;
  sessionType: SessionType;
  dominantFrequency: string;
  rawText: string;
  themes: string[];
  symbols: string[];
  somaticLocation: string;
  summary: string;
  scoreDelta: number;
  vagalState: string;
  affirmation: string;
  syncedToWebhook?: boolean;
}

export interface MakeWebhookPayload {
  user_id: string;
  session_type: string;
  dominant_frequency: string;
  somatic_location: string;
  extracted_insight: string;
  harmonic_field_score?: number;
  timestamp?: string;
}

export interface HarmonicState {
  score: number;
  completedToday: {
    morning: boolean;
    midday: boolean;
    evening: boolean;
  };
  streakDays: number;
  totalSessions: number;
  lastSessionDate: string;
  voiceMode: 'voice_active' | 'silent';
  voiceProfile?: 'Charon' | 'Aoede';
  volume: number;
  hapticsEnabled: boolean;
  webhookUrl: string;
  userId?: string;
  history?: any[];
  language?: 'en' | 'es';
}
