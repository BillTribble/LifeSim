export interface INatSighting {
  id: number | string;
  species: string;
  scientificName: string;
  taxon: string;
  place: string;
  timeStr: string;
  deltaSec: number;
  boostPct: number;
  impulse: number;
}

export interface WaveformPoint {
  t: number;
  impulse: number;
  broodiness: number;
  label?: string;
}

const TAXON_IMPULSES: Record<string, number> = {
  Plantae: 0.88,
  Fungi: 0.92,
  Insecta: 0.76,
  Amphibia: 0.70,
  Arachnida: 0.66,
  Mollusca: 0.58,
  Aves: 0.55,
  Mammalia: 0.48,
};

const SEED_SIGHTINGS: Omit<INatSighting, "id" | "timeStr" | "deltaSec" | "boostPct" | "impulse">[] = [
  { species: "Waxlip Orchid", scientificName: "Glossodia major", taxon: "Plantae", place: "Deep Creek, SA, AU" },
  { species: "Painted Lady", scientificName: "Vanessa cardui", taxon: "Insecta", place: "Provence, FR" },
  { species: "Hummingbird Hawkmoth", scientificName: "Macroglossum stellatarum", taxon: "Insecta", place: "Tyrol, AT" },
  { species: "Common Milk Vine", scientificName: "Marsdenia rostrata", taxon: "Plantae", place: "Blue Mountains, NSW, AU" },
  { species: "Silver Maple", scientificName: "Acer saccharinum", taxon: "Plantae", place: "Plano, TX, US" },
  { species: "Leopard Orchid", scientificName: "Diuris pardina", taxon: "Plantae", place: "Dandenong, VIC, AU" },
  { species: "Coral Vine", scientificName: "Kennedia coccinea", taxon: "Plantae", place: "Margaret River, WA, AU" },
  { species: "Fly Agaric", scientificName: "Amanita muscaria", taxon: "Fungi", place: "Black Forest, DE" },
  { species: "Golden Eagle", scientificName: "Aquila chrysaetos", taxon: "Aves", place: "Highlands, UK" },
  { species: "Blue Poison Dart Frog", scientificName: "Dendrobates tinctorius", taxon: "Amphibia", place: "Sipaliwini, SR" },
  { species: "Peacock Spider", scientificName: "Maratus speciosus", taxon: "Arachnida", place: "Perth, WA, AU" },
  { species: "Ghost Fungus", scientificName: "Omphalotus nidiformis", taxon: "Fungi", place: "Adelaide Hills, SA, AU" },
  { species: "Monarch Butterfly", scientificName: "Danaus plexippus", taxon: "Insecta", place: "Michoacán, MX" },
  { species: "Giant Clam", scientificName: "Tridacna gigas", taxon: "Mollusca", place: "Great Barrier Reef, AU" },
  { species: "Red Fox", scientificName: "Vulpes vulpes", taxon: "Mammalia", place: "Banff, AB, CA" },
];

export class SimulationINatService {
  private enabled: boolean = true;
  private broodinessCharge: number = 0.42; // [0.08, 1.0]
  private queue: INatSighting[] = [];
  private recent: INatSighting[] = [];
  private history: WaveformPoint[] = [];
  private listeners: Set<() => void> = new Set();
  private timer: any = null;
  private fetchTimer: any = null;
  private seedIndex: number = 0;
  private nextPopTicks: number = 1;
  private seenIds: Set<string | number> = new Set();

  constructor() {
    this.initSeeds();
    this.initHistory();
    this.startLoop();
    this.startPolling();
  }

