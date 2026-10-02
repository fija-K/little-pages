import React from 'react';
import { Pet } from './Pet';
import { usePetCompanion, getTimeSlot } from '../hooks/usePetCompanion';

export interface PetCompanionLayerProps {
  petId: string;
  enabled: boolean;
  isUnlocked: boolean;
  currentView: 'list' | 'calendar' | 'pet-care' | 'editor';
  isNewEntry: boolean;
  onOpenEditor: () => void;
  onInsertPromptBody: (questionText: string) => void;
  onRegisterTypingHandler?: (handler: () => void) => void;
  onRegisterSaveHandler?: (handler: () => void) => void;
}

export const PetCompanionLayer: React.FC<PetCompanionLayerProps> = ({
  petId,
  enabled,
  isUnlocked,
  currentView,
  isNewEntry,
  onOpenEditor,
  onInsertPromptBody,
  onRegisterTypingHandler,
  onRegisterSaveHandler
}) => {
  const {
    action,
    greetingState,
    currentPrompt,
    isPromptBubbleVisible,
    saveMessage,
    ambientBubble,
    handleGreetingLetsWrite,
    handleGreetingNotNow,
    handleSwapPrompt,
    handleInsertQuestion,
    handleDismissPrompt,
    handleUserTyping,
    handleEntrySaved,
    handlePetTap
  } = usePetCompanion({
    petId,
    enabled,
    currentView,
    isNewEntry,
    onOpenEditor,
    onInsertPromptBody
  });

  // Register callbacks for editor typing & save
  React.useEffect(() => {
    if (onRegisterTypingHandler) {
      onRegisterTypingHandler(handleUserTyping);
    }
  }, [onRegisterTypingHandler, handleUserTyping]);

  React.useEffect(() => {
    if (onRegisterSaveHandler) {
      onRegisterSaveHandler(handleEntrySaved);
    }
  }, [onRegisterSaveHandler, handleEntrySaved]);

  if (!isUnlocked || !enabled || currentView === 'pet-care') {
    return null;
  }

  // Greeting Time Greeting Text
  const currentSlot = getTimeSlot();
  const timeGreetingText =
    currentSlot === 'morning'
      ? 'Good morning! Welcome back ✨'
      : currentSlot === 'evening'
      ? 'Good evening! Welcome back ✨'
      : 'Hello! Welcome back ✨';

  // Construct Speech Bubble Content
  let bubbleContent: React.ReactNode = null;

  if (saveMessage) {
    bubbleContent = (
      <div className="text-center font-bold text-stone-700">
        {saveMessage}
      </div>
    );
  } else if (currentView === 'list') {
    if (greetingState === 'welcome') {
      bubbleContent = (
        <div className="text-center font-bold text-pink-600">
          {timeGreetingText}
        </div>
      );
    } else if (greetingState === 'question') {
      bubbleContent = (
        <div className="space-y-2">
          <p className="font-bold text-stone-800 text-xs">
            How was your day? Want to write about it?
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleGreetingLetsWrite}
              className="px-2.5 py-1 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
            >
              Let's write ✍️
            </button>
            <button
              type="button"
              onClick={handleGreetingNotNow}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold text-xs transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      );
    } else if (greetingState === 'sleepy_dismiss') {
      bubbleContent = (
        <div className="text-center font-medium text-stone-500 text-xs">
          No pressure. I'll be here. 💤
        </div>
      );
    }
  } else if (currentView === 'editor' && isPromptBubbleVisible && currentPrompt) {
    bubbleContent = (
      <div className="space-y-2">
        <p className="text-[11.5px] italic text-stone-500">
          "{currentPrompt.pet_line}"
        </p>
        <button
          type="button"
          onClick={handleInsertQuestion}
          title="Click to insert as body prompt"
          className="block w-full text-left font-bold text-pink-600 hover:text-pink-700 hover:bg-pink-50/70 p-1.5 rounded-lg border border-pink-200 transition-colors text-xs"
        >
          {currentPrompt.question}
        </button>
        <div className="flex items-center justify-between pt-1 border-t border-stone-100">
          <button
            type="button"
            onClick={handleSwapPrompt}
            className="text-[11px] font-bold text-stone-500 hover:text-pink-600 flex items-center gap-1"
          >
            Another one 🔄
          </button>
          <button
            type="button"
            onClick={handleDismissPrompt}
            className="text-[11px] font-bold text-stone-400 hover:text-stone-600 px-1.5 py-0.5 rounded hover:bg-stone-100"
          >
            Skip ✕
          </button>
        </div>
      </div>
    );
  }

  // Fallback to ambient chatter bubble if no active prompt/greeting bubble
  if (!bubbleContent && ambientBubble) {
    bubbleContent = (
      <div className="text-center font-bold text-stone-700">
        {ambientBubble}
      </div>
    );
  }

  return (
    <Pet
      petId={petId}
      action={action}
      bubbleContent={bubbleContent}
      onTap={() => {
        if (currentView === 'editor' && !isPromptBubbleVisible && isNewEntry) {
          handleSwapPrompt();
        } else {
          handlePetTap();
        }
      }}
    />
  );
};

export default PetCompanionLayer;
