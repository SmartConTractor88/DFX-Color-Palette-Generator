// ================================
// Imports
// ================================
import { backend } from 'declarations/backend';
import { AuthClient } from "@dfinity/auth-client";
import html2canvas from 'html2canvas';

// ================================
// Drag and Drop System
// ================================
let dragState = {
  isDragging: false,
  draggedElement: null,
  dragClone: null,
  startX: 0,
  startY: 0,
  originalIndex: 0,
  currentIndex: 0,
  paletteRect: null,
  offsetX: 0,
  offsetY: 0,
  originalTop: 0,
  originalLeft: 0,
  elementHeight: 0,
  elementWidth: 0,
  verticalMode: false
};

function initDragAndDrop() {
  const palette = document.querySelector('.palette');
  const colorDivs = document.querySelectorAll('.gen-color');
  
  colorDivs.forEach((div, index) => {
    const dragIcon = div.querySelector('.fa-left-right');
    if (dragIcon) {
      dragIcon.style.cursor = 'grab';
      dragIcon.title = 'Drag to reorder';
      
      // Clear existing event listeners
      dragIcon.onmousedown = null;
      dragIcon.onmouseenter = null;
      dragIcon.onmouseleave = null;
      dragIcon.ontouchstart = null;
      
      // Mouse events for desktop
      dragIcon.addEventListener('mousedown', (e) => startDrag(e, div, index));
      dragIcon.addEventListener('mouseenter', () => {
        if (!dragState.isDragging) {
          dragIcon.style.cursor = 'grabbing';
        }
      });
      dragIcon.addEventListener('mouseleave', () => {
        if (!dragState.isDragging) {
          dragIcon.style.cursor = 'grab';
        }
      });
      
      // Touch events for mobile - simplified approach
      dragIcon.addEventListener('touchstart', (e) => {
        // Simple touch handling without preventDefault
        if (e && e.touches && e.touches[0]) {
          const touch = e.touches[0];
          // Create a synthetic mouse event for compatibility
          const mouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {},
            stopPropagation: () => {}
          };
          startDrag(mouseEvent, div, index);
        }
      });
    }
  });
  
  // Mouse events for desktop
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', endDrag);
  
  // Touch events for mobile - simplified approach
  document.addEventListener('touchmove', (e) => {
    // Only handle if we're actually dragging
    if (dragState.isDragging && e && e.touches && e.touches[0]) {
      const touch = e.touches[0];
      // Create a synthetic mouse event for compatibility
      const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {}
      };
      handleDrag(mouseEvent);
    }
  });
  
  document.addEventListener('touchend', (e) => {
    // Only handle if we're actually dragging
    if (dragState.isDragging && e && e.changedTouches && e.changedTouches[0]) {
      const touch = e.changedTouches[0];
      // Create a synthetic mouse event for compatibility
      const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {}
      };
      endDrag(mouseEvent);
    }
  });
  
  // Ensure layout is correct after initialization
  enforceGenColorLayout();
}

// Add window resize listener to update layout when browser size changes
window.addEventListener('resize', () => {
  // Debounce the resize event to avoid excessive calls
  clearTimeout(window.resizeTimeout);
  window.resizeTimeout = setTimeout(() => {
    enforceGenColorLayout();
  }, 100);
});

function isVerticalMode() {
  return window.innerWidth <= 768;
}

