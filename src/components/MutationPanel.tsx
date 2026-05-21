import React from 'react';
import { SmartDial } from './SmartDial';

interface MutationPanelProps {
  state: any;
  setters: any;
}

export function MutationPanel({ state, setters }: MutationPanelProps) {
  return (
    <div className="absolute top-16 right-4 sm:right-64 bg-[#001220]/90 border border-[#87CEEB]/50 p-4 rounded w-64 sm:w-72 backdrop-blur-md z-50 pointer-events-auto font-mono text-[#D2B48C] shadow-lg shadow-[#87CEEB]/20 overflow-visible">
        <div className="flex justify-between items-center mb-4">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-[#87CEEB]">TRAITS PROBABILITIES</span>
        </div>
        <div className="flex flex-col gap-3 text-[9px]">
            <span className="font-bold border-b border-[#87CEEB]/30 pb-1 mt-2">APPENDAGES</span>
            <div className="grid grid-cols-3 gap-3">
                {Object.entries(state.traitProbs).map(([trait, prob]) => (
                    <div key={trait}>
                        <SmartDial state={state} setters={setters} tooltip={`TRAIT WEIGHT: Probability bias for the organism to grow specialized ${trait} ornaments during its lifecycle.`} label={trait.toUpperCase()} min={0.0} max={1.0} step={0.05} value={prob as number} onChange={(v) => {
                            setters.setTraitProbs((prev: any) => ({ ...prev, [trait]: v }));
                        }} color="#a855f7" />
                    </div>
                ))}
            </div>
            <span className="font-bold border-b border-[#87CEEB]/30 pb-1 mt-4">BIOLUMINESCENCE</span>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <SmartDial 
                      state={state} setters={setters}
                      tooltip={"GLOW PROBABILITY\nLikelihood of a newly spawned creature having bioluminescent glow traits."} 
                      label="GLOW_PROB" 
                      min={0.0} 
                      max={1.0} 
                      step={0.01} 
                      value={state.glowProbability} 
                      onChange={setters.setGlowProbability} 
                      color="#4ADE80" 
                      formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                    />
                </div>
            </div>
        </div>
    </div>
  );
}
