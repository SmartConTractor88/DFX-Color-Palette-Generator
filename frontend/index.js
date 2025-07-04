// ================================
// Imports
// ================================
import { backend } from 'declarations/backend';
import { AuthClient } from "@dfinity/auth-client";
import html2canvas from 'html2canvas';

// ================================
// Utility Functions
// ================================
function getTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#000000" : "#FFFFFF";
}

function getCurrentPaletteColors() {
  const paletteDivs = document.querySelectorAll(".gen-color");
  return Array.from(paletteDivs).map(div => {
    const hexSpan = div.querySelector(".hex-code");
    return hexSpan ? hexSpan.innerText : null;
  }).filter(Boolean);
}

function palettesMatch(p1, p2) {
  if (!Array.isArray(p1) || !Array.isArray(p2)) return false;
  if (p1.length !== p2.length) return false;
  return p1.every((val, index) => val === p2[index]);
}

// ================================
// Palette Management
// ================================
let curatedPalettes = [];

async function loadPalettes() {
  try {
    const res = await fetch('/palettes.json');
    curatedPalettes = await res.json();
  } catch (e) {
    console.error("Failed to load palettes.json:", e);
  }
}

function pickRandomPalette() {
  if (!curatedPalettes.length) {
    // fallback palette
    return ['#eeeeee', '#d6d6d6', '#b7b7b7', '#7b7b7b', '#5f5f5f'];
  }
  const index = Math.floor(Math.random() * curatedPalettes.length);
  return curatedPalettes[index].colors;
}

function mutateHexColor(hex) {
  const [h, s, l] = chroma(hex).hsl();
  const newH = (h + rand(-10, 10) + 360) % 360;
  const newS = Math.min(1, Math.max(0, s + rand(-0.10, 0.10)));
  const newL = Math.min(1, Math.max(0, l + rand(-0.10, 0.10)));
  return chroma.hsl(newH, newS, newL).hex();
}

// ================================
// Generate Palette
// ================================
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function hslToHex(h, s, l) {
  return chroma.hsl(h, s / 100, l / 100).hex();
}

function generatePalette() {
  try {
    const colorDivs = document.querySelectorAll(".gen-color");
    colorDivs.forEach(div => div.classList.add("loading"));

    let colors = pickRandomPalette();

    // Mutate each color slightly for uniqueness
    colors = colors.map(c => mutateHexColor(c));

    // 40% chance to insert a near-black color
    if (Math.random() < 0.4) {
      const darkHue = rand(0, 360);
      const darkColor = hslToHex(darkHue, rand(20, 40), rand(3, 8));
      const replaceIndex = Math.floor(Math.random() * 5);
      colors[replaceIndex] = darkColor;
    }

    colors.forEach((color, i) => {
      const div = colorDivs[i];
      if (!div) return;

      div.classList.remove("loading");
      div.innerHTML = "";
      div.style.backgroundColor = color;

      const textColor = chroma(color).luminance() > 0.5 ? "#000" : "#fff";
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
    });
  } catch (e) {
    console.error("Error generating palette:", e);
  }
}


// ================================
// Toolbar Functionality (Copy, Download)
// ================================
document.getElementById("generate").addEventListener("click", async () => {
  toggleLikeButton(false);
  await loadPalettes();
  generatePalette();
  // Check if the generated palette matches any favorites
  setTimeout(() => {
    fetchFavoritesFromBackend();
  }, 100);
});

document.getElementById("copy-all").addEventListener("click", () => {
  const colorDivs = document.querySelectorAll(".gen-color");
  const hexCodes = Array.from(colorDivs, div => {
    const hexSpan = div.querySelector(".hex-code");
    return hexSpan ? hexSpan.innerText : null;
  }).filter(Boolean);

  if (hexCodes.length > 0) {
    navigator.clipboard.writeText(hexCodes.join(", ")).then(() => {
      const icon = document.getElementById("copy-all");
      icon.classList.replace("fa-copy", "fa-check");
      setTimeout(() => icon.classList.replace("fa-check", "fa-copy"), 1000);
    });
  }
});

