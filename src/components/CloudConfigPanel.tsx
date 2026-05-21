import React from 'react';
import { SmartDial } from './SmartDial';
import { hexToHSL, hslToHex } from '../utils/colors';

interface CloudPanelProps {
  state: any;
  setters: any;
}

export function CloudConfigPanel({ state, setters }: CloudPanelProps) {
  const [bgH, bgS, bgL] = hexToHSL(state.bgColor);

  const handleBgColorChange = (newBg: string) => {
      setters.setBgColor(newBg);
      const [h, s, l] = hexToHSL(newBg);
      setters.setTideColor(hslToHex((h + 0.5) % 1.0, s, l));
  };

  const handleBgSatChange = (newSat: number) => {
      setters.setBgColor(hslToHex(bgH, newSat, bgL));
  };

  const handleBgLumChange = (newLum: number) => {
      setters.setBgColor(hslToHex(bgH, bgS, newLum));
  };

  return (
    <div className="absolute top-16 right-4 sm:right-8 bg-[#001220]/90 border border-purple-500/50 p-4 rounded w-48 sm:w-56 backdrop-blur-md z-50 pointer-events-auto font-mono text-[#D2B48C] shadow-lg shadow-purple-900/20 overflow-visible">
        <div className="flex justify-between items-center mb-4">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-purple-300">CONFIG</span>
        </div>
        <div className="flex flex-col gap-4 text-[9px]">
            <div className="flex justify-between gap-2">
                <SmartDial state={state} setters={setters} tooltip={"TIDE THICKNESS\nThickness of the tidal wave cloud.\nHigh: Wide, sweeping wave.\nLow: Thin, sharp wave."} label="THICKNESS" min={10} max={400} step={10} value={state.tideThickness} onChange={setters.setTideThickness} color="#a855f7" />
                <SmartDial state={state} setters={setters} tooltip={"FOG DEPTH\nVisibility range of atmospheric fog.\nHigh: Clear, deep visibility.\nLow: Enclosed, misty environment."} label="FOG_DEPTH" min={200} max={2000} step={50} value={state.fogVisibility} onChange={setters.setFogVisibility} color="#a855f7" />
            </div>
            <div className="flex justify-between gap-2">
                <SmartDial state={state} setters={setters} tooltip={"TIDE OPACITY\nTransparency of the tidal wave.\nHigh: Dense, opaque wave.\nLow: Faint, transparent wave."} label="OPACITY" min={0} max={1} step={0.05} value={state.tideOpacity} onChange={setters.setTideOpacity} color="#a855f7" />
                <SmartDial state={state} setters={setters} tooltip={"TIDE SPEED\nPeriodicity of the tidal pulse.\nHigh: Frequent, rapid surges.\nLow: Long periods of calm."} label="TIDE_SPEED" min={0} max={5.0} step={0.1} value={state.tideSpeed} onChange={setters.setTideSpeed} color="#a855f7" />
                <SmartDial state={state} setters={setters} tooltip={"TIDE SATURATION\nColor intensity of the tidal wave.\nHigh: Vibrant, rich colors.\nLow: Spectral, ghostly colors."} label="SATURATION" min={0} max={2} step={0.1} value={state.tideSaturation} onChange={setters.setTideSaturation} color="#a855f7" />
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="opacity-80">BG COLOR</span>
                <input type="color" value={state.bgColor} onChange={(e) => handleBgColorChange(e.target.value)} className="w-full h-6 rounded cursor-pointer border-none p-0 bg-transparent"/>
                <div className="flex justify-between gap-2 mt-2">
                    <SmartDial state={state} setters={setters} tooltip={"BACKGROUND SATURATION\nSaturation of the void background.\nHigh: Colorful space.\nLow: Grayscale void."} label="BG_SAT" min={0} max={1} step={0.05} value={bgS} onChange={handleBgSatChange} color="#a855f7" />
                    <SmartDial state={state} setters={setters} tooltip={"BACKGROUND LUMINOSITY\nBrightness of the void background.\nHigh: Bright, lit space.\nLow: Dark, deep void."} label="BG_LUM" min={0} max={1} step={0.01} value={bgL} onChange={handleBgLumChange} color="#a855f7" />
                </div>
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