function startDrag(e, element, index) {
  e.preventDefault();
  e.stopPropagation();
  
  dragState.isDragging = true;
  dragState.draggedElement = element;
  dragState.originalIndex = index;
  dragState.currentIndex = index;
  dragState.startX = e.clientX;
  dragState.startY = e.clientY;
  
  const palette = document.querySelector('.palette');
  dragState.paletteRect = palette.getBoundingClientRect();

  const rect = element.getBoundingClientRect();
  dragState.offsetX = e.clientX - rect.left;
  dragState.offsetY = e.clientY - rect.top;
  dragState.originalTop = rect.top;
  dragState.originalLeft = rect.left;
  dragState.elementHeight = rect.height;
  dragState.elementWidth = rect.width;
  dragState.verticalMode = isVerticalMode();
  
  // Always create drag clone for both modes
  createDragClone(element, rect);
  
  // Always make the original element transparent (no ghost)
  element.style.opacity = '0';
  element.style.transition = 'opacity 0.2s ease';
  element.style.pointerEvents = 'none';
  
  // Hide icons during drag - only show hex code
  const copyIcon = element.querySelector('.copy-icon');
  const dragIcon = element.querySelector('.fa-left-right');
  if (copyIcon) copyIcon.style.opacity = '0';
  if (dragIcon) {
    dragIcon.style.cursor = 'grabbing';
    dragIcon.style.opacity = '0';
  }
  
  // Force hide icons on mobile/tablet by overriding CSS !important
  if (window.innerWidth <= 768) {
    if (copyIcon) copyIcon.style.setProperty('opacity', '0', 'important');
    if (dragIcon) dragIcon.style.setProperty('opacity', '0', 'important');
  }
  
  document.body.style.userSelect = 'none';
}

function createDragClone(element, rect) {
  const clone = element.cloneNode(true);
  clone.style.position = 'fixed';
  clone.style.top = rect.top + 'px';
  clone.style.left = rect.left + 'px';
  clone.style.width = rect.width + 'px';
  clone.style.height = rect.height + 'px';
  clone.style.zIndex = '1000';
  clone.style.pointerEvents = 'none';
  clone.style.opacity = '1';
  clone.style.transition = 'none';
  clone.style.transform = 'none';
  
  // No shadow for any mode - cleaner look
  // clone.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
  
  if (dragState.dragClone) {
    dragState.dragClone.remove();
  }
  
  dragState.dragClone = clone;
  document.body.appendChild(clone);
}

function enforceGenColorLayout() {
  const colorDivs = document.querySelectorAll('.gen-color');
  colorDivs.forEach(div => {
    if (window.innerWidth <= 768) {
      // Force mobile layout with !important to override any CSS
      div.style.setProperty('display', 'flex', 'important');
      div.style.setProperty('flex-direction', 'row', 'important');
      div.style.setProperty('align-items', 'center', 'important');
      div.style.setProperty('justify-content', 'space-between', 'important');
      div.style.setProperty('padding', '0 12px', 'important');
    } else {
      // Desktop layout
      div.style.setProperty('display', 'flex', 'important');
      div.style.setProperty('flex-direction', 'column', 'important');
      div.style.setProperty('align-items', 'center', 'important');
      div.style.setProperty('justify-content', 'center', 'important');
    }
  });
}

function handleDrag(e) {
  if (!dragState.isDragging || !dragState.dragClone) return;

  requestAnimationFrame(() => {
    let newIndex;
    if (dragState.verticalMode) {
      const y = e.clientY - dragState.offsetY;
      dragState.dragClone.style.top = y + 'px';
      dragState.dragClone.style.left = dragState.originalLeft + 'px';
      dragState.dragClone.style.transform = 'none';
      newIndex = calculateNewIndexVertical(e.clientY);
    } else {
      const x = e.clientX - dragState.offsetX;
      dragState.dragClone.style.left = x + 'px';
      dragState.dragClone.style.top = dragState.originalTop + 'px';
      dragState.dragClone.style.transform = 'none';
      newIndex = calculateNewIndex(e.clientX);
    }

    if (newIndex !== dragState.currentIndex) {
      dragState.currentIndex = newIndex;
      updateVisualOrder();
    }
  });
}

function calculateNewIndex(mouseX) {
  const colorDivs = document.querySelectorAll('.gen-color');
  const paletteLeft = dragState.paletteRect.left;
  const paletteWidth = dragState.paletteRect.width;
  const colorWidth = paletteWidth / 5; // 20% each
  
  const relativeX = mouseX - paletteLeft;
  const newIndex = Math.floor(relativeX / colorWidth);
  
  return Math.max(0, Math.min(4, newIndex));
}

