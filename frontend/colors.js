function generateRandomHexColor() {
    const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    return '#' + hex.toUpperCase();
}

const roleDistribution = [
    { role: 'neutral', weight: 0.28 },
    { role: 'accent', weight: 0.37 },
    { role: 'variant', weight: 0.35 }
];

// track used roles within one palette generation
let usedRoles = new Set();

function pickRoleWithDiversity() {
    // if we already used all roles, reset
    if (usedRoles.size >= roleDistribution.length) {
        usedRoles.clear();
    }

    // filter roles: lower weight if already used
    const adjusted = roleDistribution.map(r => ({
        role: r.role,
        weight: usedRoles.has(r.role) ? r.weight * 0.3 : r.weight // diminish repeats
    }));

    const totalWeight = adjusted.reduce((sum, r) => sum + r.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const r of adjusted) {
        if (rand < r.weight) {
            usedRoles.add(r.role);
            return r.role;
        }
        rand -= r.weight;
    }
    // fallback
    return adjusted[0].role;
}


function averageColors(colors) {
    if (colors.length === 0) return generateRandomHexColor();

    let [rSum, gSum, bSum] = [0, 0, 0];
    colors.forEach(c => {
        const hex = c.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        rSum += r; gSum += g; bSum += b;
    });
    const n = colors.length;
    const r = Math.round(rSum / n);
    const g = Math.round(gSum / n);
    const b = Math.round(bSum / n);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function jitter(value, amount = 30) {
    return Math.min(255, Math.max(0, value + Math.floor((Math.random() - 0.5) * amount * 2)));
}

function generateNeutralColor(baseColor) {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const avg = Math.round((r + g + b) / 3);

    // pick light or dark bias more often, avoid muddy middle range
    let brightness;
    const roll = Math.random();
    if (roll < 0.45) {
        // 45% chance: light gray / near white
        brightness = 0.75 + Math.random() * 0.25; // 75%–100%
    } else if (roll < 0.9) {
        // 45% chance: dark gray / near black
        brightness = 0.05 + Math.random() * 0.25; // 5%–30%
    } else {
        // 10% chance: allow mid-gray for variety
        brightness = 0.35 + Math.random() * 0.15; // 35%–50%
    }

    const newVal = Math.max(0, Math.min(255, Math.round(avg * brightness)));

    return '#' + [newVal, newVal, newVal]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}

function generateAccentColor(baseColor) {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    let newR, newG, newB;
    const mode = Math.random();

    if (mode < 0.5) {
        // Complementary (invert with jitter)
        newR = jitter(255 - r);
        newG = jitter(255 - g);
        newB = jitter(255 - b);
    } else {
        // Hue shift (rotate channels + jitter)
        newR = jitter(g);
        newG = jitter(b);
        newB = jitter(r);
    }

    return '#' + [newR, newG, newB].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// --- NEW: variant role (RGB permutation / channel mixing) ---
function generateVariantColor(baseColor) {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const modes = [
        [r, g, b],
        [r, b, g],
        [g, r, b],
        [g, b, r],
        [b, r, g],
        [b, g, r]
    ];

    // pick one permutation at random, then jitter slightly
    const [newR, newG, newB] = modes[Math.floor(Math.random() * modes.length)];
    return '#' + [jitter(newR), jitter(newG), jitter(newB)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}

function isNeutralColor(hex) {
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max; // simple saturation measure
    return sat < 0.15; // consider “neutral” if very low saturation
}

function getBaseColorFromLocks(lockedColors) {
    if (lockedColors.length === 0) {
        return generateRandomHexColor();
    }

    // if all locked colors are neutral → ignore them as base
    const allNeutral = lockedColors.every(c => isNeutralColor(c));
    if (allNeutral) {
        return generateRandomHexColor();
    }

    if (lockedColors.length === 1) {
        return lockedColors[0];
    } else if (lockedColors.length === 2) {
        const roll = Math.random();
        if (roll < 0.4) return lockedColors[0];
        if (roll < 0.6) return lockedColors[1];
        return averageColors(lockedColors);
    } else {
        const roll = Math.random();
        if (roll < 0.55) {
            return averageColors(lockedColors);
        } else {
            return lockedColors[Math.floor(Math.random() * lockedColors.length)];
        }
    }
}

// --- prevent duplicate or too-similar colors per palette ---
let usedColors = new Set();
let usedColorList = []; // keep array for distance checking

// helper: calculate perceptual distance between two hex colors
function colorDistance(hex1, hex2) {
    const r1 = parseInt(hex1.substr(1, 2), 16);
    const g1 = parseInt(hex1.substr(3, 2), 16);
    const b1 = parseInt(hex1.substr(5, 2), 16);
    const r2 = parseInt(hex2.substr(1, 2), 16);
    const g2 = parseInt(hex2.substr(3, 2), 16);
    const b2 = parseInt(hex2.substr(5, 2), 16);

    // simple Euclidean distance in RGB
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

function ensureUniqueColor(generatorFn, ...args) {
    let attempt = 0;
    let color;
    do {
        color = generatorFn(...args);
        attempt++;
        // retry if duplicate or too similar
    } while (
        (usedColors.has(color) ||
         usedColorList.some(c => colorDistance(c, color) < 40)) // 40 = min distance threshold
        && attempt < 20
    );
    usedColors.add(color);
    usedColorList.push(color);
    return color;
}

function getNewColor(index, paletteState) {
    if (index === 0) {
        usedRoles.clear(); // reset at start of palette
        usedColors = new Set(); // reset duplicate prevention
        usedColorList = [];
    }

    const lockedColors = paletteState ? paletteState.filter(c => c.isLocked).map(c => c.color) : [];

    // NEW: check if all locked colors are neutral
    const allNeutral = lockedColors.length > 0 && lockedColors.every(c => isNeutralColor(c));

    // pick base normally unless all locked are neutral
    const baseColor = allNeutral ? generateRandomHexColor() : getBaseColorFromLocks(lockedColors);

    const role = pickRoleWithDiversity();

    switch (role) {
        case 'neutral':
            return ensureUniqueColor(generateNeutralColor, baseColor);
        case 'accent':
            return ensureUniqueColor(generateAccentColor, baseColor);
        case 'variant':
            return ensureUniqueColor(generateVariantColor, baseColor);
        default:
            return ensureUniqueColor(generateRandomHexColor);
    }
}

export {
    generateRandomHexColor,
    getNewColor,
    pickRoleWithDiversity,
    generateNeutralColor,
    generateAccentColor,
    generateVariantColor
};
