import { backend } from 'declarations/backend';

// Function to generate and display the palette
async function generatePalette() {
  try {
    const colors = await backend.random_palette(); // Fetch colors from backend
    const colorDivs = document.querySelectorAll(".gen-color");
    colors.forEach((color, i) => {
      if (colorDivs[i]) {
        colorDivs[i].style.backgroundColor = color; // Apply color
      }
    });
  } catch (e) {
    console.error("Error fetching palette:", e);
  }
}

// On DOM load, generate palette immediately
document.addEventListener("DOMContentLoaded", () => {
  generatePalette();
});

// Also allow generation on button click
document.getElementById("generate").addEventListener("click", generatePalette);

