import React, { useState, useEffect } from 'react';
import { 
  Home, 
  HelpCircle, 
  Settings, 
  Radio, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Headphones, 
  ShieldAlert, 
  BookOpen, 
  Sliders, 
  Activity, 
  ArrowLeft,
  Globe
} from 'lucide-react';
import { SacredGeometryCanvas } from './components/SacredGeometryCanvas';
import { FieldSelector } from './components/FieldSelector';
import { SessionController } from './components/SessionController';
import { GroundingOverlay } from './components/GroundingOverlay';
import { InsightRecorder } from './components/InsightRecorder';
import { MakePipelineModal } from './components/MakePipelineModal';
import { HarmonicScoreCard } from './components/HarmonicScoreCard';
import { VoiceCommandOverlay } from './components/VoiceCommandOverlay';
import { QuickGuideModal } from './components/QuickGuideModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { audioEngine } from './audio/HarmonicAudioEngine';
import { voiceEngine, VoiceProfile } from './audio/VoiceEngine';
import { hapticEngine } from './audio/HapticEngine';
import { DAILY_SESSIONS } from './data/sessions';
import { HarmonicState, SessionType, SomaticInsight } from './types';

export function App() {
  const [hasUserStarted, setHasUserStarted] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionType | null>(null);
  const [isGroundingActive, setIsGroundingActive] = useState(false);
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [isQuickGuideOpen, setIsQuickGuideOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'matrix' | 'journal'>('matrix');
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  const [state, setState] = useState<HarmonicState>(() => {
    const saved = localStorage.getItem('harmonic_field_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      score: 84,
      streakDays: 4,
      completedToday: {
        morning: false,
        midday: false,
        evening: false
      },
      totalSessions: 12,
      lastSessionDate: new Date().toISOString(),
      voiceMode: 'voice_active',
      voiceProfile: 'Charon',
      volume: 0.75,
      hapticsEnabled: true,
      webhookUrl: '',
      history: [],
      language: 'en'
    };
  });

  const [insights, setInsights] = useState<SomaticInsight[]>(() => {
    const saved = localStorage.getItem('harmonic_field_insights');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [
      {
        id: 'seed-1',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        sessionType: 'morning',
        dominantFrequency: '528 Hz',
        somaticLocation: 'Heart Space & Chest',
        themes: ['Release', 'Warmth'],
        symbols: ['Expanding Gold Spiral'],
        vagalState: 'Ventral Vagal (Safe & Connected)',
        affirmation: 'My nervous system is steady, calm, and grounded.',
        scoreDelta: 6,
        summary: 'Softened constriction in the upper chest after the 528Hz alignment, shoulders and jaw fully relaxed.',
        rawText: 'Felt heavy tightness in chest soften dramatically into golden warmth.'
      }
    ];
  });

  // Save State
  useEffect(() => {
    localStorage.setItem('harmonic_field_state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem('harmonic_field_insights', JSON.stringify(insights));
  }, [insights]);

  // Voice Engine Callbacks Setup
  useEffect(() => {
    const unregister = voiceEngine.registerCallbacks({
      onCommand: (command, raw) => {
        handleVoiceCommand(command, raw);
      },
      onListeningStateChange: (listening) => {
        setIsListening(listening);
      },
      onTranscriptUpdate: (transcript) => {
        setCurrentTranscript(transcript);
      }
    });

    return () => {
      unregister();
    };
  }, [hasUserStarted, activeSession, isGroundingActive]);

  // Sync settings into engines
  useEffect(() => {
    if (state.voiceMode === 'voice_active') {
      voiceEngine.setVoiceMuted(false);
      if (hasUserStarted) {
        voiceEngine.startListening();
      }
    } else {
      voiceEngine.setVoiceMuted(true);
      voiceEngine.stopListening();
    }
    voiceEngine.setVoiceProfile(state.voiceProfile || 'Charon');
    hapticEngine.setEnabled(state.hapticsEnabled);
    audioEngine.setVolume(state.volume);
  }, [state.voiceMode, state.voiceProfile, state.hapticsEnabled, state.volume, hasUserStarted]);

  // Voice Command Handler
  const handleVoiceCommand = (cmd: string, raw: string) => {
    switch (cmd) {
      case 'GROUND_ME_NOW':
        triggerEmergencyGrounding();
        break;
      case 'START_MORNING':
        startSession('morning');
        break;
      case 'START_MIDDAY':
        startSession('midday');
        break;
      case 'START_EVENING':
        startSession('evening');
        break;
      case 'MUTE_VOICE':
        toggleVoiceMute(true);
        break;
      case 'UNMUTE_VOICE':
        toggleVoiceMute(false);
        break;
      case 'SWITCH_VOICE':
        handleChangeVoiceProfile(state.voiceProfile === 'Charon' ? 'Aoede' : 'Charon');
        break;
      case 'RECORD_INSIGHT':
        setIsInsightOpen(true);
        break;
      case 'BEGIN':
        if (!isAudioPlaying) {
          handlePlay432HzAudio();
        } else if (!activeSession) {
          startSession('morning');
        }
        break;
      case 'STOP_AUDIO':
        handleStopAllAudio();
        break;
    }
  };

  /**
   * Primary Audio Start / 432 Hz Play Handler
   */
  const handlePlay432HzAudio = async () => {
    setHasUserStarted(true);
    await audioEngine.initContext();
    await audioEngine.start432HzTone();
    setIsAudioPlaying(true);
    hapticEngine.triggerWelcomePulse();

    if (state.voiceMode === 'voice_active') {
      voiceEngine.startListening();
    }
    
    // Welcoming voice prompt with slow, warm, human cadence
    voiceEngine.speak(
      "Welcome to your Harmonic Field. Say 'Begin' or select your field for today."
    );
  };

  /**
   * Strict Stop Engine Logic:
   * Explicitly executes oscillator.stop(), disconnect(), audioContext.suspend(),
   * and window.speechSynthesis.cancel() with zero lingering sound.
   */
  const handleStopAllAudio = () => {
    audioEngine.stopField(true);
    voiceEngine.stopSpeaking();
    setIsAudioPlaying(false);
  };

  const handleToggleAudio = () => {
    if (isAudioPlaying) {
      handleStopAllAudio();
    } else {
      handlePlay432HzAudio();
    }
  };

  const startSession = (type: SessionType) => {
    // Stop any existing loose tones before starting targeted session
    audioEngine.stopField(true);
    voiceEngine.stopSpeaking();

    if (!hasUserStarted) {
      setHasUserStarted(true);
    }
    setIsAudioPlaying(true);
    hapticEngine.triggerWelcomePulse();
    setIsGroundingActive(false);
    setActiveTab('matrix');
    setActiveSession(type);
  };

  const triggerEmergencyGrounding = () => {
    audioEngine.stopField(true);
    voiceEngine.stopSpeaking();
    if (!hasUserStarted) {
      setHasUserStarted(true);
    }
    setActiveSession(null);
    setIsGroundingActive(true);
    setIsAudioPlaying(true);
    audioEngine.triggerEmergencyGrounding();
  };

  const exitGrounding = () => {
    audioEngine.stopField(true);
    voiceEngine.stopSpeaking();
    setIsGroundingActive(false);
    handlePlay432HzAudio();
  };

  const returnHome = () => {
    audioEngine.stopField(true);
    voiceEngine.stopSpeaking();
    setActiveSession(null);
    setIsGroundingActive(false);
    setActiveTab('matrix');
    setIsAudioPlaying(false);
  };

  const completeSession = () => {
    if (activeSession && activeSession !== 'grounding' && activeSession !== 'ambient') {
      setState(prev => ({
        ...prev,
        score: Math.min(100, prev.score + 5),
        totalSessions: prev.totalSessions + 1,
        completedToday: {
          ...prev.completedToday,
          [activeSession]: true
        }
      }));
    }
    setActiveSession(null);
    setIsInsightOpen(true);
  };

  const handleInsightSaved = (newInsight: SomaticInsight, scoreDelta: number) => {
    setInsights(prev => [newInsight, ...prev]);
    setState(prev => ({
      ...prev,
      score: Math.min(100, prev.score + scoreDelta)
    }));
  };

  const toggleLanguage = (lang?: 'en' | 'es') => {
    setState(prev => {
      const nextLang = lang || (prev.language === 'es' ? 'en' : 'es');
      return { ...prev, language: nextLang };
    });
  };

  const toggleVoiceMode = () => {
    setState(prev => {
      const nextMode = prev.voiceMode === 'voice_active' ? 'silent' : 'voice_active';
      return { ...prev, voiceMode: nextMode };
    });
  };

  const toggleVoiceMute = (mute: boolean) => {
    setState(prev => ({ ...prev, voiceMode: mute ? 'silent' : 'voice_active' }));
    voiceEngine.setVoiceMuted(mute);
  };

  const handleChangeVoiceProfile = (profile: VoiceProfile) => {
    setState(prev => ({ ...prev, voiceProfile: profile }));
    voiceEngine.setVoiceProfile(profile);
    voiceEngine.speak(
      profile === 'Charon' 
        ? "Charon voice profile active: deep, warm, and grounding."
        : "Aoede voice profile active: calm, warm, and meditative."
    );
  };

  const toggleHaptics = () => {
    setState(prev => {
      const next = !prev.hapticsEnabled;
      hapticEngine.setEnabled(next);
      return { ...prev, hapticsEnabled: next };
    });
  };

  const handleVolumeChange = (vol: number) => {
    setState(prev => ({ ...prev, volume: vol }));
    audioEngine.setVolume(vol);
  };

  const toggleVolumeMute = () => {
    if (state.volume > 0) {
      handleVolumeChange(0);
    } else {
      handleVolumeChange(0.75);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#FDFBF7] text-stone-800 flex flex-col font-sans selection:bg-amber-300 selection:text-stone-900 overflow-x-hidden">
      {/* Background Soft Organic Glowing Canvas */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(245, 158, 11, 0.08) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(253, 164, 175, 0.08) 0%, transparent 45%), radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.06) 0%, transparent 60%)'
        }}
      />

      {/* Voice Control HUD Overlay */}
      <VoiceCommandOverlay
        isVoiceActiveMode={state.voiceMode === 'voice_active'}
        isListening={isListening}
        currentTranscript={currentTranscript}
        voiceProfile={state.voiceProfile || 'Charon'}
        onToggleVoiceMode={toggleVoiceMode}
        onChangeVoiceProfile={handleChangeVoiceProfile}
        onVoiceCommandClick={(cmd) => handleVoiceCommand(cmd, '')}
      />

      {/* PERMANENT TOP NAVIGATION BAR (Visible on EVERY screen) */}
      <header 
        id="permanent-top-navbar"
        className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-stone-200/80 shadow-xs"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div 
            onClick={returnHome}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-xs border border-amber-200/90 group-hover:scale-105 transition-transform bg-amber-50 flex items-center justify-center">
              <img
                id="app-brand-logo"
                src="/logo.png"
                alt="Harmonic Field Official Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-serif font-bold text-stone-900 tracking-tight">
                  Harmonic Field
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold">
                  Somatic Core
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-mono hidden md:block">
                Sound Frequency & Nervous System Re-alignment
              </p>
            </div>
          </div>

          {/* Core Three Navigation Buttons: [ 🏠 Home ] | [ ❓ Quick Guide ] | [ ⚙️ Audio Settings ] */}
          <nav className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100/90 border border-stone-200 text-xs font-semibold">
            <button
              id="nav-btn-home"
              onClick={returnHome}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                !activeSession && !isGroundingActive && activeTab === 'matrix'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200 font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
              }`}
            >
              <Home className="w-4 h-4 text-amber-600" />
              <span>{state.language === 'es' ? '🏠 Inicio' : '🏠 Home'}</span>
            </button>

            <button
              id="nav-btn-quick-guide"
              onClick={() => setIsQuickGuideOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-stone-700 hover:text-stone-900 hover:bg-white/60 transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-sky-600" />
              <span>❓ Quick Guide</span>
            </button>

            <button
              id="nav-btn-audio-settings"
              onClick={() => setIsAudioSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-stone-700 hover:text-stone-900 hover:bg-white/60 transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4 text-emerald-600" />
              <span>⚙️ Audio Settings</span>
            </button>
          </nav>

          {/* Right Header Panel: Master Volume Slider & Language Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Spanish App Link Pill */}
            <a
              id="nav-btn-language-toggle"
              href="https://campoarmonico.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              title="Switch to Spanish / Español (Campo Armónico)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-mono font-medium text-stone-700 transition-all cursor-pointer shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5 text-amber-700" />
              <span className="font-bold">ES</span>
            </a>

            {/* Somatic History View Toggle Pill */}
            <button
              id="nav-btn-toggle-journal"
              onClick={() => {
                setActiveSession(null);
                setIsGroundingActive(false);
                setActiveTab(activeTab === 'journal' ? 'matrix' : 'journal');
              }}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                activeTab === 'journal'
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Somatic Log</span>
            </button>

            {/* Master Volume Slider (0% - 100%) */}
            <div 
              id="master-volume-control-panel"
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-stone-100/90 border border-stone-200 shadow-2xs"
            >
              <button
                id="btn-mute-toggle"
                type="button"
                onClick={toggleVolumeMute}
                title={state.volume > 0 ? "Click to Mute" : "Click to Unmute"}
                className="text-stone-600 hover:text-amber-800 transition-colors cursor-pointer"
              >
                {state.volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-amber-700" />
                )}
              </button>
              
              <div className="flex flex-col">
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-stone-600 font-semibold">
                  <span className="hidden sm:inline">Volume</span>
                  <span>{Math.round(state.volume * 100)}%</span>
                </div>
                <input
                  id="slider-master-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={state.volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  aria-label="Master Volume Slider (0% to 100%)"
                  className="w-16 sm:w-24 h-1.5 bg-stone-300 rounded-lg appearance-none cursor-pointer accent-amber-600 hover:accent-amber-700 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="relative z-10 flex-1 flex flex-col justify-center p-4 md:p-8 max-w-6xl mx-auto w-full pb-16 md:pb-12">
        {/* Active Sub-screen or Main Field Selector */}
        {activeSession ? (
          <div className="w-full h-full min-h-[640px] flex-1 rounded-3xl bg-white/95 border border-stone-200 shadow-xl overflow-hidden">
            <SessionController
              config={DAILY_SESSIONS[activeSession] || DAILY_SESSIONS.morning}
              onComplete={completeSession}
              onEmergencyGrounding={triggerEmergencyGrounding}
              onExit={returnHome}
              voiceEnabled={state.voiceMode === 'voice_active'}
              onToggleVoice={toggleVoiceMode}
              hapticsEnabled={state.hapticsEnabled}
            />
          </div>
        ) : activeTab === 'matrix' ? (
          <FieldSelector
            onEnableAudioAndVoice={handlePlay432HzAudio}
            onStopAudio={handleStopAllAudio}
            onToggleAudio={handleToggleAudio}
            onSelectSession={startSession}
            onEmergencyGrounding={triggerEmergencyGrounding}
            onOpenInsight={() => setIsInsightOpen(true)}
            onOpenPipelineModal={() => setIsPipelineModalOpen(true)}
            onOpenQuickGuide={() => setIsQuickGuideOpen(true)}
            state={state}
            isAudioUnlocked={hasUserStarted}
            isAudioPlaying={isAudioPlaying}
          />
        ) : (
          <HarmonicScoreCard
            insights={insights}
            score={state.score}
            streakDays={state.streakDays}
            onOpenInsightModal={() => setIsInsightOpen(true)}
            onBackToHome={returnHome}
          />
        )}
      </main>

      {/* BILINGUAL BRANDING FOOTER (Fixed/Sticky at the very bottom of every page/screen) */}
      <footer 
        id="app-branding-footer"
        className="sticky bottom-0 z-30 w-full bg-[#FDFBF7]/95 backdrop-blur-md border-t border-stone-200/50 py-3.5 px-4 pb-7 sm:pb-3.5 shadow-xs"
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-1.5 text-center">
          {/* Footer Navigation Line: Quick Guide • Audio Settings • 🌐 Switch to Spanish / Español */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] text-[#666666]">
            <button
              id="footer-btn-quick-guide"
              onClick={() => setIsQuickGuideOpen(true)}
              className="text-[#666666] hover:text-stone-900 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Quick Guide
            </button>
            <span className="text-stone-300">•</span>
            <button
              id="footer-btn-audio-settings"
              onClick={() => setIsAudioSettingsOpen(true)}
              className="text-[#666666] hover:text-stone-900 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Audio Settings
            </button>
            <span className="text-stone-300">•</span>
            <a
              id="footer-btn-spanish-version"
              href="https://campoarmonico.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#666666] hover:text-stone-900 underline underline-offset-2 transition-colors cursor-pointer"
            >
              🌐 Switch to Spanish / Español
            </a>
          </div>

          {/* Copyright Line */}
          <p className="text-xs text-[#666666] font-normal leading-relaxed tracking-normal">
            Powered by{' '}
            <a
              href="https://lgworkflowsolutions.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline decoration-[#666666]/50 hover:decoration-stone-900 text-[#666666] hover:text-stone-900 transition-colors cursor-pointer"
            >
              LG Workflow Solutions
            </a>{' '}
            • © 2026 All Rights Reserved
          </p>
        </div>
      </footer>

      {/* MODALS & OVERLAYS */}
      <GroundingOverlay
        isOpen={isGroundingActive}
        onExit={exitGrounding}
        voiceEnabled={state.voiceMode === 'voice_active'}
      />

      <QuickGuideModal
        isOpen={isQuickGuideOpen}
        onClose={() => setIsQuickGuideOpen(false)}
        onSelectSession={(id) => startSession(id)}
      />

      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
        volume={state.volume}
        onVolumeChange={handleVolumeChange}
        voiceMode={state.voiceMode}
        onToggleVoiceMode={toggleVoiceMode}
        voiceProfile={state.voiceProfile || 'Charon'}
        onChangeVoiceProfile={handleChangeVoiceProfile}
        hapticsEnabled={state.hapticsEnabled}
        onToggleHaptics={toggleHaptics}
        language={state.language || 'en'}
        onChangeLanguage={(lang) => toggleLanguage(lang)}
        onOpenPipelineModal={() => {
          setIsAudioSettingsOpen(false);
          setIsPipelineModalOpen(true);
        }}
      />

      <InsightRecorder
        isOpen={isInsightOpen}
        onClose={() => setIsInsightOpen(false)}
        sessionType={activeSession || 'morning'}
        dominantFrequency="432Hz"
        userId="user_default"
        webhookUrl={state.webhookUrl}
        onInsightSaved={handleInsightSaved}
      />

      <MakePipelineModal
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
        userId="user_default"
        webhookUrl={state.webhookUrl}
        onSaveWebhookUrl={(url) => setState(prev => ({ ...prev, webhookUrl: url }))}
      />
    </div>
  );
}

export default App;
