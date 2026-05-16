import React from 'react';
import { Dial } from './Dial';
import { hexToHSL, hslToHex } from '../utils/colors';

interface CloudPanelProps {
  state: any;
  setters: any;
}

export function CloudConfigPanel({ state, setters }: CloudPanelProps) {
  const handleBgColorChange = (newBg: string) => {
      setters.setBgColor(newBg);
      const [h, s, l] = hexToHSL(newBg);
      setters.setTideColor(hslToHex((h + 0.5) % 1.0, s, l));
  };

  return (
    <div className="absolute top-16 right-4 sm:right-8 bg-[#001220]/90 border border-purple-500/50 p-4 rounded w-48 sm:w-56 backdrop-blur-md z-50 pointer-events-auto font-mono text-[#D2B48C] shadow-lg shadow-purple-900/20 overflow-visible">
        <div className="flex justify-between items-center mb-4">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-purple-300">CONFIG</span>
        </div>
        <div className="flex flex-col gap-4 text-[9px]">
            <div className="flex justify-between gap-2">
                <Dial tooltip="The thickness of the tidal wave cloud that periodically sweeps through the environment." label="THICKNESS" min={10} max={400} step={10} value={state.tideThickness} onChange={setters.setTideThickness} color="#a855f7" />
                <Dial tooltip="The visibility range of the atmospheric fog. Lower values create a more enclosed, misty feel." label="FOG_DEPTH" min={200} max={2000} step={50} value={state.fogVisibility} onChange={setters.setFogVisibility} color="#a855f7" />
            </div>
            <div className="flex justify-between gap-2">
                <Dial tooltip="Transparency level of the tidal wave cloud. Adjusts how much of the simulation remains visible during a surge." label="OPACITY" min={0} max={1} step={0.05} value={state.tideOpacity} onChange={setters.setTideOpacity} color="#a855f7" />
                <Dial tooltip="Periodicity of the tidal pulse. Slower speeds allow longer periods of stable growth between cycles." label="TIDE_SPEED" min={0} max={5.0} step={0.1} value={state.tideSpeed} onChange={setters.setTideSpeed} color="#a855f7" />
                <Dial tooltip="Color intensity of the tidal wave cloud. Low values make the wave feel more spectral or ghostly." label="SATURATION" min={0} max={2} step={0.1} value={state.tideSaturation} onChange={setters.setTideSaturation} color="#a855f7" />
            </div>
            <div className="flex justify-between gap-2">
                <Dial tooltip="Multiplier for the chance of an organism splitting into new branches as it grows." label="BRANCH_PROB" min={0.1} max={5.0} step={0.1} value={state.branchingMultiplier} onChange={setters.setBranchingMultiplier} color="#a855f7" />
                <Dial tooltip="Likelihood that a new branch will be thicker than its parent, enabling upward scaling of organisms." label="BRANCH_BIG" min={0} max={1.0} step={0.05} value={state.branchBigger} onChange={setters.setBranchBigger} color="#a855f7" />
                <Dial tooltip="The scale of geometric artifacts spawned during successful cross-breeding events." label="HYBRID_SIZE" min={0.5} max={8.0} step={0.1} value={state.hybridSize} onChange={setters.setHybridSize} color="#a855f7" />
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="opacity-80">BG COLOR</span>
                <input type="color" value={state.bgColor} onChange={(e) => handleBgColorChange(e.target.value)} className="w-full h-6 rounded cursor-pointer border-none p-0 bg-transparent"/>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="opacity-80">TIDE COLOR</span>
                <input type="color" value={state.tideColor} onChange={(e) => setters.setTideColor(e.target.value)} className="w-full h-6 rounded cursor-pointer border-none p-0 bg-transparent"/>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="opacity-80">FOG COLOR</span>
                <input type="color" value={state.fogColor} onChange={(e) => setters.setFogColor(e.target.value)} className="w-full h-6 rounded cursor-pointer border-none p-0 bg-transparent"/>
            </div>
        </div>
    </div>
  );
}