document.getElementById("download-png").addEventListener("click", () => {
  const palette = document.querySelector(".palette");
  html2canvas(palette, { backgroundColor: null, scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = "huehut_palette.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
});

// ================================
// Favorites Management
// ================================
async function addCurrentPaletteToFavorites() {
  const paletteColors = getCurrentPaletteColors();
  if (paletteColors.length === 0) {
    alert("No palette to save.");
    toggleLikeButton(false);
    return;
  }

  try {
    await backend.add_palette("Untitled", paletteColors);
    toggleLikeButton(true);
    fetchFavoritesFromBackend();
  } catch (err) {
    alert("Failed to save favorite: " + err.message);
    toggleLikeButton(false);
  }
}

async function fetchFavoritesFromBackend() {
  try {
    const palettes = await backend.get_palettes();
    updateFavoritesDropdown(palettes);

    const current = getCurrentPaletteColors();
    const found = palettes.some(p => palettesMatch(p.colors, current));
    toggleLikeButton(found);
  } catch (err) {
    console.error("Error fetching favorites:", err);
  }
}

function updateFavoritesDropdown(palettes = []) {
  const dropdown = document.getElementById("favorites-dropdown");
  const scrollContainer = dropdown.querySelector(".favorites-scroll-container");

  // Clear the scrollable content area
  scrollContainer.innerHTML = "";

  // Clear and rebuild the header
  dropdown.querySelectorAll(".favorites-header").forEach(header => header.remove());

  // Create dropdown header
  const header = document.createElement("div");
  header.className = "favorites-header";

  const title = document.createElement("span");
  title.textContent = "Your Favorite Palettes";
  title.className = "favorites-title";

  const deleteAllIcon = document.createElement("i");
  deleteAllIcon.className = "fas fa-trash-alt delete-all-icon";
  deleteAllIcon.title = "Delete All Favorites";

  deleteAllIcon.onclick = async () => {
    if (!confirm("Are you sure you want to delete all favorite palettes?")) return;

    const items = scrollContainer.querySelectorAll(".favorite-item");

    items.forEach((item, i) => {
      setTimeout(() => {
        item.classList.add("fade-out");
      }, i * 80);
    });

    const totalDelay = items.length * 80 + 300;

    setTimeout(() => {
      dropdown.classList.add("closing");
    }, totalDelay);

    setTimeout(() => {
      dropdown.classList.remove("closing");
      toggleLikeButton(false);
    }, totalDelay + 300);


    try {
      const palettes = await backend.get_palettes();
      for (const p of palettes) {
        await backend.delete_palette(p.colors);
      }
      fetchFavoritesFromBackend();
      setTimeout(() => toggleLikeButton(false), 100);
    } catch (err) {
      alert("Failed to delete all favorites.");
    }
  };

  header.appendChild(title);
  header.appendChild(deleteAllIcon);
  dropdown.insertBefore(header, scrollContainer);

  // Show placeholder if empty
  if (palettes.length === 0) {
    scrollContainer.innerHTML = '<p class="dropdown-placeholder">No favorites saved yet.</p>';
    return;
  }

  // Build and insert favorite items
  palettes.forEach((palette) => {
    const item = document.createElement("div");
    item.className = "favorite-item";

    const title = document.createElement("input");
    title.className = "favorite-title";
    title.value = palette.title || "Untitled";

    title.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        title.blur();
      }
    });

    title.addEventListener("blur", async () => {
      const newTitle = title.value.trim();
      if (newTitle && newTitle !== palette.title) {
        try {
          await backend.update_palette_title(palette.colors, newTitle);
          palette.title = newTitle;
        } catch (err) {
          alert("Failed to update title.");
          title.value = palette.title;
        }
      }
    });

    const preview = document.createElement("div");
    preview.className = "color-preview";

    palette.colors.forEach(color => {
      const box = document.createElement("div");
      box.className = "color-box";
      box.style.backgroundColor = color;
      preview.appendChild(box);
    });

    const actions = document.createElement("div");
    actions.className = "favorite-actions";

    const expandIcon = document.createElement("i");
    expandIcon.className = "fas fa-expand expand-favorite";
    expandIcon.title = "Load Palette";
    expandIcon.onclick = () => {
      // Load the palette onto the main color divs
      const colorDivs = document.querySelectorAll(".gen-color");
      palette.colors.forEach((color, i) => {
        const div = colorDivs[i];
        if (!div) return;

        div.innerHTML = "";
        div.style.backgroundColor = color;

        const textColor = chroma(color).luminance() > 0.5 ? "#000" : "#fff";
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
      });

      // Collapse the dropdown
      const dropdown = document.getElementById("favorites-dropdown");
      const backdrop = document.getElementById("favorites-backdrop");
      const toggle = document.getElementById("favorites-dropdown-toggle");
      
      dropdown.classList.remove("show");
      if (backdrop) backdrop.classList.remove("active");
      toggle.classList.remove("rotated");

      // Activate the like button since a favorite palette is now loaded
      toggleLikeButton(true);
    };

    const deleteIcon = document.createElement("i");
    deleteIcon.className = "fas fa-trash-alt";
    deleteIcon.title = "Remove";
    deleteIcon.onclick = async () => {
      try {
        await backend.delete_palette(palette.colors);
        fetchFavoritesFromBackend();
        toggleLikeButton(false);
      } catch (err) {
        alert("Failed to delete palette.");
      }
    };

    actions.appendChild(expandIcon);
    actions.appendChild(deleteIcon);

    item.appendChild(title);
    item.appendChild(preview);
    item.appendChild(actions);

    scrollContainer.appendChild(item);
  });
}


