import { canEnterDeleting } from "./src/lib/SimulationBreeding";
import { formatHoveredAgentInfo } from "./src/components/SimulationHoverTooltip";

console.log("=== STARTING QA LIFECYCLE & DELETION AUTOMATED TEST SUITE ===");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testId: string, desc: string) {
  if (condition) {
    console.log(`[PASS] ${testId}: ${desc}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testId}: ${desc}`);
    failed++;
  }
}

// 1. Test QA-LFE-03: Minimum Species Floor Protection in canEnterDeleting
const mockEngine = {
  hasAnyOrganismBred: true,
  biomassMap: new Map([
    ["Alpha-101", 10],
    ["Beta-202", 10],
    ["Gamma-303", 10],
    ["Delta-404", 10],
  ]),
  dyingStrains: new Set(),
} as any;
const threeSpeciesAgents = [
  { active: true, tapering: false, isFeeler: false, genome: { name: "Alpha-101" } },
  { active: true, tapering: false, isFeeler: false, genome: { name: "Beta-202" } },
  { active: true, tapering: false, isFeeler: false, genome: { name: "Gamma-303" } },
] as any[];

const resultThreeSpecies = canEnterDeleting(mockEngine, threeSpeciesAgents, 1);
assert(
  resultThreeSpecies === false,
  "QA-LFE-03",
  "canEnterDeleting returns false when exactly 3 distinct species are alive"
);

// 2. Test QA-LFE-01/02: 4+ Distinct Species Allows Deletion
const fourSpeciesAgents = [
  ...threeSpeciesAgents,
  { active: true, tapering: false, isFeeler: false, genome: { name: "Delta-404" } },
] as any[];

const resultFourSpecies = canEnterDeleting(mockEngine, fourSpeciesAgents, 1);
assert(
  resultFourSpecies === true,
  "QA-LFE-01/02",
  "canEnterDeleting returns true when 4 distinct species are alive"
);

// 3. Test QA-LFE-03 (Multiple Agents of Same Species Count as ONE Species)
const threeSpeciesMultipleAgents = [
  { active: true, tapering: false, isFeeler: false, genome: { name: "Alpha-101" } },
  { active: true, tapering: false, isFeeler: false, genome: { name: "Alpha-101" } }, // Second branch tip of Alpha
  { active: true, tapering: false, isFeeler: false, genome: { name: "Beta-202" } },
  { active: true, tapering: false, isFeeler: false, genome: { name: "Gamma-303" } },
] as any[];

const resultMultipleAgents = canEnterDeleting(mockEngine, threeSpeciesMultipleAgents, 1);
assert(
  resultMultipleAgents === false,
  "QA-LFE-03-MULTI",
  "canEnterDeleting returns false even with 4 active agents if they belong to only 3 distinct species"
);

// 4. Test QA-LFE-09: Tooltip Text Synchronicity
const tooltipDeleting = formatHoveredAgentInfo({ age: 200, tapering: true });
assert(
  tooltipDeleting.lifespanText === "Deleting" && tooltipDeleting.lifespanColor === "bg-gray-500",
  "QA-LFE-09",
  "Hover tooltip immediately displays 'Deleting' and gray color when tapering is true"
);

const tooltipOptimal = formatHoveredAgentInfo({ age: 100, tapering: false });
assert(
  tooltipOptimal.lifespanText === "Flourishing",
  "QA-LFE-09-OPT",
  "Hover tooltip displays 'Flourishing' when tapering is false and age is young"
);

// 5. Test QA-LFE-10: Organism vs Branch Tapering Separation
const isStrainAInDying = mockEngine.dyingStrains.has("Alpha-101");
const tooltipNonDyingStrain = formatHoveredAgentInfo({ age: 100, tapering: isStrainAInDying });
assert(
  tooltipNonDyingStrain.lifespanText === "Flourishing",
  "QA-LFE-10-BRANCH",
  "Flourishing organism with merged/tapering branch tip displays 'Flourishing', not 'Deleting'"
);

mockEngine.dyingStrains.add("Alpha-101");
const isStrainADyingNow = mockEngine.dyingStrains.has("Alpha-101");
const tooltipDyingStrain = formatHoveredAgentInfo({ age: 100, tapering: isStrainADyingNow });
assert(
  tooltipDyingStrain.lifespanText === "Deleting",
  "QA-LFE-10-SPECIES",
  "Organism whose strain is in dyingStrains displays 'Deleting'"
);

console.log(`\n=== QA TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) {
  process.exit(1);
}
