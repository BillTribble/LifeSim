/** Helper for test_lod_simplification.ts [5]: runs 600 seeded frames (fake clock) at a forced LOD tier in a fresh process and prints a structural fingerprint. */
import { SimulationEngine } from "../src/lib/SimulationEngine";
import { setupInitialCreatures } from "../src/lib/SimulationSceneSetup";
import { updateSimulation } from "../src/lib/SimulationUpdate";
import { DEFAULTS } from "../src/hooks/SimulationDefaults";
import { requestLodMode, updateAdaptiveLOD } from "../src/lib/SimulationLOD";
function m(seed:number){return()=>{seed|=0;seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const tier = Number(process.argv[2]); const useLod = process.argv[3] !== "nolod";
Math.random = m(12345);
let fake = 0; (globalThis as any).performance.now = () => (fake += 16.6); Date.now = () => 1_700_000_000_000 + fake;
const e = new SimulationEngine({addEventListener(){},removeEventListener(){},style:{},clientWidth:1280,clientHeight:720,width:1280,height:720,getContext:()=>null} as any,1280,720);
for (const [k,v] of Object.entries(DEFAULTS)) { const s="set"+k[0].toUpperCase()+k.slice(1); if (typeof (e as any)[s]==="function") (e as any)[s](v); else (e as any)[k]=v; }
setupInitialCreatures(e); requestLodMode(tier as any);
for (let f=0;f<600;f++){ e.frameCount++; if (useLod) updateAdaptiveLOD(e,16.6); updateSimulation(e); }
let ms=0; for (const s of e.segments) if (s) ms+=s.matrix.elements.reduce((a,b)=>a+b,0);
console.log("RESULT", tier, e.pointCount, e.agents.length, e.nextAgentId, ms.toFixed(4));
