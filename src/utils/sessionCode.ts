const SCI_PREFIXES = [
  "Quantum", "Chrono", "Aero", "Bio", "Helio", "Syntho", "Geo", "Astro",
  "Hydro", "Thermo", "Cryo", "Nano", "Proto", "Cyber", "Morpho", "Palaeo",
  "Xeno", "Cosmo", "Strato", "Vector", "Opto", "Electro", "Phylo",
  "Micro", "Macro", "Exo", "Endo", "Hyper", "Spectro", "Iso", "Plasm"
];

const SCI_MATRICES = [
  "Helix", "Matrix", "Flux", "Vortex", "Prism", "Lattice", "Nova", "Drift",
  "Pulse", "Nexus", "Spectra", "Cipher", "Strata", "Apex", "Quark", "Ion",
  "Echo", "Stasis", "Orb", "Plexus", "Core", "Phase", "Ray", "Tide",
  "Node", "Beacon", "Field", "Wave", "Catalyst", "Resonance", "Surge", "Zenith"
];

const SCI_TAXA = [
  "Virella", "Spore", "Fern", "Pollen", "Calyx", "Tendril", "Thallus", "Zygote",
  "Hypha", "Capsule", "Gamete", "Stamen", "Rhizome", "Canopy", "Petiole", "Mycelium",
  "Bract", "Frond", "Node", "Vane", "Stoma", "Pith", "Drupe", "Xylem",
  "Phloem", "Alga", "Corolla", "Sepal", "Flora", "Thorn", "Thrix", "Sporangia"
];

export function generateSessionCode(): string {
  const p = SCI_PREFIXES[Math.floor(Math.random() * SCI_PREFIXES.length)];
  const m = SCI_MATRICES[Math.floor(Math.random() * SCI_MATRICES.length)];
  const t = SCI_TAXA[Math.floor(Math.random() * SCI_TAXA.length)];
  return `${p}-${m}-${t}`;
}