// ================================
// Favorites Dropdown Toggle
// ================================
document.addEventListener("DOMContentLoaded", async () => {
  const favoritesToggle = document.getElementById("favorites-dropdown-toggle");
  const favoritesDropdown = document.getElementById("favorites-dropdown");
  const favoritesBackdrop = document.getElementById("favorites-backdrop");
  const logoutButton = document.getElementById("logout");

  if (favoritesToggle && favoritesDropdown && favoritesBackdrop) {
    favoritesToggle.classList.remove("disabled");
    favoritesToggle.addEventListener("click", () => {
      favoritesDropdown.classList.remove("hidden");
      const isOpen = favoritesDropdown.classList.toggle("show");
      // Toggle backdrop
      if (isOpen) {
        favoritesBackdrop.classList.add("active");
      } else {
        favoritesBackdrop.classList.remove("active");
      }
      // Rotate arrow based on dropdown state
      if (isOpen) {
        favoritesToggle.classList.add("rotated");
      } else {
        favoritesToggle.classList.remove("rotated");
      }
    });
  }
  
  await loadPalettes();
  generatePalette(); // Initial palette on load
});

// Hide dropdown and backdrop when clicking outside
// (replace the previous document.addEventListener("click", ...) for closing dropdown)
document.addEventListener("click", (e) => {
  const toggle = document.getElementById("favorites-dropdown-toggle");
  const dropdown = document.getElementById("favorites-dropdown");
  const backdrop = document.getElementById("favorites-backdrop");
  if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
    dropdown.classList.remove("show");
    // Hide backdrop
    if (backdrop) backdrop.classList.remove("active");
    // Rotate arrow back when dropdown closes
    toggle.classList.remove("rotated");
  }
});

// ================================
// Like Button (Favorite Toggle)
// ================================
const likeButton = document.getElementById("like-button");

likeButton.addEventListener("click", async () => {
  if (likeButton.classList.contains("disabled")) return;
  if (!userIsLoggedIn) {
    alert("Please log in to save favorites.");
    return;
  }

  const paletteColors = getCurrentPaletteColors();
  if (paletteColors.length === 0) return;

  const isLiked = likeButton.classList.contains("fas");

  if (isLiked) {
    likeButton.classList.remove("fas");
    likeButton.classList.add("far");
    try {
      await backend.delete_palette(paletteColors);
      fetchFavoritesFromBackend();
    } catch (err) {
      likeButton.classList.remove("far");
      likeButton.classList.add("fas");
      alert("Failed to remove favorite: " + err.message);
    }
  } else {
    likeButton.classList.remove("far");
    likeButton.classList.add("fas");
    try {
      await backend.add_palette("Untitled", paletteColors);
      fetchFavoritesFromBackend();
    } catch (err) {
      likeButton.classList.remove("fas");
      likeButton.classList.add("far");
      alert("Failed to save favorite: " + err.message);
    }
  }
});

function toggleLikeButton(active) {
  const btn = document.getElementById("like-button");
  btn.classList.remove("fa-heart", "far", "fas");
  if (active) {
    btn.classList.add("fas", "fa-heart");
  } else {
    btn.classList.add("far", "fa-heart");
  }
}

// ================================
// Authentication & Identity Management
// ================================
const profileDisplay = document.getElementById("profileDisplay");
const dropdownMenu = document.getElementById("dropdownMenu");
const userMenuBackdrop = document.getElementById("user-menu-backdrop");
const loginButton = document.getElementById("login-ii");
const logoutButton = document.getElementById("logout");
const profileName = document.getElementById("profileName");
const fullPrincipalSpan = document.getElementById("fullPrincipal");
const copyPrincipalIcon = document.getElementById("copyPrincipalIcon");
const tooltip = document.getElementById("principalTooltip");

let authClient;
let userIsLoggedIn = false;

profileDisplay.addEventListener("click", () => {
  const isOpen = dropdownMenu.classList.toggle("show");
  // Toggle backdrop
  if (isOpen) {
    userMenuBackdrop.classList.add("active");
  } else {
    userMenuBackdrop.classList.remove("active");
  }
});

// Add click handler to backdrop to close dropdown
if (userMenuBackdrop) {
  userMenuBackdrop.addEventListener("click", () => {
    dropdownMenu.classList.remove("show");
    userMenuBackdrop.classList.remove("active");
  });
}