function calculateNewIndexVertical(mouseY) {
  const colorDivs = document.querySelectorAll('.gen-color');
  const numColors = colorDivs.length;
  const draggedCenter = mouseY - dragState.offsetY + dragState.elementHeight / 2;

  // Get the top and bottom of each color block
  const rects = Array.from(colorDivs).map(div => div.getBoundingClientRect());

  // If above the first block, return 0
  if (draggedCenter < rects[0].top + rects[0].height / 2) {
    return 0;
  }
  // If below the last block, return last index
  if (draggedCenter > rects[numColors - 1].top + rects[numColors - 1].height / 2) {
    return numColors - 1;
  }

  // Otherwise, find the correct zone
  for (let i = 0; i < numColors - 1; i++) {
    const currentCenter = rects[i].top + rects[i].height / 2;
    const nextCenter = rects[i + 1].top + rects[i + 1].height / 2;
    const boundary = (currentCenter + nextCenter) / 2;
    if (draggedCenter < boundary) {
      return i;
    }
  }
  return numColors - 1;
}

function updateVisualOrder() {
  const colorDivs = document.querySelectorAll('.gen-color');
  if (dragState.verticalMode) {
    const colorHeight = 100; // percent
    colorDivs.forEach((div, index) => {
      // Add smooth transition for vertical mode
      div.style.transition = 'transform 0.2s ease';
      
      if (index === dragState.originalIndex) {
        div.style.transform = 'translateY(0)';
      } else if (dragState.currentIndex > dragState.originalIndex) {
        if (index > dragState.originalIndex && index <= dragState.currentIndex) {
          div.style.transform = `translateY(-${colorHeight}%)`;
        } else {
          div.style.transform = 'translateY(0)';
        }
      } else if (dragState.currentIndex < dragState.originalIndex) {
        if (index >= dragState.currentIndex && index < dragState.originalIndex) {
          div.style.transform = `translateY(${colorHeight}%)`;
        } else {
          div.style.transform = 'translateY(0)';
        }
      }
    });
  } else {
    const colorWidth = 100; // percent (was 20, now 100 for full width slide)
    colorDivs.forEach((div, index) => {
      // Add smooth transition for horizontal mode
      div.style.transition = 'transform 0.2s ease';
      
      if (index === dragState.originalIndex) {
        div.style.transform = 'translateX(0)';
      } else if (dragState.currentIndex > dragState.originalIndex) {
        if (index > dragState.originalIndex && index <= dragState.currentIndex) {
          div.style.transform = `translateX(-${colorWidth}%)`;
        } else {
          div.style.transform = 'translateX(0)';
        }
      } else if (dragState.currentIndex < dragState.originalIndex) {
        if (index >= dragState.currentIndex && index < dragState.originalIndex) {
          div.style.transform = `translateX(${colorWidth}%)`;
        } else {
          div.style.transform = 'translateX(0)';
        }
      }
    });
  }
}

function endDrag(e) {
  if (!dragState.isDragging) return;
  
  if (dragState.currentIndex !== dragState.originalIndex) {
    reorderDOM();
  }
  
  cleanupDrag();
}

function reorderDOM() {
  const colorDivs = document.querySelectorAll('.gen-color');
  const palette = document.querySelector('.palette');

  // --- Fix: Remove transforms and transitions before DOM update ---
  colorDivs.forEach(div => {
    div.style.transition = 'none';
    div.style.transform = 'translateY(0)';
  });

  // Now update the DOM
  const elements = Array.from(colorDivs);
  const draggedElement = elements[dragState.originalIndex];

  elements.splice(dragState.originalIndex, 1);
  elements.splice(dragState.currentIndex, 0, draggedElement);

  palette.innerHTML = '';
  elements.forEach(element => {
    palette.appendChild(element);
  });

  // Restore transition after a frame for future drags
  const newColorDivs = document.querySelectorAll('.gen-color');
  requestAnimationFrame(() => {
    newColorDivs.forEach(div => {
      div.style.transition = 'transform 0.2s ease';
    });
  });

  // Immediately enforce layout, then reinitialize drag and drop
  enforceGenColorLayout();
  setTimeout(() => {
    initDragAndDrop();
  }, 10);
}

