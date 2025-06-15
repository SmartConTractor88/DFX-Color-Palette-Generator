import { backend } from 'declarations/backend';

// Function to generate and display the palette
async function generatePalette() {
  try {
    const colors = await backend.random_palette(); // Fetch colors from backend
    const colorDivs = document.querySelectorAll(".gen-color");

    colors.forEach((color, i) => {
      if (colorDivs[i]) {
        // Set the background color
        colorDivs[i].style.backgroundColor = color;

        // Set the text content to show the HEX code
        colorDivs[i].innerText = color;

        // Optional: style the text for visibility
        colorDivs[i].style.color = "#000"; // or "#fff" depending on bg color
        colorDivs[i].style.fontWeight = "bold";
        colorDivs[i].style.textAlign = "center";
        colorDivs[i].style.lineHeight = "100px"; // assuming height = 100px
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

