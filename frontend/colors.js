function generateRandomHexColor() {
    const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    return '#' + hex.toUpperCase();
}

const roleDistribution = [
    { role: 'neutral', weight: 0.20 },
    { role: 'accent', weight: 0.35 },
    { role: 'variant', weight: 0.45 }
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

function generateNeutralColor() {
    let newVal;
    const roll = Math.random();

    if (roll < 0.48) {
        // ~48% chance: light gray / near white
        newVal = 200 + Math.floor(Math.random() * 55); // 200–255
    } else if (roll < 0.96) {
        // ~48% chance: dark gray / near black
        newVal = Math.floor(Math.random() * 80); // 0–79
    } else {
        // ~4% chance: mid-gray for variety
        newVal = 100 + Math.floor(Math.random() * 40); // 100–139
    }

    return '#' + [newVal, newVal, newVal]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}

function generateAccentColor(baseColor) {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Convert to HSL to detect saturation
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l;
    l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    // Boost saturation if base color is dull
    let newH = (h * 360 + (Math.random() * 120 + 60)) % 360; // shift hue 60–180°
    let newS = s < 0.25 ? 0.8 + Math.random() * 0.2 : Math.min(1, s + 0.3); // strong if dull
    let newL = Math.min(1, Math.max(0, l + (Math.random() - 0.5) * 0.4)); // vary lightness

    // Convert HSL back to RGB
    function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }

    const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS;
    const p = 2 * newL - q;
    const rOut = hue2rgb(p, q, newH / 360 + 1 / 3);
    const gOut = hue2rgb(p, q, newH / 360);
    const bOut = hue2rgb(p, q, newH / 360 - 1 / 3);

    const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(rOut)}${toHex(gOut)}${toHex(bOut)}`.toUpperCase();
}

// --- NEW: variant role (RGB permutation / channel mixing) ---
function generateVariantColor(baseColor) {
    // Parse base color RGB
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Convert RGB → HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l;
    l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // gray
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    // Convert hue to degrees
    h = h * 360;

    // --- Shift hue ---
    let shift = 60 + Math.random() * 100; // always a noticeable shift (60°–160°)
    if (Math.random() < 0.5) shift = -shift; // random direction

    let newH = h + shift;

    // Clamp within 0–360
    if (newH < 0) newH += 360;
    if (newH >= 360) newH -= 360;

    // Rebuild RGB from HSL
    function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }

    const hNorm = newH / 360;
    let rOut, gOut, bOut;

    if (s === 0) {
        rOut = gOut = bOut = l; // gray
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        rOut = hue2rgb(p, q, hNorm + 1 / 3);
        gOut = hue2rgb(p, q, hNorm);
        bOut = hue2rgb(p, q, hNorm - 1 / 3);
    }

    // Convert back to HEX
    const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(rOut)}${toHex(gOut)}${toHex(bOut)}`.toUpperCase();
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

function adjustRoleForDullBase(baseColor) {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;

    // If saturation is very low → treat as dull/neutralish
    return sat < 0.25;
}

function getNewColor(index, paletteState) {
    if (index === 0) {
        usedRoles.clear();       // reset at start of palette
        usedColors = new Set();  // reset duplicate prevention
        usedColorList = [];
    }

    const lockedColors = paletteState ? paletteState.filter(c => c.isLocked).map(c => c.color) : [];

    // check if all locked colors are neutral
    const allNeutral = lockedColors.length > 0 && lockedColors.every(c => isNeutralColor(c));

    // pick base normally unless all locked are neutral
    const baseColor = allNeutral ? generateRandomHexColor() : getBaseColorFromLocks(lockedColors);

    // pick role
    let role = pickRoleWithDiversity();

    // If base is dull/low-saturation, bias toward accents ---
    if (adjustRoleForDullBase(baseColor) && Math.random() < 0.45) {
        role = 'accent'; // force accents 60% of the time
    }

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