function cleanupDrag() {
  if (dragState.dragClone) {
    dragState.dragClone.remove();
    dragState.dragClone = null;
  }
  
  if (dragState.draggedElement) {
    // Always restore opacity (no ghost in any mode)
    dragState.draggedElement.style.opacity = '1';
    dragState.draggedElement.style.transition = 'opacity 0.2s ease';
    dragState.draggedElement.style.pointerEvents = '';
    
    // Show icons again after drag
    const copyIcon = dragState.draggedElement.querySelector('.copy-icon');
    const dragIcon = dragState.draggedElement.querySelector('.fa-left-right');
    if (copyIcon) copyIcon.style.opacity = '';
    if (dragIcon) {
      dragIcon.style.cursor = 'grab';
      dragIcon.style.opacity = '';
    }
    // Force show icons on mobile/tablet by overriding CSS !important
    if (window.innerWidth <= 768) {
      if (copyIcon) copyIcon.style.setProperty('opacity', '1', 'important');
      if (dragIcon) dragIcon.style.setProperty('opacity', '1', 'important');
    }
  }

  // --- Fix: Remove transition before resetting transform, then restore it after a frame ---
  const colorDivs = document.querySelectorAll('.gen-color');
  colorDivs.forEach(div => {
    if (dragState.verticalMode) {
      div.style.transition = 'none';
      div.style.transform = 'translateY(0)';
    } else {
      div.style.transition = 'none';
      div.style.transform = 'translateX(0)';
    }
  });
  // Restore transition after a frame for future drags
  requestAnimationFrame(() => {
    colorDivs.forEach(div => {
      if (dragState.verticalMode) {
        div.style.transition = 'transform 0.3s ease';
      } else {
        div.style.transition = 'transform 0.3s ease';
      }
    });
  });
  // --- End fix ---

  // Ensure layout is correct after cleanup
  enforceGenColorLayout();
  
  dragState = {
    isDragging: false,
    draggedElement: null,
    dragClone: null,
    startX: 0,
    startY: 0,
    originalIndex: 0,
    currentIndex: 0,
    paletteRect: null,
    offsetX: 0,
    offsetY: 0,
    originalTop: 0,
    originalLeft: 0,
    elementHeight: 0,
    elementWidth: 0,
    verticalMode: false
  };
  
  document.body.style.userSelect = '';
}

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
    colors = colors.map(c => mutateHexColor(c));
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
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.gap = "6px";

      const hexText = document.createElement("span");
      hexText.className = "hex-code";
      hexText.innerText = color.replace(/^#/, "");
      hexText.style.color = textColor;

      const copyIcon = document.createElement("i");
      copyIcon.className = "fas fa-copy copy-icon";
      copyIcon.style.color = textColor;
      copyIcon.title = "Copy to clipboard";
      copyIcon.onclick = () => {
        navigator.clipboard.writeText(color.toUpperCase()).then(() => {
          copyIcon.classList.replace("fa-copy", "fa-check");
          setTimeout(() => {
            copyIcon.classList.replace("fa-check", "fa-copy");
          }, 1000);
        });
      };

      const dragIcon = document.createElement("i");
      dragIcon.className = "fa-solid fa-left-right";
      dragIcon.style.color = textColor;
      dragIcon.style.fontSize = "1.2rem";
      dragIcon.title = "Drag to reorder";
      dragIcon.style.cursor = 'grab';

      if (window.innerWidth <= 768) {
        // On mobile/tablet, append directly to div for horizontal layout
        div.appendChild(hexText);
        div.appendChild(copyIcon);
        div.appendChild(dragIcon);
      } else {
        // On desktop, use vertical wrapper
        wrapper.appendChild(hexText);
        wrapper.appendChild(copyIcon);
        wrapper.appendChild(dragIcon);
        wrapper.style.flexDirection = "column";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "center";
        div.appendChild(wrapper);
      }
      // Remove these lines, layout is now handled by enforceGenColorLayout
      //div.style.display = "flex";
      //div.style.flexDirection = window.innerWidth <= 768 ? "row" : "column";
      //div.style.alignItems = "center";
      //div.style.justifyContent = window.innerWidth <= 768 ? "space-between" : "center";
    });
    enforceGenColorLayout();
    initDragAndDrop();
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
  const colorDivs = document.querySelectorAll(".gen-color");
  const paletteColors = Array.from(colorDivs, div => {
    const hexSpan = div.querySelector(".hex-code");
    return hexSpan ? ("#" + hexSpan.innerText.toUpperCase()) : null;
  }).filter(Boolean);
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

    const colorDivs = document.querySelectorAll(".gen-color");
    const current = Array.from(colorDivs, div => {
      const hexSpan = div.querySelector(".hex-code");
      return hexSpan ? ("#" + hexSpan.innerText.toUpperCase()) : null;
    }).filter(Boolean);
    const found = palettes.some(p => palettesMatch(p.colors, current));
    toggleLikeButton(found);
  } catch (err) {
    console.error("Error fetching favorites:", err);
  }
}

