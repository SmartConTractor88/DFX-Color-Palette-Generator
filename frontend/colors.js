function generateRandomHexColor() {
    // Generate a random hex color string
    const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    return '#' + hex.toUpperCase();
}
  
function getNewColor(index, paletteState) {
    // If there is no algorithm set yet, it should just return generateRandomHexColor() for now.
    return generateRandomHexColor();
}

export {
    generateRandomHexColor,
    getNewColor,
};