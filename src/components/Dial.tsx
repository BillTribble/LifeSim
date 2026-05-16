import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DialProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  color?: string;
  label?: string;
  tooltip?: string;
}

export function Dial({ value, min, max, step, onChange, color = '#87CEEB', label, tooltip }: DialProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(value);
  const [hover, setHover] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    if (containerRef.current) {
        containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaY = startY.current - e.clientY;
    const range = max - min;
    const deltaVal = (deltaY / 100) * range;
    let newVal = startVal.current + deltaVal;
    
    newVal = Math.round(newVal / step) * step;
    newVal = Math.max(min, Math.min(max, newVal));
    
    if (newVal !== value) {
      onChange(newVal);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    if (containerRef.current) {
        containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const percent = (value - min) / (max - min);
  const angle = -135 + percent * 270;

  const onMouseEnter = () => {
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
    }
    setHover(true);
  };

  return (
    <div 
      className="flex flex-col items-center gap-1 relative group w-12"
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => setHover(false)}
    >
      {hover && tooltip && createPortal(
        <div 
          className="fixed bg-[#001220]/95 border border-[#D2B48C]/50 text-white text-[10px] px-3 py-2 rounded pointer-events-none w-48 text-center z-[9999] shadow-xl font-sans leading-relaxed backdrop-blur-sm"
          style={{ 
            left: tooltipPos.x, 
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%)' 
          }}
        >
          {tooltip}
        </div>,
        document.body
      )}
      {label && <span className="text-[9px] opacity-100 text-white font-medium uppercase text-center leading-tight whitespace-nowrap">{label}</span>}
      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-8 h-8 rounded-full border-2 bg-[#001220]/80 cursor-ns-resize shadow-md"
        style={{ borderColor: color, boxShadow: `0 0 5px ${color}40` }}
      >
        <div 
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div 
            className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>
      <span className="text-[8px] font-mono opacity-80" style={{ color }}>{Number.isInteger(step) ? value.toFixed(0) : value.toFixed(step < 0.1 ? 2 : 1)}</span>
    </div>
  );
}
