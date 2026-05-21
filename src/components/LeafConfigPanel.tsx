import React from 'react';
import { Dial } from './Dial';

interface LeafPanelProps {
  state: any;
  setters: any;
}

export function LeafConfigPanel({ state, setters }: LeafPanelProps) {
  return (
    <div className="absolute top-16 right-4 sm:right-32 bg-[#001220]/90 border border-green-500/50 p-4 rounded w-64 sm:w-72 backdrop-blur-md z-50 pointer-events-auto font-mono text-[#D2B48C] shadow-lg shadow-green-900/20 overflow-visible mt-24 sm:mt-0">
        <div className="flex justify-between items-center mb-4 border-b border-green-500/30 pb-2">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-green-400">LEAF CONTROLS</span>
            <div className="flex items-center gap-2">
              <span className="text-[8px] opacity-80">REALISM:</span>
              <button
                onClick={() => setters.setBotanyRealism(!state.botanyRealism)}
                className={`px-2 py-0.5 border rounded text-[8px] font-bold transition-colors ${state.botanyRealism ? 'bg-green-500/30 border-green-400 text-green-300' : 'bg-red-500/30 border-red-400 text-red-300'}`}
                title="Toggle Botany Realism (enforces physical constraints on thick leaves)"
              >
                {state.botanyRealism ? 'ON' : 'OFF'}
              </button>
            </div>
        </div>
        <div className="flex flex-col gap-4 text-[9px]">
            <div className="flex justify-between gap-2">
                <Dial 
                  tooltip="WIND VELOCITY&#10;Adjusts the base speed and frequency of the global wind field affecting leaf flutter." 
                  label="WIND_VEL" 
                  min={0.0} 
                  max={10.0} 
                  step={0.1} 
                  value={state.windVelocity} 
                  onChange={setters.setWindVelocity} 
                  color="#4ADE80" 
                />
                <Dial 
                  tooltip="FLUTTER INTENSITY&#10;Controls how violently leaf tips flutter under wind." 
                  label="FLUTTER" 
                  min={0.0} 
                  max={2.0} 
                  step={0.05} 
                  value={state.flutterIntensity} 
                  onChange={setters.setFlutterIntensity} 
                  color="#4ADE80" 
                />
                <Dial 
                  tooltip="LEAF PROBABILITY&#10;Globally sets the default likelihood of plants spawning leaves." 
                  label="LEAF_PROB" 
                  min={0.0} 
                  max={1.0} 
                  step={0.01} 
                  value={state.leafProbability} 
                  onChange={setters.setLeafProbability} 
                  color="#4ADE80" 
                  formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                />
            </div>
            <div className="flex justify-between gap-2 border-t border-green-500/20 pt-3">
                <Dial 
                  tooltip="GLOBAL LEAF SCALE&#10;Globally scales all leaves in the simulation." 
                  label="LEAF_SCALE" 
                  min={0.05} 
                  max={3.0} 
                  step={0.01} 
                  value={state.leafScale} 
                  onChange={setters.setLeafScale} 
                  color="#4ADE80" 
                />
                <Dial 
                  tooltip="LEAF GROWTH SPEED&#10;Adjusts how fast leaves unroll and expand during their maturity phase." 
                  label="GROW_SPD" 
                  min={0.0005} 
                  max={0.5} 
                  step={0.0005} 
                  value={state.leafGrowthSpeed} 
                  onChange={setters.setLeafGrowthSpeed} 
                  color="#4ADE80" 
                />
                <Dial 
                  tooltip="PHYLLOTAXIS ANGLE&#10;Fine-tunes the divergence angle around the stem (override golden ratio 137.5° for custom patterns)." 
                  label="DIV_ANGLE" 
                  min={0.0} 
                  max={360.0} 
                  step={0.5} 
                  value={state.phyllotaxisAngle} 
                  onChange={setters.setPhyllotaxisAngle} 
                  color="#4ADE80" 
                  formatValue={(v: number) => `${v.toFixed(1)}°`}
                />
            </div>
            <div className="flex justify-between gap-2 border-t border-green-500/20 pt-3">
                <Dial 
                  tooltip="LEAF WEIGHT&#10;Probability weight of plants evolving leaves compared to other appendages (flowers, needles, curlyHair, etc.)." 
                  label="LEAF_WT" 
                  min={0.0} 
                  max={1.0} 
                  step={0.05} 
                  value={state.traitProbs.leaves} 
                  onChange={(v: number) => setters.setTraitProbs((prev: any) => ({ ...prev, leaves: v }))} 
                  color="#4ADE80" 
                  formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                />
                <Dial 
                  tooltip="APPENDAGE RATE&#10;Percentage of creatures that will get appendages when spawning." 
                  label="APP_SPAWN" 
                  min={0.0} 
                  max={1.0} 
                  step={0.01} 
                  value={state.appendageSpawnRate} 
                  onChange={setters.setAppendageSpawnRate} 
                  color="#4ADE80" 
                  formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                />
                <Dial 
                  tooltip="STEM CURVINESS&#10;Adjusts how curvy, lean-bent, and twisty the leaf petiole (stems) grow." 
                  label="STEM_CURVE" 
                  min={0.0} 
                  max={4.0} 
                  step={0.1} 
                  value={state.stemCurviness} 
                  onChange={setters.setStemCurviness} 
                  color="#4ADE80" 
                />
            </div>
            <div className="flex justify-start gap-2 border-t border-green-500/20 pt-3">
                <Dial 
                  tooltip="RELATIVE LEAF SIZE DIFFERENCE&#10;Introduces random size variation between individual leaves on the same plant." 
                  label="LEAF_DIFF" 
                  min={0.0} 
                  max={1.0} 
                  step={0.05} 
                  value={state.relativeLeafSizeDiff} 
                  onChange={setters.setRelativeLeafSizeDiff} 
                  color="#4ADE80" 
                />
                <Dial 
                  tooltip="VEIN 3D STRENGTH&#10;Controls the physical height and prominence of the central leaf midrib and lateral veins." 
                  label="VEIN_3D" 
                  min={0.0} 
                  max={1.5} 
                  step={0.05} 
                  value={state.veinStrength} 
                  onChange={setters.setVeinStrength} 
                  color="#4ADE80" 
                />
            </div>
        </div>
    </div>
  );
}
