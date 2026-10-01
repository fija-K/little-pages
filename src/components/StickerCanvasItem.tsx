import React, { useRef, useState, useEffect } from 'react';
import { X, Copy, FlipHorizontal, ArrowUp, ArrowDown, RotateCw, Maximize2 } from 'lucide-react';
import type { PlacedSticker } from '../types/journal';
import { getStickerUrl } from '../config/stickerPacks';

interface StickerCanvasItemProps {
  sticker: PlacedSticker;
  isSelected: boolean;
  isReadOnly?: boolean;
  onSelect: (e: React.MouseEvent | React.TouchEvent) => void;
  onChange: (updated: PlacedSticker) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
}

export const StickerCanvasItem: React.FC<StickerCanvasItemProps> = ({
  sticker,
  isSelected,
  isReadOnly = false,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  containerRef
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: sticker.x,
    initialY: sticker.y
  });

  const resizeStartRef = useRef<{ startX: number; startY: number; initialScale: number }>({
    startX: 0,
    startY: 0,
    initialScale: sticker.scale
  });

  const rotateStartRef = useRef<{ centerX: number; centerY: number; initialAngle: number; initialRotation: number }>({
    centerX: 0,
    centerY: 0,
    initialAngle: 0,
    initialRotation: sticker.rotation
  });

  const imgUrl = getStickerUrl(sticker.packId, sticker.stickerId);

  // Mouse / Touch Dragging Handler
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    onSelect(e);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: sticker.x,
      initialY: sticker.y
    };
  };

  // Dragging movement
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.startX;
      const deltaY = clientY - dragStartRef.current.startY;

      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      const newX = Math.min(95, Math.max(5, dragStartRef.current.initialX + deltaXPercent));
      const newY = Math.min(95, Math.max(5, dragStartRef.current.initialY + deltaYPercent));

      onChange({
        ...sticker,
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10
      });
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, containerRef, onChange, sticker]);

  // Improved Resize Handle using distance from center
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!itemRef.current) return;

    const rect = itemRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const initialDistance = Math.hypot(clientX - centerX, clientY - centerY) || 1;

    setIsResizing(true);
    resizeStartRef.current = {
      startX: centerX, // store center position
      startY: centerY,
      initialScale: sticker.scale
    };
    // store initial distance in a ref
    (resizeStartRef.current as any).initialDistance = initialDistance;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const centerX = resizeStartRef.current.startX;
      const centerY = resizeStartRef.current.startY;
      const initialDistance = (resizeStartRef.current as any).initialDistance || 1;

      const currentDistance = Math.hypot(clientX - centerX, clientY - centerY);
      const scaleRatio = currentDistance / initialDistance;
      const newScale = Math.min(3.0, Math.max(0.3, resizeStartRef.current.initialScale * scaleRatio));

      onChange({
        ...sticker,
        scale: Math.round(newScale * 100) / 100
      });
    };

    const handleUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isResizing, onChange, sticker]);

  // Rotate Handle
  const handleRotateStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!itemRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const initialAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);

    setIsRotating(true);
    rotateStartRef.current = {
      centerX,
      centerY,
      initialAngle,
      initialRotation: sticker.rotation
    };
  };

  useEffect(() => {
    if (!isRotating) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const currentAngle =
        Math.atan2(clientY - rotateStartRef.current.centerY, clientX - rotateStartRef.current.centerX) *
        (180 / Math.PI);

      const deltaAngle = currentAngle - rotateStartRef.current.initialAngle;
      const newRotation = (rotateStartRef.current.initialRotation + deltaAngle) % 360;

      onChange({
        ...sticker,
        rotation: Math.round(newRotation)
      });
    };

    const handleUp = () => {
      setIsRotating(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isRotating, onChange, sticker]);

  if (!imgUrl) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${sticker.x}%`,
    top: `${sticker.y}%`,
    transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg) ${
      sticker.flipped ? 'scaleX(-1)' : ''
    }`,
    zIndex: sticker.zIndex || 1,
    cursor: isReadOnly ? 'default' : 'grab',
    userSelect: 'none',
    touchAction: 'none'
  };

  return (
    <div
      ref={itemRef}
      style={style}
      className={`placed-sticker-wrapper ${isSelected ? 'selected' : ''}`}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src={imgUrl}
        alt="sticker"
        className="placed-sticker-img"
        draggable={false}
      />

      {isSelected && !isReadOnly && (
        <>
          {/* Action Toolbar above sticker */}
          <div
            className="sticker-action-toolbar"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="sticker-tool-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate sticker"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              className="sticker-tool-btn"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ ...sticker, flipped: !sticker.flipped });
              }}
              title="Flip horizontally"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              className="sticker-tool-btn"
              onClick={(e) => {
                e.stopPropagation();
                onBringForward();
              }}
              title="Bring forward"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              className="sticker-tool-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSendBackward();
              }}
              title="Send backward"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              className="sticker-tool-btn danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete sticker"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scale Handle */}
          <div
            className="sticker-handle scale-handle"
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            onClick={(e) => e.stopPropagation()}
            title="Drag to resize"
          >
            <Maximize2 className="w-3.5 h-3.5 text-pink-600" />
          </div>

          {/* Rotate Handle */}
          <div
            className="sticker-handle rotate-handle"
            onMouseDown={handleRotateStart}
            onTouchStart={handleRotateStart}
            onClick={(e) => e.stopPropagation()}
            title="Drag to rotate"
          >
            <RotateCw className="w-3.5 h-3.5 text-pink-600" />
          </div>
        </>
      )}
    </div>
  );
};
