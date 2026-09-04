import React, { useState, useEffect } from 'react';
import { Save, Minus, Dices, RotateCcw } from 'lucide-react';
import { DEFAULTS } from '../hooks/useSimulationState';
import { hslToHex } from '../utils/colors';
import { triggerRandomize } from '../utils/randomize';

interface PresetPanelProps {
  state: any;
  setters: any;
  stats: any;
  setRandomizeKey: any;
  handleRestart: () => void;
  onClose?: () => void;
}

export function PresetPanel({ state, setters, stats, setRandomizeKey, handleRestart, onClose }: PresetPanelProps) {
  const [presets, setPresets] = useState<any[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('presets') || '[]');
      const recommendedState = {
        ...DEFAULTS,
        rotationSpeed: 0.1,
        rotationVelocity: 0.7,
        maxDOMs: 100000,
        pruningStrength: 0.8,
        maxBranchDepth: 4,
        maxBranchesPerSpecies: 48,
        maxAgents: 667,
        maxCreatures: 4,
        minCreatures: 4,
        boundarySize: 80,
        magnetism: 10.0,
        proximity: 40,
        desperation: 7.7,
        despairAge: 800,
        ecoFade: 1.0,
        cullRate: 48.87,
        growthSpeed: 1.6,
        diebackRate: 5.0,
        diebackAgeBias: 1.5,
        terminationProb: 0.02,
        desiccationSpeed: 9.9,
        feelerFade: 10,
        hybridCooldown: 650,
        hybridSize: 3.5,
        hybridStickiness: 47,
        hybridSpinSpeed: 0.2,
        branchTendencyVar: 50,
        branchingMultiplier: 3.0,
        termProbPostBranch: 1.5,
        branchBigger: 0.75,
        branchSplitSizeProb: 0.95,
        timeScale: 0.4,
        snakeSpeed: 0.5,
        bushSpeed: 1.0,
        treeSpeed: 1.0,
        rhizomeSpeed: 1.0,
        flowerSize: 1.8,
        taperDuration: 1.0,
        maxLineWidth: 1.5,
        widthVariance: 0.5,
        branchGrowthBoost: 1.0,
        colorMutationShift: 0.06,
        appendageSize: 1.8,
        leafScale: 0.3,
        multicolorAppProb: 0.05,
        sameColorAppProb: 0.9,
        globalPulseSpeed: 0.1,
        maxSaturation: 0.8
      };
      const idx = stored.findIndex((p: any) => p.name === "Agent recommended");
      if (idx === -1) {
        stored.unshift({
          id: "agent-recommended",
          name: "Agent recommended",
          state: recommendedState
        });
      } else {
        stored[idx].state = recommendedState;
      }
      localStorage.setItem('presets', JSON.stringify(stored));
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
    if (onClose) onClose();
  };

  const handleLoad = (presetState: any) => {
    Object.keys(presetState).forEach(key => {
      const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
      if (setters[setterName]) {
        setters[setterName](presetState[key]);
      }
    });
    if (onClose) onClose();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresets(presets.filter(p => p.id !== id));
  };

  const handleFactoryReset = () => {
    if (setters.resetToDefaults) {
      setters.resetToDefaults();
    } else {
      try {
        localStorage.clear();
      } catch (e) {
        console.warn("Could not clear localStorage", e);
      }
      Object.keys(DEFAULTS).forEach(key => {
        const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
        if (setters[setterName]) {
          setters[setterName]((DEFAULTS as any)[key]);
        }
      });
    }
    if (handleRestart) {
      handleRestart();
    }
    if (onClose) onClose();
  };

  const handleRandomize = () => {
    triggerRandomize(setters, state, setRandomizeKey, handleRestart);
    if (onClose) onClose();
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
