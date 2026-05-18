import React, { useState, useEffect } from 'react';
import { Save, Minus, Dices, RotateCcw } from 'lucide-react';
import { DEFAULTS } from '../hooks/useSimulationState';

interface PresetPanelProps {
  state: any;
  setters: any;
  stats: any;
  setRandomizeKey: any;
  handleRestart: () => void;
}

export function PresetPanel({ state, setters, stats, setRandomizeKey, handleRestart }: PresetPanelProps) {
  const [presets, setPresets] = useState<any[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('presets') || '[]');
      if (!stored.some((p: any) => p.name === "Agent recommended")) {
        stored.unshift({
          id: "agent-recommended",
          name: "Agent recommended",
          state: {
            ...DEFAULTS,
            rotationSpeed: 0.1,
            maxDOMs: 341000,
            maxAgents: 50,
            minAgents: 4,
            maxSpecies: 4,
            boundarySize: 150,
            magnetism: 10.0,
            proximity: 40,
            desperation: 7.7,
            despairAge: 800,
            entropyThreshold: 0.7,
            ecoFade: 1.0,
            cullRate: 48.87,
            growthSpeed: 1.6,
            diebackRate: 5.0,
            diebackAgeBias: 1.5,
            terminationProb: 0.02,
            desiccationSpeed: 9.9,
            feelerFade: 10,
            hybridCooldown: 200,
            hybridSize: 3.5,
            hybridStickiness: 47,
            branchTendencyVar: 50,
            branchingMultiplier: 3.0,
            termProbPostBranch: 1.5,
            branchMutationRate: 0.0,
            branchBigger: 0.75,
            branchSplitSizeProb: 0.95,
            timeScale: 2.2,
            snakeSpeed: 1.5,
            bushSpeed: 1.0,
            treeSpeed: 1.0,
            gingerSpeed: 1.0,
            flowerSize: 0.41,
            taperDuration: 1.0,
            maxLineWidth: 12.0,
            multicolorAppProb: 0.05,
            sameColorAppProb: 0.9,
            globalPulseSpeed: 0.1,
            maxSaturation: 0.8
          }
        });
        localStorage.setItem('presets', JSON.stringify(stored));
      }
      return stored;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('presets', JSON.stringify(presets));
  }, [presets]);

  const generateName = () => {
    const adjs = ["Neon", "Feral", "Silent", "Chaotic", "Ancient", "Primal", "Cosmic", "Toxic", "Luminous", "Abyssal"];
    const adj = adjs[Math.floor(Math.random() * adjs.length)];
    const topStrains = stats.strains?.slice(0, 2).map((s: any) => s.name.split(' ')[0].replace(/\[.*?\]/, '').trim()) || ["Void"];
    return `${adj} ${topStrains.join('-')}`;
  };

  const handleSave = () => {
    const newPreset = {
      id: Date.now().toString(),
      name: generateName(),
      state: { ...state }
    };
    setPresets([...presets, newPreset]);
  };

  const handleLoad = (presetState: any) => {
    Object.keys(presetState).forEach(key => {
      const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
      if (setters[setterName]) {
        setters[setterName](presetState[key]);
      }
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresets(presets.filter(p => p.id !== id));
  };

  const handleFactoryReset = () => {
    Object.keys(DEFAULTS).forEach(key => {
      const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
      if (setters[setterName]) {
        setters[setterName]((DEFAULTS as any)[key]);
      }
    });
  };

  const handleRandomize = () => {
    const r = () => Math.random();
    const rRange = (min: number, max: number) => min + r() * (max - min);
    
    // Core parameters
    if (setters.setMagnetism) setters.setMagnetism(rRange(0, 0.1));
    if (setters.setProximity) setters.setProximity(rRange(1, 2000));
    if (setters.setDesperation) setters.setDesperation(rRange(1, 10));
    if (setters.setDespairAge) setters.setDespairAge(rRange(100, 5000));
    if (setters.setFlowerSize) setters.setFlowerSize(rRange(0.05, 1.0));
    if (setters.setEntropyThreshold) setters.setEntropyThreshold(rRange(0.0, 1.0));
    if (setters.setGrowthSpeed) setters.setGrowthSpeed(rRange(0.1, 5.0));
    if (setters.setDiebackRate) setters.setDiebackRate(rRange(0.0, 10.0));
    
    // Tides & Environment
    if (setters.setTideSpeed) setters.setTideSpeed(rRange(0.1, 5.0));
    if (setters.setTideThickness) setters.setTideThickness(rRange(10, 500));
    if (setters.setTideOpacity) setters.setTideOpacity(rRange(0.0, 1.0));
    if (setters.setTideSaturation) setters.setTideSaturation(rRange(0.0, 1.0));
    if (setters.setFogVisibility) setters.setFogVisibility(rRange(100, 2000));
    if (setters.setDesiccationSpeed) setters.setDesiccationSpeed(rRange(0.1, 15.0));
    if (setters.setGlobalPulseSpeed) setters.setGlobalPulseSpeed(rRange(0.1, 1.0));
    if (setters.setMaxSaturation) setters.setMaxSaturation(rRange(0.0, 1.0));
    if (setters.setMaxLineWidth) setters.setMaxLineWidth(rRange(1.0, 20.0));
    
    // Hybrids & Branching
    if (setters.setHybridCooldown) setters.setHybridCooldown(rRange(10, 2000));
    if (setters.setHybridStickiness) setters.setHybridStickiness(rRange(1, 50));
    if (setters.setBranchTendencyVar) setters.setBranchTendencyVar(rRange(1, 50));
    if (setters.setOrnamentFrequency) setters.setOrnamentFrequency(rRange(0.1, 10));
    if (setters.setBranchingMultiplier) setters.setBranchingMultiplier(rRange(0.1, 500));
    if (setters.setBranchBigger) setters.setBranchBigger(rRange(0.0, 1.0));
    if (setters.setBranchSplitSizeProb) setters.setBranchSplitSizeProb(rRange(0.0, 1.0));
    if (setters.setBranchMutationRate) setters.setBranchMutationRate(rRange(0.0, 1.0));
    if (setters.setHybridSize) setters.setHybridSize(rRange(0.5, 10.0));
    if (setters.setTermProbPostBranch) setters.setTermProbPostBranch(rRange(0.5, 10.0));
    
    // Limits
    if (setters.setMaxAgents) setters.setMaxAgents(Math.floor(rRange(1, 200)));
    if (setters.setMaxSpecies) setters.setMaxSpecies(Math.floor(rRange(1, 20)));
    if (setters.setMinAgents) setters.setMinAgents(Math.floor(rRange(2, 20)));
    if (setters.setEcoFade) setters.setEcoFade(rRange(0.0, 1.0));
    if (setters.setTerminationProb) setters.setTerminationProb(rRange(0.0, 1.0));
    if (setters.setTaperDuration) setters.setTaperDuration(rRange(0.5, 3.0));
    if (setters.setDiebackAgeBias) setters.setDiebackAgeBias(rRange(0.5, 5.0));
    if (setters.setMulticolorAppProb) setters.setMulticolorAppProb(rRange(0.0, 1.0));
    if (setters.setSameColorAppProb) setters.setSameColorAppProb(rRange(0.0, 1.0));

    // Colors
    const randomHex = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    if (setters.setTideColor) setters.setTideColor(randomHex());
    if (setters.setBgColor) setters.setBgColor(randomHex());
    if (setters.setFogColor) setters.setFogColor(randomHex());

    // Trait Probs
    if (setters.setTraitProbs && state.traitProbs) {
      const newTraits: Record<string, number> = {};
      Object.keys(state.traitProbs).forEach(key => {
        newTraits[key] = rRange(0.0, 1.0);
      });
      setters.setTraitProbs(newTraits);
    }
    
    if (setRandomizeKey) {
        setRandomizeKey((prev: number) => prev + 1);
    }
    if (handleRestart) {
        handleRestart();
    }
  };

  return (
    <div className="absolute top-16 right-4 sm:right-[24rem] bg-[#001220]/90 border border-[#D2B48C]/50 p-4 rounded w-64 sm:w-72 backdrop-blur-md z-50 pointer-events-auto font-mono text-[#D2B48C] shadow-lg shadow-[#D2B48C]/20 max-h-[80vh] overflow-y-auto custom-scrollbar mt-24 sm:mt-0">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-[#D2B48C]">PRESETS</span>
      </div>
      
      <div className="flex gap-2 mb-4">
        <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1.5 bg-[#D2B48C]/10 hover:bg-[#D2B48C]/30 border border-[#D2B48C]/30 px-2 py-1.5 rounded text-[9px] transition-colors">
          <Save className="w-3 h-3" />
          SAVE
        </button>
        <button onClick={handleRandomize} className="flex-1 flex items-center justify-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/30 border border-purple-500/30 px-2 py-1.5 rounded text-[9px] transition-colors text-purple-300" title="Randomize settings">
          <Dices className="w-3 h-3" />
          RANDOM
        </button>
        <button onClick={handleFactoryReset} className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 px-2 py-1.5 rounded text-[9px] transition-colors text-red-300" title="Factory reset">
          <RotateCcw className="w-3 h-3" />
          FACTORY RESET
        </button>
      </div>

      <div className="flex flex-col gap-2 text-[9px]">
        {presets.length === 0 ? (
          <div className="text-center opacity-50 italic py-2">No presets saved</div>
        ) : (
          presets.map(preset => (
            <div 
              key={preset.id} 
              className="flex justify-between items-center bg-[#001220]/60 border border-[#D2B48C]/20 hover:border-[#D2B48C]/50 p-2 rounded cursor-pointer group transition-colors"
              onClick={() => handleLoad(preset.state)}
            >
              <span className="truncate pr-2">{preset.name}</span>
              <button 
                onClick={(e) => handleDelete(preset.id, e)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all p-1"
                title="Delete preset"
              >
                <Minus className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
