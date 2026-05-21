import React from 'react';
import { SmartDial } from './SmartDial';

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
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"WIND VELOCITY\nAdjusts the base speed and frequency of the global wind field affecting leaf flutter."} 
                  label="WIND_VEL" 
                  min={0.0} 
                  max={10.0} 
                  step={0.1} 
                  value={state.windVelocity} 
                  onChange={setters.setWindVelocity} 
                  color="#4ADE80" 
                />
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"FLUTTER INTENSITY\nControls how violently leaf tips flutter under wind."} 
                  label="FLUTTER" 
                  min={0.0} 
                  max={2.0} 
                  step={0.05} 
                  value={state.flutterIntensity} 
                  onChange={setters.setFlutterIntensity} 
                  color="#4ADE80" 
                />
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"LEAF PROBABILITY\nGlobally sets the default likelihood of plants spawning leaves."} 
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
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"GLOBAL LEAF SCALE\nGlobally scales all leaves in the simulation."} 
                  label="LEAF_SCALE" 
                  min={0.05} 
                  max={3.0} 
                  step={0.01} 
                  value={state.leafScale} 
                  onChange={setters.setLeafScale} 
                  color="#4ADE80" 
                />
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"LEAF GROWTH SPEED\nAdjusts how fast leaves unroll and expand during their maturity phase."} 
                  label="GROW_SPD" 
                  min={0.0005} 
                  max={0.5} 
                  step={0.0005} 
                  value={state.leafGrowthSpeed} 
                  onChange={setters.setLeafGrowthSpeed} 
                  color="#4ADE80" 
                />
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"PHYLLOTAXIS ANGLE\nFine-tunes the divergence angle around the stem (override golden ratio 137.5° for custom patterns)."} 
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
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"LEAF WEIGHT\nProbability weight of plants evolving leaves compared to other appendages (flowers, needles, curlyHair, etc.)."} 
                  label="LEAF_WT" 
                  min={0.0} 
                  max={1.0} 
                  step={0.05} 
                  value={state.traitProbs.leaves} 
                  onChange={(v: number) => setters.setTraitProbs((prev: any) => ({ ...prev, leaves: v }))} 
                  color="#4ADE80" 
                  formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                />
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"APPENDAGE RATE\nPercentage of creatures that will get appendages when spawning."} 
                  label="APP_SPAWN" 
                  min={0.0} 
                  max={1.0} 
                  step={0.01} 
                  value={state.appendageSpawnRate} 
                  onChange={setters.setAppendageSpawnRate} 
                  color="#4ADE80" 
                  formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                />
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"STEM CURVINESS\nAdjusts how curvy, lean-bent, and twisty the leaf petiole (stems) grow."} 
                  label="STEM_CURVE" 
                  min={0.0} 
                  max={4.0} 
                  step={0.1} 
                  value={state.stemCurviness} 
                  onChange={setters.setStemCurviness} 
                  color="#4ADE80" 
                />
            </div>
            <div className="flex justify-between gap-2 border-t border-green-500/20 pt-3">
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"RELATIVE LEAF SIZE DIFFERENCE\nIntroduces random size variation between individual leaves on the same plant."} 
                  label="LEAF_DIFF" 
                  min={0.0} 
                  max={1.0} 
                  step={0.05} 
                  value={state.relativeLeafSizeDiff} 
                  onChange={setters.setRelativeLeafSizeDiff} 
                  color="#4ADE80" 
                />
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"VEIN 3D STRENGTH\nControls the physical height and prominence of the central leaf midrib and lateral veins."} 
                  label="VEIN_3D" 
                  min={0.0} 
                  max={15.0} 
                  step={0.05} 
                  value={state.veinStrength} 
                  onChange={setters.setVeinStrength} 
                  color="#4ADE80" 
                />
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"LEAF DENSITY\nControls the frequency and spacing of leaves along the stem. Lower values reduce leaf clutter."} 
                  label="LEAF_DENS" 
                  min={0.1} 
                  max={3.0} 
                  step={0.05} 
                  value={state.leafDensity} 
                  onChange={setters.setLeafDensity} 
                  color="#4ADE80" 
                  formatValue={(v: number) => `${v.toFixed(1)}x`}
                />
            </div>
            <div className="flex justify-start gap-2 border-t border-green-500/20 pt-3">
                <SmartDial 
                  state={state} setters={setters}
                  tooltip={"VEIN GLOW & STYLE\nFades between a realistic organic leaf vein (0%) and a bold, crisp glowing 3D rod (100%)."} 
                  label="VEIN_GLOW" 
                  min={0.0} 
                  max={1.0} 
                  step={0.01} 
                  value={state.veinGlow} 
                  onChange={setters.setVeinGlow} 
                  color="#4ADE80" 
                  formatValue={(v: number) => `${(v * 100).toFixed(0)}%`}
                />
            </div>
        </div>
    </div>
  );
}
