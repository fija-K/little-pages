import { useState, useEffect, useCallback, useRef } from 'react';
import type { PetAnimAction } from '../components/Pet';
import petFallbackData from '../data/pet_fallback.json';
import petAmbientData from '../data/pet_ambient.json';
import { getPetConfig } from '../config/pets';

export interface PetPrompt {
  id: string;
  topic: string;
  time: string;
  pet_line: string;
  question: string;
}

export type TimeSlot = 'morning' | 'evening' | 'any';

export function getTimeSlot(hour: number = new Date().getHours()): TimeSlot {
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }
  if (hour >= 17 || hour < 5) {
    return 'evening';
  }
  return 'any';
}

const SERVED_HISTORY_KEY = 'little_pages_pet_served_ids';
const MAX_HISTORY_LENGTH = 8;

export function getServedHistory(): string[] {
  try {
    const raw = localStorage.getItem(SERVED_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushServedHistory(id: string): void {
  try {
    const history = getServedHistory();
    const updated = [id, ...history.filter(h => h !== id)].slice(0, MAX_HISTORY_LENGTH);
    localStorage.setItem(SERVED_HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export function pickPrompt(petId: string): PetPrompt | null {
  const config = getPetConfig(petId);
  const jsonKey = config.jsonKey;
  const allPrompts: PetPrompt[] = (petFallbackData.pets as Record<string, PetPrompt[]>)[jsonKey] || [];

  if (allPrompts.length === 0) return null;

  const currentSlot = getTimeSlot();
  const history = getServedHistory();
  const lastServedId = history[0] || null;
  const lastTopic = allPrompts.find(p => p.id === lastServedId)?.topic || null;

  let candidates = allPrompts.filter(p => p.time === currentSlot || p.time === 'any');
  if (candidates.length === 0) candidates = allPrompts;

  let unserved = candidates.filter(p => !history.includes(p.id));
  if (unserved.length === 0) unserved = candidates;

  let topicFiltered = unserved.filter(p => p.topic !== lastTopic);
  if (topicFiltered.length === 0) topicFiltered = unserved;

  const chosen = topicFiltered[Math.floor(Math.random() * topicFiltered.length)];
  if (chosen) {
    pushServedHistory(chosen.id);
  }
  return chosen || candidates[0];
}

export interface UsePetCompanionOptions {
  petId: string;
  enabled: boolean;
  currentView: 'list' | 'calendar' | 'pet-care' | 'editor';
  isNewEntry: boolean;
  onOpenEditor: () => void;
  onInsertPromptBody: (questionText: string) => void;
}

export function usePetCompanion({
  petId,
  enabled,
  currentView,
  isNewEntry,
  onOpenEditor,
  onInsertPromptBody
}: UsePetCompanionOptions) {
  const [action, setAction] = useState<PetAnimAction>('breathe');
  const [greetingState, setGreetingState] = useState<'idle' | 'welcome' | 'question' | 'sleepy_dismiss'>('idle');
  const [currentPrompt, setCurrentPrompt] = useState<PetPrompt | null>(null);
  const [isPromptBubbleVisible, setIsPromptBubbleVisible] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [ambientBubble, setAmbientBubble] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Flow State Machine: 'sound' -> 'sound_gap' (2-3s) -> 'question' -> on skip -> 'skip_cooldown' (10s) -> 'sound'
  const [cycleStage, setCycleStage] = useState<'sound' | 'sound_gap' | 'question' | 'skip_cooldown'>('sound');

  const timersRef = useRef<number[]>([]);
  const lastSoundRef = useRef<string | null>(null);
  const perPetSoundCountRef = useRef<number>(0);
  const totalSoundCountRef = useRef<number>(0);
  const typingTimerRef = useRef<number | null>(null);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const petConfig = getPetConfig(petId);
  const jsonKey = petConfig.jsonKey;
  const petAmbientObj = (petAmbientData.pets as Record<string, { sounds: string[]; caring_lines?: string[] }>)[jsonKey] || {
    sounds: ["nyaa~", "purr purr~"]
  };
  const sharedPhrases = petAmbientData.shared_phrases || ["waku waku!", "pyon pyon!"];

  // Pick 1 text sound word (NO AUDIO)
  const pickSoundText = useCallback((): string => {
    const petSounds = petAmbientObj.sounds;
    const ratio = totalSoundCountRef.current > 0 ? perPetSoundCountRef.current / totalSoundCountRef.current : 0;

    let chosen = '';
    if (ratio < 0.5 || Math.random() < 0.7) {
      const unused = petSounds.filter(s => s !== lastSoundRef.current);
      chosen = unused[Math.floor(Math.random() * unused.length)] || petSounds[0];
      perPetSoundCountRef.current += 1;
    } else {
      const unused = sharedPhrases.filter(s => s !== lastSoundRef.current);
      chosen = unused[Math.floor(Math.random() * unused.length)] || sharedPhrases[0];
    }

    lastSoundRef.current = chosen;
    totalSoundCountRef.current += 1;
    return chosen;
  }, [petAmbientObj, sharedPhrases]);

  // MAIN STATE MACHINE LOOP
  // Flow: 1. Sound Text Word (display 2.5s) -> 2. Gap (2.5s) -> 3. Question -> 4. Skip (10s gap) -> Repeat 1.
  useEffect(() => {
    if (!enabled || isTyping || saveMessage) return;

    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (cycleStage === 'sound') {
      // Step 1: Display 1 Text Sound Word
      clearTimers();
      const soundText = pickSoundText();
      setAmbientBubble(soundText);
      setIsPromptBubbleVisible(false);

      if (!reducedMotion) {
        setAction('squishHop');
        addTimer(() => setAction('breathe'), 800);
      }

      // Display sound text for 2.5 seconds, then transition to 2-3s gap
      addTimer(() => {
        setAmbientBubble(null);
        setCycleStage('sound_gap');
      }, 2500);

    } else if (cycleStage === 'sound_gap') {
      // Step 2: 2-3 Second Gap between text sound and question
      clearTimers();
      setAction('breathe');

      // 2.5 second gap (2-3 sec gap)
      addTimer(() => {
        setCycleStage('question');
      }, 2500);

    } else if (cycleStage === 'question') {
      // Step 3: Question Stage
      clearTimers();
      if (!reducedMotion) {
        setAction('headWiggle');
        addTimer(() => setAction('breathe'), 700);
      }

      if (currentView === 'list') {
        setGreetingState('question');
      } else if (currentView === 'editor' && isNewEntry) {
        const prompt = pickPrompt(petId);
        setCurrentPrompt(prompt);
        setIsPromptBubbleVisible(true);
      }

    } else if (cycleStage === 'skip_cooldown') {
      // Step 4: After User Clicks Skip -> 10 Second Gap
      clearTimers();
      setGreetingState('idle');
      setIsPromptBubbleVisible(false);
      setAmbientBubble(null);
      setAction('breathe');

      // Exactly 10 second gap after skip
      addTimer(() => {
        setCycleStage('sound');
      }, 10000);
    }
  }, [
    cycleStage,
    enabled,
    isTyping,
    saveMessage,
    currentView,
    isNewEntry,
    petId,
    pickSoundText,
    clearTimers,
    addTimer
  ]);

  // Handle Home Greeting / Question "Let's write"
  const handleGreetingLetsWrite = useCallback(() => {
    clearTimers();
    setGreetingState('idle');
    setAction('cheer');
    onOpenEditor();
  }, [clearTimers, onOpenEditor]);

  // Handle Home Greeting / Question Skip ("Not now")
  const handleGreetingNotNow = useCallback(() => {
    clearTimers();
    setGreetingState('sleepy_dismiss');
    setAction('sleepy');

    addTimer(() => {
      // 10 Second Gap after Skip
      setCycleStage('skip_cooldown');
    }, 1200);
  }, [clearTimers, addTimer]);

  // Handle Swap Prompt ("Another one")
  const handleSwapPrompt = useCallback(() => {
    const nextPrompt = pickPrompt(petId);
    setCurrentPrompt(nextPrompt);
    setAction('headWiggle');
    addTimer(() => setAction('breathe'), 650);
  }, [petId, addTimer]);

  // Handle Insert Question into BODY
  const handleInsertQuestion = useCallback(() => {
    if (currentPrompt) {
      onInsertPromptBody(currentPrompt.question);
      setIsPromptBubbleVisible(false);
      setAction('happyBounce');
      addTimer(() => {
        setAction('breathe');
        setCycleStage('skip_cooldown');
      }, 1200);
    }
  }, [currentPrompt, onInsertPromptBody, addTimer]);

  // Handle Dismiss / Skip Prompt in Editor
  const handleDismissPrompt = useCallback(() => {
    clearTimers();
    setIsPromptBubbleVisible(false);
    setAction('breathe');
    // 10 Second Gap after Skip
    setCycleStage('skip_cooldown');
  }, [clearTimers]);

  // Handle User Typing in Editor
  const handleUserTyping = useCallback(() => {
    setIsTyping(true);
    setIsPromptBubbleVisible(false);
    setAmbientBubble(null);
    setAction('breathe');

    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = window.setTimeout(() => {
      setIsTyping(false);
      typingTimerRef.current = null;
      setCycleStage('sound');
    }, 20000);
  }, []);

  // Handle Entry Saved Event
  const handleEntrySaved = useCallback(() => {
    if (!enabled) return;
    clearTimers();
    setIsPromptBubbleVisible(false);
    setAmbientBubble(null);
    setSaveMessage('Saved. See you next time.');
    setAction('cheer');

    addTimer(() => {
      setSaveMessage(null);
      setAction('sleepy');
      // Transition back to 10s cooldown after save
      setCycleStage('skip_cooldown');
    }, 3000);
  }, [enabled, clearTimers, addTimer]);

  // Handle Interactive Pet Tap/Click
  const handlePetTap = useCallback(() => {
    clearTimers();

    const sounds = petAmbientObj.sounds;
    const sound = sounds[Math.floor(Math.random() * sounds.length)] || sounds[0];
    perPetSoundCountRef.current += 1;
    totalSoundCountRef.current += 1;

    let text = sound;
    if (Math.random() > 0.5) {
      const phrase = sharedPhrases[Math.floor(Math.random() * sharedPhrases.length)];
      text = `${sound} ${phrase}`;
    }

    setAmbientBubble(text);
    setAction('squishHop');

    addTimer(() => {
      setAction('breathe');
      setAmbientBubble(null);
      // Resume sound gap -> question after tap
      setCycleStage('sound_gap');
    }, 2000);
  }, [clearTimers, addTimer, petAmbientObj, sharedPhrases]);

  return {
    action,
    greetingState,
    currentPrompt,
    isPromptBubbleVisible,
    saveMessage,
    ambientBubble,
    isTyping,
    handleGreetingLetsWrite,
    handleGreetingNotNow,
    handleSwapPrompt,
    handleInsertQuestion,
    handleDismissPrompt,
    handleUserTyping,
    handleEntrySaved,
    handlePetTap
  };
}

export default usePetCompanion;
