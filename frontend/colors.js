function generateRandomHexColor() {
    const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    return '#' + hex.toUpperCase();
}

const roleDistribution = [
    { role: 'neutral', weight: 0.35 },
    { role: 'accent', weight: 0.3 },
    { role: 'variant', weight: 0.35 } // new role replaces "bridge"
];

function pickRole(roleDistribution) {
    const totalWeight = roleDistribution.reduce((sum, r) => sum + r.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const r of roleDistribution) {
        if (rand < r.weight) return r.role;
        rand -= r.weight;
    }
    return roleDistribution[0].role;
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
    const brightness = Math.random() * 0.8 + 0.1;
    const newVal = Math.round(avg * brightness);

    return '#' + [newVal, newVal, newVal].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
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

function getBaseColorFromLocks(lockedColors) {
    if (lockedColors.length === 0) {
        return generateRandomHexColor();
    } else if (lockedColors.length === 1) {
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

// --- prevent duplicate colors per palette ---
let usedColors = new Set();

function ensureUniqueColor(generatorFn, ...args) {
    let attempt = 0;
    let color;
    do {
        color = generatorFn(...args);
        attempt++;
    } while (usedColors.has(color) && attempt < 10);
    usedColors.add(color);
    return color;
}

function getNewColor(index, paletteState) {
    if (index === 0) {
        usedColors = new Set(); // reset for a new palette
    }

    const lockedColors = paletteState ? paletteState.filter(c => c.isLocked).map(c => c.color) : [];
    const baseColor = getBaseColorFromLocks(lockedColors);

    const role = pickRole(roleDistribution);

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
    pickRole,
    generateNeutralColor,
    generateAccentColor,
    generateVariantColor
};
