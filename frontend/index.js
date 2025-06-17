import { backend } from 'declarations/backend';

// Helper: convert hex to RGB and calculate brightness
function getTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#000000" : "#FFFFFF"; // dark bg -> white text, bright bg -> black text
}

// Function to generate and display the palette
async function generatePalette() {
  try {
    const colorDivs = document.querySelectorAll(".gen-color");

    // Show shimmer
    colorDivs.forEach(div => div.classList.add("loading"));

    const colors = await backend.random_palette();

    colors.forEach((color, i) => {
      if (colorDivs[i]) {
        const div = colorDivs[i];
        div.classList.remove("loading"); // Remove shimmer once loaded
        div.innerHTML = "";
        div.style.backgroundColor = color;

        const textColor = getTextColor(color);

        const wrapper = document.createElement("div");
        wrapper.className = "hex-wrapper";

        const hexText = document.createElement("span");
        hexText.className = "hex-code";
        hexText.innerText = color;
        hexText.style.color = textColor;

        const copyIcon = document.createElement("i");
        copyIcon.className = "fas fa-copy copy-icon";
        copyIcon.style.color = textColor;
        copyIcon.title = "Copy to clipboard";

        copyIcon.onclick = () => {
          navigator.clipboard.writeText(color).then(() => {
            copyIcon.classList.replace("fa-copy", "fa-check");
            setTimeout(() => {
              copyIcon.classList.replace("fa-check", "fa-copy");
            }, 1000);
          });
        };

        wrapper.appendChild(hexText);
        wrapper.appendChild(copyIcon);
        div.appendChild(wrapper);

        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
      }
    });
  } catch (e) {
    console.error("Error fetching palette:", e);
  }
}

// Initial load
document.addEventListener("DOMContentLoaded", generatePalette);

// Regenerate on button click
document.getElementById("generate").addEventListener("click", generatePalette);

