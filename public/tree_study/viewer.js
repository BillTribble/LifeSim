// Tree form study viewer: baseline (left) vs a selected stage (right).
(async function () {
  const $ = (id) => document.getElementById(id);
  const load = async (f) => { try { const r = await fetch(f, { cache: "no-store" }); return r.ok ? r.json() : {}; } catch { return {}; } };
  const [runs, sim] = await Promise.all([load("./metrics.json"), load("./sim_metrics.json")]);

  const HABITS = [
    { key: "oak", label: "White oak", icon: "park" },
    { key: "elm", label: "Elm", icon: "forest" },
    { key: "pine", label: "White pine", icon: "nature" },
    { key: "sim", label: "Sim mode", icon: "grid_view" },
  ];
  const stageNames = Object.keys(runs).filter((k) => k !== "baseline");
  const prettyStage = (k) => (k === "final" ? "Final" : k.replace(/^iter0?/, "Round "));
  const state = { habit: "oak", seed: 1, stage: stageNames.includes("final") ? "final" : stageNames[stageNames.length - 1] };

  const find = (label, concept, seed) => (runs[label]?.results || []).find((r) => r.concept === concept && r.seed === seed);

  function tabs(el, items, active, onPick) {
    el.textContent = "";
    for (const it of items) {
      const b = document.createElement("button");
      b.className = "m3-pill-tab" + (it.icon ? " has-icon" : "") + (it.key === active ? " active" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(it.key === active));
      if (it.icon) { const i = document.createElement("span"); i.className = "material-symbols-outlined"; i.textContent = it.icon; b.appendChild(i); }
      b.appendChild(document.createTextNode(it.label));
      b.addEventListener("click", () => onPick(it.key));
      el.appendChild(b);
    }
  }

  function shot(container, file, wide) {
    container.textContent = "";
    if (!file) { const d = document.createElement("div"); d.className = "missing"; d.textContent = "Not captured"; container.appendChild(d); return; }
    const img = document.createElement("img");
    img.className = "shot" + (wide ? " wide" : "");
    img.src = "./" + file + "?v=" + Date.now();
    img.alt = file;
    container.appendChild(img);
  }

  function metricCards(container, pairs) {
    container.textContent = "";
    for (const [label, value] of pairs) {
      const m = document.createElement("div"); m.className = "metric";
      const l = document.createElement("div"); l.className = "metric-label"; l.textContent = label; l.title = label;
      const v = document.createElement("div"); v.className = "metric-value"; v.textContent = value;
      m.append(l, v); container.appendChild(m);
    }
  }

  const treePairs = (m) => m ? [
    ["Stem segments", m.stemSegments.toLocaleString()],
    ["Branch agents", m.branchAgentsSpawned.toLocaleString()],
    ["Peak growing tips", m.peakActiveTips],
    ["Max branch order", m.maxDepthObserved],
    ["Fine segments", Math.round(m.thinSegmentFraction * 100) + "%"],
    ["Trunk base → top", m.trunkBaseThick + " → " + m.trunkTopThick],
    ["Median thickness", m.thicknessP50],
    ["Bbox w × h", m.bbox.w + " × " + m.bbox.h],
    ["Still growing", m.stillGrowingAtEnd ? "Yes" : "No"],
  ] : [];

  const simPairs = (m) => m ? [
    ["Live segments", m.liveSegments.toLocaleString()],
    ["Tree segments", (m.segsByArch.tree || 0).toLocaleString()],
    ["Bush segments", (m.segsByArch.bush || 0).toLocaleString()],
    ["Tree species seen", m.treeStrainsSeen],
    ["Peak tree tips", m.peakTreeTips],
    ["Peak agents", m.peakAgents],
    ["Breeding events", m.breedLogs ?? "n/a"],
    ["Sim time", m.simSeconds + " s"],
  ] : [];

  function render() {
    tabs($("conceptTabs"), HABITS, state.habit, (k) => { state.habit = k; if (k === "sim") state.stage = "all"; else if (!stageNames.includes(state.stage)) state.stage = stageNames[stageNames.length - 1]; render(); });
    const isSim = state.habit === "sim";
    const simSeeds = [...new Set((sim.final?.results || sim.baseline?.results || []).map((r) => r.seed))].sort();
    const seeds = isSim ? (simSeeds.length ? simSeeds : [1]) : [1, 2];
    if (!seeds.includes(state.seed)) state.seed = seeds[0];
    tabs($("seedTabs"), seeds.map((s) => ({ key: s, label: "Seed " + s })), state.seed, (k) => { state.seed = k; render(); });

    const stages = isSim ? [{ key: "all", label: "All species" }, { key: "trees", label: "Trees only" }] : stageNames.map((k) => ({ key: k, label: prettyStage(k) }));
    tabs($("stageTabs"), stages, state.stage, (k) => { state.stage = k; render(); });
    const idx = stages.findIndex((s) => s.key === state.stage);
    $("prevBtn").disabled = idx <= 0;
    $("nextBtn").disabled = idx >= stages.length - 1;
    $("prevBtn").onclick = () => { if (idx > 0) { state.stage = stages[idx - 1].key; render(); } };
    $("nextBtn").onclick = () => { if (idx < stages.length - 1) { state.stage = stages[idx + 1].key; render(); } };

    if (isSim) {
      const bySeed = (lab) => (sim[lab]?.results || []).find((r) => r.seed === state.seed);
      const b = bySeed("baseline"), n = bySeed("final") || bySeed("new");
      const pick = (r) => r && r.files[state.stage === "trees" ? 1 : 0];
      $("leftTitle").textContent = "Before (original code)"; $("rightTitle").textContent = "After (tree model)";
      $("leftMeta").textContent = b ? b.ticks + " ticks" : ""; $("rightMeta").textContent = n ? n.ticks + " ticks" : "";
      shot($("leftShot"), pick(b), true); shot($("rightShot"), pick(n), true);
      metricCards($("leftMetrics"), simPairs(b?.metrics)); metricCards($("rightMetrics"), simPairs(n?.metrics));
      return;
    }
    const base = find("baseline", state.habit, state.seed), sel = find(state.stage, state.habit, state.seed);
    $("leftTitle").textContent = "Baseline (original code)";
    $("rightTitle").textContent = prettyStage(state.stage);
    $("leftMeta").textContent = base ? base.ticks + " ticks" : "";
    $("rightMeta").textContent = sel ? sel.ticks + " ticks" : "";
    shot($("leftShot"), base?.file); shot($("rightShot"), sel?.file);
    metricCards($("leftMetrics"), treePairs(base?.metrics)); metricCards($("rightMetrics"), treePairs(sel?.metrics));
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") $("prevBtn").click();
    if (e.key === "ArrowRight") $("nextBtn").click();
  });
  render();
})();