  private initSeeds(): void {
    const now = Date.now();
    for (let i = 0; i < SEED_SIGHTINGS.length; i++) {
      const s = SEED_SIGHTINGS[i];
      const impulse = TAXON_IMPULSES[s.taxon] || 0.60;
      const boostPct = Math.round(impulse * 28);
      const sighting: INatSighting = {
        ...s,
        id: `seed-${i}-${now}`,
        timeStr: new Date(now - (SEED_SIGHTINGS.length - i) * 2000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        deltaSec: (SEED_SIGHTINGS.length - i) * 2,
        boostPct,
        impulse,
      };
      this.queue.push(sighting);
      this.seenIds.add(sighting.id);
    }
  }

  private initHistory(): void {
    const now = Math.floor(Date.now() / 1000);
    for (let i = 59; i >= 0; i--) {
      this.history.push({
        t: now - i,
        impulse: i % 4 === 0 ? 0.35 + Math.random() * 0.4 : 0,
        broodiness: Math.max(0.12, Math.min(0.85, 0.35 + Math.sin(i * 0.18) * 0.2)),
      });
    }
  }

  private startLoop(): void {
    if (typeof window === "undefined") return;
    this.timer = window.setInterval(() => this.step(), 1000);
  }

  private startPolling(): void {
    if (typeof window === "undefined") return;
    this.fetchObservations();
    this.fetchTimer = window.setInterval(() => this.fetchObservations(), 25000);
  }

  private async fetchObservations(): Promise<void> {
    if (!this.enabled) return;
    try {
      const res = await fetch("https://api.inaturalist.org/v1/observations?per_page=30&order=desc&order_by=created_at", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.results)) return;

      for (const item of data.results) {
        if (!item || this.seenIds.has(item.id)) continue;
        this.seenIds.add(item.id);
        const taxonName = item.taxon?.iconic_taxon_name || "Plantae";
        const species = item.taxon?.preferred_common_name || item.taxon?.name || "Wild Organism";
        const scientificName = item.taxon?.name || "Species incertae";
        const place = item.place_guess || (item.geojson?.coordinates ? `${item.geojson.coordinates[1].toFixed(1)}°, ${item.geojson.coordinates[0].toFixed(1)}°` : "Global Wild");
        const impulse = TAXON_IMPULSES[taxonName] || 0.60;

        const sighting: INatSighting = {
          id: item.id,
          species,
          scientificName,
          taxon: taxonName,
          place,
          timeStr: new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          deltaSec: 0,
          boostPct: Math.round(impulse * 28),
          impulse,
        };
        this.queue.push(sighting);
      }
    } catch {
      // Fallback cleanly to internal synthetic loop on network drop or rate limit
    }
  }

  public step(): void {
    if (!this.enabled) {
      this.broodinessCharge = Math.max(0.08, this.broodinessCharge * 0.94);
      this.recordHistory(0);
      this.notify();
      return;
    }

    // Natural capacitive discharge
    this.broodinessCharge = Math.max(0.08, this.broodinessCharge * 0.94);
    this.nextPopTicks--;

    let poppedImpulse = 0;
    let label: string | undefined = undefined;

    if (this.nextPopTicks <= 0) {
      let sighting = this.queue.shift();
      if (!sighting) {
        // Recycle seed pool seamlessly
        const s = SEED_SIGHTINGS[this.seedIndex % SEED_SIGHTINGS.length];
        this.seedIndex++;
        const impulse = TAXON_IMPULSES[s.taxon] || 0.60;
        sighting = {
          ...s,
          id: `synth-${Date.now()}`,
          timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          deltaSec: 0,
          boostPct: Math.round(impulse * 28),
          impulse,
        };
      }
      sighting.deltaSec = 0;
      poppedImpulse = sighting.impulse;
      label = sighting.species;
      this.broodinessCharge = Math.min(1.0, this.broodinessCharge + poppedImpulse * 0.28);
      this.recent.unshift(sighting);
      if (this.recent.length > 20) this.recent.pop();

      // Next arrival cadence: 1 to 3 seconds
      this.nextPopTicks = 1 + Math.floor(Math.random() * 3);
    }

    // Age all recent entries
    for (const r of this.recent) r.deltaSec += 1;

    this.recordHistory(poppedImpulse, label);
    this.notify();
  }

  private recordHistory(impulse: number, label?: string): void {
    const t = Math.floor(Date.now() / 1000);
    this.history.push({ t, impulse, broodiness: this.broodinessCharge, label });
    if (this.history.length > 60) this.history.shift();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(v: boolean): void {
    this.enabled = v;
    this.notify();
  }

  public getBroodinessCharge(): number {
    return this.broodinessCharge;
  }

  public getBroodinessMultiplier(): number {
    if (!this.enabled) return 1.0;
    return 1.0 + 1.4 * this.broodinessCharge; // 1.1x to 2.4x
  }

  public getSeekReachBoost(): number {
    if (!this.enabled) return 1.0;
    return 1.0 + 0.35 * this.broodinessCharge; // 1.0x to 1.35x
  }

  public getLatestSighting(): INatSighting | null {
    return this.recent[0] || this.queue[0] || null;
  }

  public getRecentSightings(limit = 8): INatSighting[] {
    return this.recent.slice(0, limit);
  }

  public getWaveformHistory(): WaveformPoint[] {
    return this.history;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  public destroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.fetchTimer) clearInterval(this.fetchTimer);
    this.listeners.clear();
  }
}

export const inatService = new SimulationINatService();
