import React from 'react';
import { getPetConfig } from '../config/pets';
import './Pet.css';

export type PetAnimAction = 'breathe' | 'squishHop' | 'happyBounce' | 'headWiggle' | 'sleepy' | 'cheer';

export interface PetProps {
  petId?: string;
  action?: PetAnimAction;
  bubbleContent?: React.ReactNode;
  onTap?: () => void;
  className?: string;
}

export const Pet: React.FC<PetProps> = ({
  petId = 'chinchilla',
  action = 'breathe',
  bubbleContent = null,
  onTap,
  className = ''
}) => {
  const petConfig = getPetConfig(petId);

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Map action names to CSS animation class names
  const animClass = reducedMotion
    ? 'breathe'
    : action === 'squishHop'
    ? 'hop'
    : action === 'happyBounce'
    ? 'happy'
    : action === 'headWiggle'
    ? 'wiggle'
    : action === 'cheer'
    ? 'happy'
    : action;

  return (
    <div className={`pet-widget-layer ${className}`}>
      <div className="pet-widget-container">
        {bubbleContent && (
          <div className="pet-speech-bubble">
            {bubbleContent}
          </div>
        )}

        <div className="pet-flip-wrapper">
          <button
            type="button"
            className={`pet-body-btn ${animClass}`}
            onClick={onTap}
            aria-label={`Pet ${petConfig.name}`}
          >
            <img
              src={petConfig.imageSrc}
              alt={petConfig.name}
              className="pet-image"
              draggable={false}
            />
          </button>
        </div>

        <div className={`pet-shadow-item ${animClass}`} />

        {(action === 'happyBounce' || action === 'cheer') && !reducedMotion && (
          <div className="pet-fx-overlay">
            <span className="pet-heart-fx h1">♥</span>
            <span className="pet-sparkle-fx s1">✨</span>
            <span className="pet-heart-fx h2">♥</span>
          </div>
        )}

        {action === 'sleepy' && (
          <div className="pet-zzz-overlay">
            <span className="pet-z-fx z1">z</span>
            <span className="pet-z-fx z2">z</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pet;
