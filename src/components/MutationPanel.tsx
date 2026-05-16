import React from 'react';
import { Dial } from './Dial';

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
            <div className="grid grid-cols-3 gap-2 mt-2">
                <Dial tooltip="BRANCH FREQUENCY: Multiplier for the chance of an organism splitting into new branches as it expands. High values create dense bushes." label="BRANCHING" min={0.0} max={1000.0} step={0.1} value={state.branchingMultiplier} onChange={setters.setBranchingMultiplier} color="#a855f7" />
                <Dial tooltip="BRANCH MUTATION: Child vs parent traits. High = branches look entirely alien. Low = branches perfectly match." label="B_MUTATE" min={0.0} max={5.0} step={0.01} value={state.branchMutationRate} onChange={setters.setBranchMutationRate} color="#a855f7" />
                <Dial tooltip="LARGE BRANCH PROB: Probability that a branching segment will be larger (thicker) than the parent instead of getting smaller. Default is 50%." label="LRG_BRANCH" min={0.0} max={1.0} step={0.05} value={state.branchSplitSizeProb} onChange={setters.setBranchSplitSizeProb} color="#a855f7" />
            </div>
            
            <span className="font-bold border-b border-[#87CEEB]/30 pb-1 mt-2">APPENDAGES</span>
            <div className="grid grid-cols-3 gap-3">
                {Object.entries(state.traitProbs).map(([trait, prob]) => (
                    <div key={trait}>
                        <Dial tooltip={`TRAIT WEIGHT: Probability bias for the organism to grow specialized ${trait} ornaments during its lifecycle.`} label={trait.toUpperCase()} min={0.0} max={1.0} step={0.05} value={prob as number} onChange={(v) => {
                            setters.setTraitProbs((prev: any) => ({ ...prev, [trait]: v }));
                        }} color="#a855f7" />
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}
