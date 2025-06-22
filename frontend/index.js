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
// Palette Generation
// ================================
function generateRandomHexColor() {
  const hex = Math.floor(Math.random() * 16777215).toString(16);
  return "#" + hex.padStart(6, "0");
}

function generatePalette() {
  try {
    const colorDivs = document.querySelectorAll(".gen-color");
    colorDivs.forEach(div => div.classList.add("loading"));

    const colors = Array.from({ length: 5 }, generateRandomHexColor);

    colors.forEach((color, i) => {
      const div = colorDivs[i];
      if (!div) return;

      div.classList.remove("loading");
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
    });
  } catch (e) {
    console.error("Error generating palette:", e);
  }
}

// ================================
// Toolbar Functionality (Copy, Download)
// ================================
document.getElementById("generate").addEventListener("click", () => {
  toggleLikeButton(false);
  generatePalette();
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
  dropdown.innerHTML = "";

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

  // Close dropdown instantly with animation
  const dropdown = document.getElementById("favorites-dropdown");
  const items = dropdown.querySelectorAll(".favorite-item");

  items.forEach((item, i) => {
    setTimeout(() => {
      item.classList.add("fade-out");
    }, i * 80); // 80ms stagger per item
  });

  const totalDelay = items.length * 80 + 300; // last item fade + buffer

  setTimeout(() => {
    dropdown.classList.add("closing");
  }, totalDelay);

  setTimeout(() => {
    dropdown.classList.add("hidden");
    dropdown.classList.remove("closing");
    toggleLikeButton(false);
  }, totalDelay + 300); // match dropdown fade


  // Proceed with backend deletion
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
  dropdown.appendChild(header);

  if (palettes.length === 0) {
    dropdown.innerHTML = '<p class="dropdown-placeholder">No favorites saved yet.</p>';
    return;
  }

  palettes.forEach((palette, index) => {
    const item = document.createElement("div");
    item.className = "favorite-item";

    const title = document.createElement("input");
    title.className = "favorite-title";
    title.value = palette.title || "Untitled";

    // Editable title logic
    title.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        title.blur(); // Trigger blur to save
      }
    });

    title.addEventListener("blur", async () => {
      const newTitle = title.value.trim();
      if (newTitle && newTitle !== palette.title) {
        try {
          await backend.update_palette_title(palette.colors, newTitle);
          palette.title = newTitle; // update local copy
        } catch (err) {
          alert("Failed to update title.");
          title.value = palette.title; // revert input on failure
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

    const copyIcon = document.createElement("i");
    copyIcon.className = "fas fa-copy copy-favorite";
    copyIcon.title = "Copy Palette";
    copyIcon.onclick = () => {
      const hexList = palette.colors.join(", ");
      navigator.clipboard.writeText(hexList).then(() => {
        copyIcon.classList.replace("fa-copy", "fa-check");
        setTimeout(() => {
          copyIcon.classList.replace("fa-check", "fa-copy");
        }, 1000);
      });
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

    actions.appendChild(copyIcon);
    actions.appendChild(deleteIcon);
    item.appendChild(title);
    item.appendChild(preview);
    item.appendChild(actions);
    dropdown.appendChild(item);
  });
}

// ================================
// Favorites Dropdown Toggle
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const favoritesToggle = document.getElementById("favorites-dropdown-toggle");
  const favoritesDropdown = document.getElementById("favorites-dropdown");

  if (favoritesToggle && favoritesDropdown) {
    favoritesToggle.classList.remove("disabled");
    favoritesToggle.addEventListener("click", () => {
      favoritesDropdown.classList.toggle("hidden");
    });
  }

  generatePalette(); // Initial palette on load
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
const loginButton = document.getElementById("login-ii");
const logoutButton = document.getElementById("logout");
const profileName = document.getElementById("profileName");
const fullPrincipalSpan = document.getElementById("fullPrincipal");
const copyPrincipalIcon = document.getElementById("copyPrincipalIcon");
const tooltip = document.getElementById("principalTooltip");

let authClient;
let userIsLoggedIn = false;

profileDisplay.addEventListener("click", () => {
  dropdownMenu.style.display =
    dropdownMenu.style.display === "flex" ? "none" : "flex";
});

document.addEventListener("click", (e) => {
  if (!document.querySelector(".user-menu").contains(e.target)) {
    dropdownMenu.style.display = "none";
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
  authClient = await AuthClient.create();
  if (await authClient.isAuthenticated()) {
    const identity = authClient.getIdentity();
    const principal = identity.getPrincipal().toText();
    updateIdentityDisplay(principal);
  } else {
    userIsLoggedIn = false;
    profileName.textContent = "Guest";
    fullPrincipalSpan.textContent = "";
    tooltip.style.display = "none";
    logoutButton.classList.add("disabled");
    updateFavoritesUI(false);
  }
}

loginButton.addEventListener("click", async () => {
  await authClient.login({
    identityProvider: `https://identity.ic0.app/#authorize`,
    onSuccess: async () => {
      const principal = authClient.getIdentity().getPrincipal().toText();
      updateIdentityDisplay(principal);
    }
  });
});

logoutButton.addEventListener("click", async () => {
  if (!logoutButton.classList.contains("disabled")) {
    await authClient.logout();
    userIsLoggedIn = false;
    profileName.textContent = "Guest";
    fullPrincipalSpan.textContent = "";
    tooltip.style.display = "none";
    logoutButton.classList.add("disabled");
    updateFavoritesUI(false);
  }
});

function updateIdentityDisplay(principal) {
  userIsLoggedIn = true;
  profileName.textContent = principal.slice(0, 12) + "...";
  profileName.dataset.fullPrincipal = principal;
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

// ================================
// Init
// ================================
initAuth();