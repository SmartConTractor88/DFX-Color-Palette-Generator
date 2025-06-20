import { backend } from 'declarations/backend';

// ================================
// Helper: get appropriate text color based on background brightness
// ================================
function getTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#000000" : "#FFFFFF"; // bright bg -> black text, dark bg -> white text
}

// ================================
// Generate random hex color
// ================================
function generateRandomHexColor() {
  const hex = Math.floor(Math.random() * 16777215).toString(16);
  return "#" + hex.padStart(6, "0");
}

// ================================
// Generate and display color palette (frontend version)
// ================================
function generatePalette() {
  try {
    const colorDivs = document.querySelectorAll(".gen-color");

    // Show shimmer animation
    colorDivs.forEach(div => div.classList.add("loading"));

    // Generate local colors
    const colors = Array.from({ length: 5 }, generateRandomHexColor);

    colors.forEach((color, i) => {
      if (colorDivs[i]) {
        const div = colorDivs[i];
        div.classList.remove("loading"); // stop shimmer
        div.innerHTML = "";
        div.style.backgroundColor = color;

        const textColor = getTextColor(color);

        // Create wrapper for hex + icon
        const wrapper = document.createElement("div");
        wrapper.className = "hex-wrapper";

        // HEX code element
        const hexText = document.createElement("span");
        hexText.className = "hex-code";
        hexText.innerText = color;
        hexText.style.color = textColor;

        // Copy icon element
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

        // Append children
        wrapper.appendChild(hexText);
        wrapper.appendChild(copyIcon);
        div.appendChild(wrapper);

        // Flex centering for div
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
      }
    });
  } catch (e) {
    console.error("Error generating palette:", e);
  }
}

// ================================
// Event listeners
// ================================
document.addEventListener("DOMContentLoaded", generatePalette);
document.getElementById("generate").addEventListener("click", generatePalette);

// ================================
// Copy all colors to clipboard
// ================================
document.getElementById("copy-all").addEventListener("click", () => {
  const colorDivs = document.querySelectorAll(".gen-color");
  const hexCodes = [];

  colorDivs.forEach(div => {
    const hexSpan = div.querySelector(".hex-code");
    if (hexSpan) {
      hexCodes.push(hexSpan.innerText);
    }
  });

  if (hexCodes.length > 0) {
    const formatted = hexCodes.join(", ");
    navigator.clipboard.writeText(formatted).then(() => {
      // Optional: Visual feedback
      const icon = document.getElementById("copy-all");
      icon.classList.replace("fa-copy", "fa-check");
      setTimeout(() => {
        icon.classList.replace("fa-check", "fa-copy");
      }, 1000);
    });
  }
});

// ================================
// Download palette as image
// ================================
import html2canvas from 'html2canvas';

document.getElementById("download-png").addEventListener("click", () => {
  const palette = document.querySelector(".palette");

  html2canvas(palette, {
    backgroundColor: null, // makes transparent background
    scale: 2               // higher resolution
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = "huehut_palette.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
});

// ================================
// Console Dev Message
// ================================
console.log(
  "%cHueHut Backend",
  "color: #00bcd4; font-weight: bold; font-size: 16px;"
);
console.log("ICP backend is deployed and ready for future updates.");

