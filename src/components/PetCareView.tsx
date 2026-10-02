import React, { useState, useEffect, useRef } from 'react';
import { PET_CONFIGS, getPetConfig } from '../config/pets';
import { Pet } from './Pet';
import type { PetAnimAction } from './Pet';
import petAmbientData from '../data/pet_ambient.json';
import { X, Info, Sparkles } from 'lucide-react';

interface PetCareViewProps {
  selectedPetId: string;
  onSelectPetId: (id: string) => void;
  petEnabled: boolean;
  onTogglePetEnabled: () => void;
}

export const PetCareView: React.FC<PetCareViewProps> = ({
  selectedPetId,
  onSelectPetId,
  petEnabled,
  onTogglePetEnabled
}) => {
  const currentPetConfig = getPetConfig(selectedPetId);

  // About Me Keywords State (Persisted in localStorage)
  const [keywords, setKeywords] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('little_pages_pet_keywords');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [keywordInput, setKeywordInput] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('little_pages_pet_keywords', JSON.stringify(keywords));
  }, [keywords]);

  // Chatty Mode State (Quiet / Normal / Chatty)
  const [chattyMode, setChattyMode] = useState<'quiet' | 'normal' | 'chatty'>(() => {
    const saved = localStorage.getItem('little_pages_pet_chatty_mode');
    return (saved === 'quiet' || saved === 'chatty' || saved === 'normal') ? saved : 'normal';
  });

  useEffect(() => {
    localStorage.setItem('little_pages_pet_chatty_mode', chattyMode);
  }, [chattyMode]);

  const unmountTimers = useRef<number[]>([]);

  const addTimer = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    unmountTimers.current.push(id);
  };

  useEffect(() => {
    return () => {
      unmountTimers.current.forEach(window.clearTimeout);
    };
  }, []);

  // Interactive Pet Studio & Playground State
  const [playgroundAction, setPlaygroundAction] = useState<PetAnimAction>('breathe');
  const [playgroundX, setPlaygroundX] = useState<number>(0);
  const [playgroundFacingLeft, setPlaygroundFacingLeft] = useState<boolean>(false);
  const [playgroundBubble, setPlaygroundBubble] = useState<string | null>(null);

  // Playground Hopping & Calm Sequential Loop (Message -> 2s gap -> Sleep/Action -> 2s gap)
  useEffect(() => {
    let timeoutId: number;
    let step = 0; // 0: message, 1: action/sleep

    const executeNextMoment = () => {
      const petConfig = getPetConfig(selectedPetId);
      const ambientObj = (petAmbientData.pets as Record<string, { sounds: string[]; caring_lines?: string[] }>)[petConfig.jsonKey];
      const sounds = ambientObj?.sounds || ["nyaa~"];
      const caringLines = ambientObj?.caring_lines || ["You're doing great!"];
      const sharedPhrases = petAmbientData.shared_phrases || ["waku waku!"];

      if (step === 0) {
        // MOMENT 1: Show 1 Text Message
        const pool = [...sounds, ...caringLines, ...sharedPhrases];
        const chosenText = pool[Math.floor(Math.random() * pool.length)];

        setPlaygroundAction('headWiggle');
        setPlaygroundBubble(chosenText);

        addTimer(() => {
          setPlaygroundAction('breathe');
        }, 700);

        // Hide message after 2.5s, then wait EXACTLY 2-second gap
        timeoutId = window.setTimeout(() => {
          setPlaygroundBubble(null);
          setPlaygroundAction('breathe');
          step = 1;

          // 2-Second Gap resting quietly before next action
          timeoutId = window.setTimeout(executeNextMoment, 2000);
        }, 2500);

      } else {
        // MOMENT 2: Sleep or Action (No message)
        const actions: PetAnimAction[] = ['sleepy', 'squishHop', 'happyBounce', 'headWiggle'];
        const chosenAction = actions[Math.floor(Math.random() * actions.length)];

        if (chosenAction === 'squishHop') {
          const deltaX = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 40) + 15);
          const newX = Math.max(-80, Math.min(80, playgroundX + deltaX));
          setPlaygroundFacingLeft(newX < playgroundX);
          setPlaygroundX(newX);
          setPlaygroundAction('squishHop');
          addTimer(() => setPlaygroundAction('breathe'), 900);
        } else if (chosenAction === 'sleepy') {
          setPlaygroundAction('sleepy');
          addTimer(() => setPlaygroundAction('breathe'), 2500);
        } else if (chosenAction === 'headWiggle') {
          setPlaygroundAction('headWiggle');
          addTimer(() => setPlaygroundAction('breathe'), 700);
        } else {
          setPlaygroundAction('happyBounce');
          addTimer(() => setPlaygroundAction('breathe'), 1100);
        }

        // Action duration 2.0s, then wait EXACTLY 2-second gap
        timeoutId = window.setTimeout(() => {
          setPlaygroundAction('breathe');
          step = 0;

          // 2-Second Gap resting quietly before next message
          timeoutId = window.setTimeout(executeNextMoment, 2000);
        }, 2000);
      }
    };

    executeNextMoment();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedPetId, playgroundX]);

  const handlePlaygroundTap = () => {
    const petConfig = getPetConfig(selectedPetId);
    const ambientObj = (petAmbientData.pets as Record<string, { sounds: string[] }>)[petConfig.jsonKey];
    const sounds = ambientObj?.sounds || ["nyaa~"];
    const sound = sounds[Math.floor(Math.random() * sounds.length)];
    const sharedPhrases = petAmbientData.shared_phrases;
    const phrase = sharedPhrases[Math.floor(Math.random() * sharedPhrases.length)];

    setPlaygroundBubble(`${sound} ${phrase}`);
    setPlaygroundAction('happyBounce');
    addTimer(() => {
      setPlaygroundAction('breathe');
      setPlaygroundBubble(null);
    }, 1800);
  };

  const handleSelectPet = (id: string) => {
    onSelectPetId(id);
    setPlaygroundAction('happyBounce');
    const petConfig = getPetConfig(id);
    const ambientObj = (petAmbientData.pets as Record<string, { sounds: string[] }>)[petConfig.jsonKey];
    const sound = ambientObj?.sounds[0] || "nyaa~";
    setPlaygroundBubble(`Hello! ${sound}`);
    addTimer(() => {
      setPlaygroundAction('breathe');
      setPlaygroundBubble(null);
    }, 2000);
  };

  // Keyword Add Handler
  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keywordInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 30) return;
    if (keywords.length >= 10) return;
    if (keywords.includes(trimmed)) return;

    setKeywords(prev => [...prev, trimmed]);
    setKeywordInput('');
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="pet-care-view max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner & Control Settings */}
      <div className="bg-white rounded-3xl p-6 border-2 border-pink-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="font-handwritten text-2xl font-bold text-stone-800 flex items-center gap-2">
            Pet Care & Companion Center 🐾
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Customize your companion, manage keywords, and play with {currentPetConfig.name}!
          </p>
        </div>

        {/* Global Controls: Pet On/Off & Ambient Chatty Mode */}
        <div className="flex flex-wrap items-center gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-700">Pet Companion:</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={petEnabled}
                onChange={onTogglePetEnabled}
              />
              <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
            </label>
            <span className="text-xs font-extrabold text-pink-600">
              {petEnabled ? 'ON' : 'OFF'}
            </span>
          </div>

          <div className="h-4 w-px bg-stone-200 hidden sm:block" />

          {/* Ambient Chatter Mode Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-stone-700">Chatter:</span>
            <div className="inline-flex rounded-xl bg-stone-200/70 p-0.5 border border-stone-300 text-xs font-bold">
              {(['quiet', 'normal', 'chatty'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setChattyMode(mode)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                    chattyMode === mode
                      ? 'bg-pink-500 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Pet Studio Playground Stage */}
      <div className="bg-gradient-to-b from-pink-50/80 to-white rounded-3xl p-6 border-2 border-pink-200 shadow-sm relative overflow-hidden flex flex-col items-center justify-center min-h-[220px] text-center space-y-3">
        <div className="absolute top-3 left-4 text-xs font-bold text-pink-500 bg-pink-100/90 px-3 py-1 rounded-full border border-pink-200 flex items-center gap-1.5 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-pink-500" />
          <span>Pet Studio Playground</span>
        </div>

        {/* Playground Hop Stage Area */}
        <div className="relative w-full max-w-lg h-36 flex items-end justify-center pt-8 overflow-visible">
          <Pet
            petId={selectedPetId}
            action={playgroundAction}
            bubbleContent={
              playgroundBubble ? (
                <div className="text-center font-bold text-pink-600 text-xs">
                  {playgroundBubble}
                </div>
              ) : null
            }
            translateX={playgroundX}
            facingLeft={playgroundFacingLeft}
            onTap={handlePlaygroundTap}
            inline
          />
        </div>

        <p className="text-xs text-stone-500 font-bold pt-1">
          Tap <b>{currentPetConfig.name}</b> to play! Watch it hop, bounce, and react in real-time. 🐾
        </p>
      </div>

      {/* Pet Selector Grid */}
      <div className="bg-white rounded-3xl p-6 border-2 border-pink-200 shadow-sm space-y-3">
        <h3 className="font-handwritten text-xl font-bold text-stone-800 flex items-center gap-2">
          <span>Choose Your Companion</span>
          <span className="text-xs font-normal text-stone-500">(Used across home & journal editor)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {PET_CONFIGS.map(pet => {
            const isSelected = selectedPetId === pet.id;
            return (
              <button
                key={pet.id}
                type="button"
                onClick={() => handleSelectPet(pet.id)}
                className={`p-3 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'border-pink-500 bg-pink-50 text-stone-800 font-bold scale-105 shadow-md'
                    : 'border-stone-200 text-stone-600 hover:border-pink-300 hover:bg-stone-50'
                }`}
              >
                <img
                  src={pet.imageSrc}
                  alt={pet.name}
                  className="w-10 h-10 object-contain drop-shadow-xs pointer-events-none"
                />
                <span className="text-xs truncate w-full">{pet.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Keywords Manager */}
      <div className="bg-white rounded-3xl p-6 border-2 border-pink-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-handwritten text-xl font-bold text-stone-800 flex items-center gap-2">
            <span>"About Me" Keywords</span>
            <span className="text-xs font-normal text-stone-500">({keywords.length}/10)</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Add short words or interests (e.g. <i>gym, guitar, cricket</i>). These help customize your experience.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAddKeyword} className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            maxLength={30}
            disabled={keywords.length >= 10}
            placeholder={keywords.length >= 10 ? 'Limit reached (10 keywords max)' : 'Add a short keyword (e.g. music)...'}
            className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-stone-200 bg-stone-50/50 text-xs font-bold text-stone-800 outline-none focus:border-pink-400 focus:bg-white transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!keywordInput.trim() || keywords.length >= 10}
            className="px-5 py-2.5 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition-all"
          >
            Add
          </button>
        </form>

        {/* Keywords List */}
        <div className="flex flex-wrap gap-2 pt-1">
          {keywords.map((kw, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-100 border border-pink-200 text-pink-700 font-bold text-xs shadow-xs"
            >
              <span>{kw}</span>
              <button
                type="button"
                onClick={() => handleRemoveKeyword(i)}
                className="hover:text-pink-900 rounded-full p-0.5"
                title="Remove keyword"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {keywords.length === 0 && (
            <span className="text-xs italic text-stone-400">No keywords added yet. Add one above!</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span><b>Privacy Note:</b> Keywords stay 100% stored on your local browser device.</span>
        </div>
      </div>

    </div>
  );
};

export default PetCareView;