function palettesMatch(p1, p2) {
  if (!Array.isArray(p1) || !Array.isArray(p2)) return false;
  if (p1.length !== p2.length) return false;
  return p1.every((val, index) => val.toUpperCase() === p2[index].toUpperCase());
}

function updateFavoritesDropdown(palettes = []) {
  const dropdown = document.getElementById("favorites-dropdown");
  const scrollContainer = dropdown.querySelector(".favorites-scroll-container");
  if (!scrollContainer) {
    console.error("favorites-scroll-container not found in DOM!");
    return;
  }

  scrollContainer.innerHTML = "";

  dropdown.querySelectorAll(".favorites-header").forEach(header => header.remove());

  const header = document.createElement("div");
  header.className = "favorites-header";

  const title = document.createElement("span");
  title.textContent = "Your Favorite Palettes";
  title.className = "favorites-title";

  const deleteAllIcon = document.createElement("i");
  deleteAllIcon.className = "fas fa-trash-alt delete-all-icon";
  deleteAllIcon.title = "Delete All Favorites";

  deleteAllIcon.onclick = async () => {
    const items = scrollContainer.querySelectorAll(".favorite-item");
    items.forEach((item, i) => {
      setTimeout(() => {
        item.classList.add("fade-out");
      }, i * 80);
    });

    toggleLikeButton(false);

    try {
      const palettes = await backend.get_palettes();
      for (const p of palettes) {
        await backend.delete_palette(p.colors);
      }
      setTimeout(() => {
        const dropdown = document.getElementById("favorites-dropdown");
        const backdrop = document.getElementById("favorites-backdrop");
        const toggle = document.getElementById("favorites-dropdown-toggle");
        dropdown.classList.remove("show");
        if (backdrop) backdrop.classList.remove("active");
        toggle.classList.remove("rotated");
        fetchFavoritesFromBackend();
      }, 500);
    } catch (err) {
      console.error("Delete all error:", err);
      alert("Failed to delete all favorites: " + err.message);
    }
  };

  header.appendChild(title);
  header.appendChild(deleteAllIcon);
  dropdown.insertBefore(header, scrollContainer);

  if (palettes.length === 0) {
    scrollContainer.innerHTML = '<p class="dropdown-placeholder">No favorites saved yet.</p>';
    return;
  }

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

    palette.colors.forEach((color, i) => {
      const colorDiv = document.createElement("div");
      colorDiv.className = "color-box";
      colorDiv.style.backgroundColor = color;
      colorDiv.title = color;
      preview.appendChild(colorDiv);
    });

    const actions = document.createElement("div");
    actions.className = "favorite-actions";

    const expandIcon = document.createElement("i");
    expandIcon.className = "fas fa-expand expand-favorite";
    expandIcon.title = "Load Palette";
    expandIcon.onclick = () => {
      const colorDivs = document.querySelectorAll(".gen-color");
      palette.colors.forEach((color, i) => {
        const div = colorDivs[i];
        if (!div) return;
        div.innerHTML = "";
        div.style.backgroundColor = color;
        const textColor = chroma(color).luminance() > 0.5 ? "#000" : "#fff";
        const wrapper = document.createElement("div");
        wrapper.className = "hex-wrapper";
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.gap = "6px";
        const hexText = document.createElement("span");
        hexText.className = "hex-code";
        hexText.innerText = color.replace(/^#/, "");
        hexText.style.color = textColor;
        const copyIcon = document.createElement("i");
        copyIcon.className = "fas fa-copy copy-icon";
        copyIcon.style.color = textColor;
        copyIcon.title = "Copy to clipboard";
        copyIcon.onclick = () => {
          navigator.clipboard.writeText(color.toUpperCase()).then(() => {
            copyIcon.classList.replace("fa-copy", "fa-check");
            setTimeout(() => {
              copyIcon.classList.replace("fa-check", "fa-copy");
            }, 1000);
          });
        };
        const dragIcon = document.createElement("i");
        dragIcon.className = "fa-solid fa-left-right";
        dragIcon.style.color = textColor;
        dragIcon.style.fontSize = "1.2rem";
        dragIcon.title = "Drag to reorder";
        dragIcon.style.cursor = 'grab';

        if (window.innerWidth <= 768) {
          div.appendChild(hexText);
          div.appendChild(copyIcon);
          div.appendChild(dragIcon);
        } else {
          wrapper.appendChild(hexText);
          wrapper.appendChild(copyIcon);
          wrapper.appendChild(dragIcon);
          wrapper.style.flexDirection = "column";
          wrapper.style.alignItems = "center";
          wrapper.style.justifyContent = "center";
          div.appendChild(wrapper);
        }
        div.style.display = "flex";
        div.style.flexDirection = window.innerWidth <= 768 ? "row" : "column";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
      });
      const dropdown = document.getElementById("favorites-dropdown");
      const backdrop = document.getElementById("favorites-backdrop");
      const toggle = document.getElementById("favorites-dropdown-toggle");
      dropdown.classList.remove("show");
      if (backdrop) backdrop.classList.remove("active");
      toggle.classList.remove("rotated");
      toggleLikeButton(true);
      
      initDragAndDrop();
    };

    const deleteIcon = document.createElement("i");
    deleteIcon.className = "fas fa-trash-alt";
    deleteIcon.title = "Remove";
    deleteIcon.onclick = async () => {
      try {
        await backend.delete_palette(palette.colors);
        fetchFavoritesFromBackend();
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

  // Fallback: if nothing was rendered, show placeholder
  if (!scrollContainer.hasChildNodes()) {
    scrollContainer.innerHTML = '<p class="dropdown-placeholder">No favorites saved yet.</p>';
    console.warn("No favorites rendered, showing placeholder.");
  }
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
      if (isOpen) {
        favoritesBackdrop.classList.add("active");
      } else {
        favoritesBackdrop.classList.remove("active");
      }
      if (isOpen) {
        favoritesToggle.classList.add("rotated");
      } else {
        favoritesToggle.classList.remove("rotated");
      }
    });
  }
  await loadPalettes();
  generatePalette();
});