document.addEventListener("click", (e) => {
  const logoutButton = document.getElementById("logout");
  const userMenu = document.querySelector(".user-menu");

  if (
    !userMenu.contains(e.target) &&  // click outside user menu
    !(logoutButton && logoutButton.contains(e.target)) // and not inside logout button
  ) {
    dropdownMenu.classList.remove("show");
    // Hide backdrop
    if (userMenuBackdrop) userMenuBackdrop.classList.remove("active");
  }
});

copyPrincipalIcon.addEventListener("click", () => {
  const text = profileName.dataset.fullPrincipal;
  if (text) {
    navigator.clipboard.writeText(text).then(() => {
      copyPrincipalIcon.classList.replace("fa-copy", "fa-check");
      setTimeout(() => {
        copyPrincipalIcon.classList.replace("fa-check", "fa-copy");
      }, 1000);
    });
  }
});

async function initAuth() {
  authClient = authClient || await AuthClient.create();
  if (await authClient.isAuthenticated()) {
    const identity = authClient.getIdentity();
    const principal = identity.getPrincipal().toText();
    updateIdentityDisplay(principal);
  } else {
    userIsLoggedIn = false;
    profileName.textContent = "Sign In";
    fullPrincipalSpan.textContent = "";
    tooltip.style.display = "none";
    logoutButton.classList.add("disabled");
    updateFavoritesUI(false);
  }
}

loginButton.addEventListener("click", async () => {
  if (!authClient) {
    authClient = await AuthClient.create();
  }
  await authClient.login({
    identityProvider: `https://identity.ic0.app/#authorize`,
    onSuccess: async () => {
      const principal = authClient.getIdentity().getPrincipal().toText();
      updateIdentityDisplay(principal);
    }
  });
});

// Attach logout event listener only if logoutButton exists
if (logoutButton) {
  logoutButton.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (logoutButton.disabled) {
      console.log("Logout button is disabled — skipping handler.");
      return;
    }

    console.log("Logout button clicked");

    try {
      if (!authClient) {
        authClient = await AuthClient.create();
      }
      await authClient.logout({ returnTo: window.location.origin });
      console.log("Logout success, reloading page");
      window.location.reload();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  });
}

function updateIdentityDisplay(principal) {
  userIsLoggedIn = true;
  profileName.textContent = principal.slice(0, 12) + "...";
  profileName.dataset.fullPrincipal = principal;
  fullPrincipalSpan.textContent = principal;
  tooltip.style.display = "";
  logoutButton.classList.remove("disabled");
  updateFavoritesUI(true);
  fetchFavoritesFromBackend();
}

// ================================
// UI State Helpers
// ================================
function updateFavoritesUI(isLoggedIn) {
  const wrapper = document.getElementById('favorites-wrapper');
  const likeBtn = document.getElementById('like-button');
  const dropdownToggle = document.getElementById('favorites-dropdown-toggle');

  if (isLoggedIn) {
    wrapper.classList.remove('favorites-disabled');
    likeBtn.classList.remove('disabled');
    dropdownToggle.classList.remove('disabled');
  } else {
    wrapper.classList.add('favorites-disabled');
    likeBtn.classList.add('disabled');
    dropdownToggle.classList.add('disabled');
  }
}

// Tooltip hover logic
const profileWrapper = document.querySelector('.profile-display-wrapper');

let tooltipHideTimeout = null;
let tooltipJustOpened = false;

profileWrapper.addEventListener("mouseenter", () => {
  if (userIsLoggedIn) {
    clearTimeout(tooltipHideTimeout);
    profileWrapper.classList.add("show-tooltip");

    if (!tooltipJustOpened) {
      tooltipJustOpened = true;

      requestAnimationFrame(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        const screenWidth = window.innerWidth;

        if (tooltipRect.right > screenWidth - 10) {
          tooltip.style.left = "auto";
          tooltip.style.right = "0";
        } else {
          tooltip.style.left = "0";
          tooltip.style.right = "auto";
        }
      });
    }
  }
});

profileWrapper.addEventListener("mouseleave", () => {
  tooltipHideTimeout = setTimeout(hideTooltip, 300);
});

tooltip.addEventListener("mouseenter", () => {
  clearTimeout(tooltipHideTimeout);
});

tooltip.addEventListener("mouseleave", () => {
  tooltipHideTimeout = setTimeout(hideTooltip, 300);
});

function hideTooltip() {
  profileWrapper.classList.remove("show-tooltip");
  tooltip.style.left = "0";
  tooltip.style.right = "auto";
  tooltipJustOpened = false;
}

// ================================
// Init
// ================================
initAuth();
