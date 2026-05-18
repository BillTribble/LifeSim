import re
import os

tooltips = {
    "ROT_VEL": "ROTATION VELOCITY\nControls the base camera rotation speed.\nHigh: Fast spinning view.\nLow: Slow or stationary view.",
    "MAX_DOMS": "MAX MEMORY POINTS\nLimits total rendering complexity.\nHigh: Richer visuals, lower performance.\nLow: Simpler visuals, faster performance.",
    "MAX_AGENTS": "MAX ORGANISMS\nUpper limit for population.\nHigh: Crowded ecosystem.\nLow: Sparse ecosystem.",
    "MIN_AGENTS": "MIN ORGANISMS\nLower limit for population.\nHigh: Ecosystem never dies out.\nLow: Ecosystem can become almost empty.",
    "MAX_SPECIES": "MAX SPECIES\nMaximum active genetic strains.\nHigh: High biodiversity.\nLow: Monoculture.",
    "RADIUS": "BOUNDARY RADIUS\nSize of the simulation area.\nHigh: Vast open space.\nLow: Confined, dense space.",
    
    "MAGNET": "SWARM COHESION\nHow strongly organisms attract each other.\nHigh: Tight, dense swarms.\nLow: Independent, scattered movement.",
    "PROXIM": "DETECTION RANGE\nHow far organisms can sense others.\nHigh: Long-range interactions.\nLow: Myopic, local interactions only.",
    "DESPAIR": "DESPERATION\nErratic movement when seeking food/mates.\nHigh: Frantic, fast searching.\nLow: Calm, methodical movement.",
    "DESP_AGE": "DESPAIR AGE\nAge at which desperation begins.\nHigh: Only elders become desperate.\nLow: Youthful desperation.",
    "ENTROPY": "POPULATION LIMIT\nThreshold for environmental capacity.\nHigh: Sustains larger populations.\nLow: Strict population culling.",
    "ECO_FADE": "ECO FADE\nRate at which environment marks disappear.\nHigh: Trails fade quickly.\nLow: Long-lasting environmental impact.",
    "CULL_RATE": "CULL RATE\nSpeed of population control.\nHigh: Rapid culling of excess organisms.\nLow: Slow, gradual culling.",
    
    "GROW_SPD": "EXTRUSION SPEED\nGrowth rate of organisms.\nHigh: Fast, explosive growth.\nLow: Slow, deliberate growth.",
    "DEATH RATE": "DECAY VELOCITY\nSpeed of organism deterioration.\nHigh: Rapid decay and death.\nLow: Slow, lingering decline.",
    "DIE_BIAS": "AGE BIAS\nImpact of age on death rate.\nHigh: Old age is strictly fatal.\nLow: Age matters less for survival.",
    "TERM_PROB": "TERMINATION\nBase chance of sudden death.\nHigh: Frequent random casualties.\nLow: Rare random deaths.",
    "FADE_SPEED": "FADE SPEED\nHow fast dead organisms vanish.\nHigh: Corpses disappear quickly.\nLow: Ghostly remains linger.",
    "FEELER_FADE": "FEELER FADE\nDecay rate of sensory appendages.\nHigh: Feelers are short-lived.\nLow: Long, persistent feelers.",
    
    "HYBRID_COOL": "HYBRID BREED COOL\nDelay between breeding attempts.\nHigh: Infrequent, rare breeding.\nLow: Rapid, continuous breeding.",
    "HYBRID_SIZE": "HYBRID SIZE\nStarting size of new offspring.\nHigh: Massive newborns.\nLow: Tiny, fragile newborns.",
    "HYBRID_DECAY": "HYBRID DECAY\nDuration that hybridization artifacts persist before fading.\nHigh: Artifacts linger for a long time.\nLow: Artifacts fade away quickly.",
    
    "BRANCH_VAR": "BRANCH VARIANCE\nRandomness in branching patterns.\nHigh: Wild, chaotic branching.\nLow: Uniform, predictable branching.",
    "BRANCHING": "BRANCH RATE\nOverall frequency of branching.\nHigh: Dense, bushy structures.\nLow: Linear, simple structures.",
    "TERM_BRANCH": "BRANCH TERM PENALTY\nDeath risk after creating a branch.\nHigh: Branching is often fatal.\nLow: Safe, frequent branching.",
    "B_MUTATE": "BRANCH MUTATION\nChance of mutation upon branching.\nHigh: Rapid evolution on new branches.\nLow: Stable genetic clones.",
    "BRANCH_BIG": "BRANCH BIGGER\nChance for branches to be thicker.\nHigh: Thick, heavy secondary branches.\nLow: Thin, wispy branches.",
    "LRG_BRANCH": "LARGE BRANCH PROB\nFrequency of major structural forks.\nHigh: Frequent major splits.\nLow: Mostly minor side-branches.",
    
    "TIME_SCALE": "TIME SCALE\nGlobal simulation speed multiplier.\nHigh: Fast-forward time.\nLow: Slow-motion time.",
    "SNAKE": "SNAKE SPEED\nMovement speed for snake-types.\nHigh: Fast, darting snakes.\nLow: Sluggish snakes.",
    "BUSH": "BUSH SPEED\nGrowth speed for bush-types.\nHigh: Rapidly expanding bushes.\nLow: Slowly growing bushes.",
    "TREE": "TREE SPEED\nGrowth speed for tree-types.\nHigh: Fast-sprouting trees.\nLow: Slow, ancient trees.",
    "GINGER": "GINGER SPEED\nMovement speed for ginger-types.\nHigh: Quick, erratic gingers.\nLow: Slow, drifting gingers.",
    
    "APP_SIZE": "APPENDAGE SIZE\nScale of structural appendages.\nHigh: Massive, prominent appendages.\nLow: Tiny, subtle appendages.",
    "TAPER_TIME": "TAPER DUR\nDuration of line thickness tapering.\nHigh: Long, smooth tapers.\nLow: Abrupt, sharp tapers.",
    "MAX_WIDTH": "MAX WIDTH\nMaximum thickness of organisms.\nHigh: Thick, bulky lines.\nLow: Thin, delicate lines.",
    "MULTI_COLOR": "MULTI COLOR APP PROB\nChance of colorful appendages.\nHigh: Rainbow, multi-colored parts.\nLow: Monochromatic parts.",
    "SAME_COLOR": "SAME COLOR APP PROB\nChance appendages match body color.\nHigh: Uniformly colored organisms.\nLow: Contrasting appendage colors.",
    "PULSE_SPD": "PULSE SPEED\nSpeed of luminescent pulses.\nHigh: Rapid, strobing pulses.\nLow: Slow, gentle throbbing.",
    "SATURATION": "SATURATION\nOverall color intensity limit.\nHigh: Vibrant, neon colors.\nLow: Muted, pastel colors.",
    
    "THICKNESS": "TIDE THICKNESS\nThickness of the tidal wave cloud.\nHigh: Wide, sweeping wave.\nLow: Thin, sharp wave.",
    "FOG_DEPTH": "FOG DEPTH\nVisibility range of atmospheric fog.\nHigh: Clear, deep visibility.\nLow: Enclosed, misty environment.",
    "OPACITY": "TIDE OPACITY\nTransparency of the tidal wave.\nHigh: Dense, opaque wave.\nLow: Faint, transparent wave.",
    "TIDE_SPEED": "TIDE SPEED\nPeriodicity of the tidal pulse.\nHigh: Frequent, rapid surges.\nLow: Long periods of calm.",
    "SATURATION": "TIDE SATURATION\nColor intensity of the tidal wave.\nHigh: Vibrant, rich colors.\nLow: Spectral, ghostly colors.",
    "BG_SAT": "BACKGROUND SATURATION\nSaturation of the void background.\nHigh: Colorful space.\nLow: Grayscale void.",
    "BG_LUM": "BACKGROUND LUMINOSITY\nBrightness of the void background.\nHigh: Bright, lit space.\nLow: Dark, deep void."
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Special handling for ART_SIZE rename to APP_SIZE
    if "ART_SIZE" in content:
        content = content.replace('label="ART_SIZE"', 'label="APP_SIZE"')

    def replacer(match):
        full_match = match.group(0)
        label = match.group(2)
        if label in tooltips:
            new_tooltip = tooltips[label]
            # Escape newlines for string literal
            new_tooltip_escaped = new_tooltip.replace('\n', '\\n')
            # Replace the tooltip attribute
            new_match = re.sub(r'tooltip="[^"]*"', f'tooltip="{new_tooltip_escaped}"', full_match)
            if new_match == full_match:
                new_match = re.sub(r'tooltip=\{[^}]*\}', f'tooltip="{new_tooltip_escaped}"', full_match)
            return new_match
        return full_match

    # Regex to find Dial or SmartDial components and extract their label
    # This matches <Dial ... label="X" ... /> and <SmartDial ... label="X" ... />
    # We need a robust regex.
    pattern = r'(<(?:Smart)?Dial[^>]+label="([^"]+)"[^>]*/>)'
    
    new_content = re.sub(pattern, replacer, content)

    # Handle MutationPanel special case
    if "MutationPanel" in filepath:
        old_mut_tooltip = r'tooltip={`TRAIT WEIGHT: Probability bias for the organism to grow specialized \${trait} ornaments during its lifecycle.`}'
        new_mut_tooltip = r'tooltip={`TRAIT WEIGHT: ${trait.toUpperCase()}\\nProbability bias to grow ${trait} ornaments.\\nHigh: Very likely to develop trait.\\nLow: Unlikely to develop trait.`}'
        new_content = new_content.replace(old_mut_tooltip, new_mut_tooltip)

    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            process_file(os.path.join(root, file))

# Also update update_hud.js if it exists
if os.path.exists('update_hud.js'):
    process_file('update_hud.js')