document.addEventListener("click", (e) => {
  const toggle = document.getElementById("favorites-dropdown-toggle");
  const dropdown = document.getElementById("favorites-dropdown");
  const backdrop = document.getElementById("favorites-backdrop");
  if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
    dropdown.classList.remove("show");
    if (backdrop) backdrop.classList.remove("active");
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

  const colorDivs = document.querySelectorAll(".gen-color");
  const paletteColors = Array.from(colorDivs, div => {
    const hexSpan = div.querySelector(".hex-code");
    return hexSpan ? ("#" + hexSpan.innerText.toUpperCase()) : null;
  }).filter(Boolean);
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
  if (isOpen) {
    userMenuBackdrop.classList.add("active");
  } else {
    userMenuBackdrop.classList.remove("active");
  }
});

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
    !userMenu.contains(e.target) &&
    !(logoutButton && logoutButton.contains(e.target))
  ) {
    dropdownMenu.classList.remove("show");
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

let tooltipHideTimeout = null;
let tooltipJustOpened = false;

const profileWrapper = document.querySelector('.profile-display-wrapper');

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

initAuth();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    generatePalette();
  });
} else {
  generatePalette();
}

const generateBtn = document.getElementById("generate");
if (generateBtn) {
  generateBtn.addEventListener("click", function(e) {
    // Remove any existing ripple
    const oldRipple = this.querySelector('.ripple');
    if (oldRipple) oldRipple.remove();

    const rect = this.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    // Calculate click position relative to button
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}
