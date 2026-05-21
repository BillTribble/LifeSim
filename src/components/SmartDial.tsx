import React from 'react';
import { Dial } from './Dial';

interface SmartDialProps {
  label?: string;
  min: number;
  max: number;
  state: any;
  setters: any;
  searchQuery?: string;
  tooltip?: string;
  step: number;
  value: number;
  onChange: (val: number) => void;
  color?: string;
  formatValue?: (val: number) => React.ReactNode;
  hideValue?: boolean;
}

export function SmartDial(props: SmartDialProps) {
  const { label, min: defaultMin, max: defaultMax, state, setters, searchQuery, tooltip, ...rest } = props;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const match = label?.toLowerCase().includes(q) || tooltip?.toLowerCase().includes(q);
    if (!match) return null;
  }
  const limits = state.dialLimits?.[label as string];
  const min = limits?.min ?? defaultMin;
  const max = limits?.max ?? defaultMax;
  
  return (
    <Dial 
      label={label}
      min={min}
      max={max}
      tooltip={tooltip}
      {...rest}
      onLimitsChange={(newMin: number, newMax: number) => {
        if (setters.setDialLimits) {
          setters.setDialLimits((prev: any) => ({ ...prev, [label as string]: { min: newMin, max: newMax } }));
        }
      }}
    />
  );
}
