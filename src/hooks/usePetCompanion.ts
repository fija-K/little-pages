import { useState, useEffect, useCallback, useRef } from 'react';
import type { PetAnimAction } from '../components/Pet';
import petFallbackData from '../data/pet_fallback.json';
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

  // 1. Filter by time slot matching (time matches slot or is 'any')
  let candidates = allPrompts.filter(p => p.time === currentSlot || p.time === 'any');
  if (candidates.length === 0) candidates = allPrompts;

  // 2. Filter out last 8 served prompt IDs if possible
  let unserved = candidates.filter(p => !history.includes(p.id));
  if (unserved.length === 0) unserved = candidates;

  // 3. Avoid back-to-back same topic if possible
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
  currentView: 'list' | 'calendar' | 'editor';
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

  const timersRef = useRef<number[]>([]);

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

  // 1. HOME GREETING FLOW
  useEffect(() => {
    if (!enabled || currentView !== 'list') return;

    const greeted = sessionStorage.getItem('little_pages_pet_greeted');
    if (!greeted) {
      // Set greeted flag immediately as greeting starts
      sessionStorage.setItem('little_pages_pet_greeted', 'true');

      clearTimers();
      setAction('happyBounce');
      setGreetingState('welcome');

      addTimer(() => {
        setAction('headWiggle');
      }, 1200);

      addTimer(() => {
        setAction('breathe');
        setGreetingState('question');
      }, 3000);
    }
  }, [enabled, currentView, clearTimers, addTimer]);

  // 2. EDITOR OPEN FLOW
  useEffect(() => {
    if (!enabled || currentView !== 'editor') {
      setIsPromptBubbleVisible(false);
      setCurrentPrompt(null);
      setSaveMessage(null);
      return;
    }

    // Only show editor prompt flow for new/empty entries
    if (isNewEntry) {
      clearTimers();
      setAction('squishHop');
      setIsPromptBubbleVisible(false);

      addTimer(() => {
        setAction('breathe');
        const prompt = pickPrompt(petId);
        setCurrentPrompt(prompt);
        setIsPromptBubbleVisible(true);
      }, 2500);
    } else {
      setAction('breathe');
      setIsPromptBubbleVisible(false);
    }
  }, [enabled, currentView, isNewEntry, petId, clearTimers, addTimer]);

  // Handle Home Greeting "Let's write"
  const handleGreetingLetsWrite = useCallback(() => {
    clearTimers();
    setGreetingState('idle');
    setAction('cheer');
    onOpenEditor();
  }, [clearTimers, onOpenEditor]);

  // Handle Home Greeting "Not now"
  const handleGreetingNotNow = useCallback(() => {
    clearTimers();
    setGreetingState('sleepy_dismiss');
    setAction('sleepy');

    addTimer(() => {
      setGreetingState('idle');
      setAction('breathe');
    }, 4000);
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
      addTimer(() => setAction('breathe'), 1200);
    }
  }, [currentPrompt, onInsertPromptBody, addTimer]);

  // Handle Dismiss Prompt Bubble
  const handleDismissPrompt = useCallback(() => {
    setIsPromptBubbleVisible(false);
    setAction('breathe');
  }, []);

  // Handle User Typing in Editor
  const handleUserTyping = useCallback(() => {
    if (isPromptBubbleVisible) {
      setIsPromptBubbleVisible(false);
      setAction('breathe');
    }
  }, [isPromptBubbleVisible]);

  // Handle Entry Saved Event
  const handleEntrySaved = useCallback(() => {
    if (!enabled) return;
    clearTimers();
    setIsPromptBubbleVisible(false);
    setSaveMessage('Saved. See you next time.');
    setAction('cheer');

    addTimer(() => {
      setSaveMessage(null);
      setAction('sleepy');
    }, 3000);
  }, [enabled, clearTimers, addTimer]);

  return {
    action,
    greetingState,
    currentPrompt,
    isPromptBubbleVisible,
    saveMessage,
    handleGreetingLetsWrite,
    handleGreetingNotNow,
    handleSwapPrompt,
    handleInsertQuestion,
    handleDismissPrompt,
    handleUserTyping,
    handleEntrySaved
  };
}
