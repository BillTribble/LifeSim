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
  onLimitsChange?: (min: number, max: number) => void;
  formatValue?: (val: number) => React.ReactNode;
  hideValue?: boolean;
}

export function Dial({ value, min, max, step, onChange, color = '#87CEEB', label, tooltip, onLimitsChange, formatValue, hideValue }: DialProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(value);
  const [hover, setHover] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showDialog, setShowDialog] = useState(false);
  const [tempMin, setTempMin] = useState(min.toString());
  const [tempMax, setTempMax] = useState(max.toString());

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      setTempMin(min.toString());
      setTempMax(max.toString());
      setShowDialog(true);
      return;
    }
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

  const handleDialogSubmit = () => {
    const newMin = parseFloat(tempMin);
    const newMax = parseFloat(tempMax);
    if (!isNaN(newMin) && !isNaN(newMax)) {
      onLimitsChange?.(newMin, newMax);
    }
    setShowDialog(false);
  };

  return (
    <div 
      className="flex flex-col items-center gap-1 relative group min-w-[56px]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => setHover(false)}
    >
      {showDialog && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-[#001220] border border-[#D2B48C] p-4 rounded shadow-2xl flex flex-col gap-3 font-mono text-[10px]">
             <h3 className="text-[#87CEEB] text-center mb-2">Configure {label} Limits</h3>
             <label className="flex justify-between items-center gap-4 text-[#D2B48C]">
                Min: <input type="number" step="any" value={tempMin} onChange={e => setTempMin(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDialogSubmit()} className="bg-black/50 border border-[#D2B48C]/50 px-2 py-1 w-20 text-white focus:outline-none focus:border-[#87CEEB]" />
             </label>
             <label className="flex justify-between items-center gap-4 text-[#D2B48C]">
                Max: <input type="number" step="any" value={tempMax} onChange={e => setTempMax(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDialogSubmit()} className="bg-black/50 border border-[#D2B48C]/50 px-2 py-1 w-20 text-white focus:outline-none focus:border-[#87CEEB]" />
             </label>
             <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowDialog(false)} className="px-3 py-1 border border-[#D2B48C]/50 text-[#D2B48C] hover:bg-white/10 rounded">Cancel</button>
                <button onClick={handleDialogSubmit} className="px-3 py-1 border border-[#D2B48C] bg-[#D2B48C]/20 text-[#D2B48C] hover:bg-[#D2B48C]/40 rounded">OK</button>
             </div>
          </div>
        </div>,
        document.body
      )}
      {hover && tooltip && !showDialog && createPortal(
        <div 
          className="fixed bg-[#001220]/95 border border-[#D2B48C]/50 text-white text-[10px] px-3 py-2 rounded pointer-events-none w-64 text-left z-[9999] shadow-xl font-sans leading-relaxed backdrop-blur-sm whitespace-pre-line"
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
      {!hideValue && (
        <span className="text-[8px] font-mono opacity-80" style={{ color }}>
          {formatValue ? formatValue(value) : (Number.isInteger(step) ? value.toFixed(0) : value.toFixed(step <= 0.0001 ? 4 : step <= 0.001 ? 3 : step < 0.1 ? 2 : 1))}
        </span>
      )}
    </div>
  );
}
