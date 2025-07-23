// ================================
// Imports
// ================================
import { backend } from 'declarations/backend';
import { AuthClient } from "@dfinity/auth-client";
import html2canvas from 'html2canvas';

// ================================
// Global Variables
// ================================
let sidebarFavoritesSlider;
let sidebarFavoritesPalettes;
let sidebarFavoritesColors;

let isCurrentPaletteFavorite = false;

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
  verticalMode: false,
  placeholder: null
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
      
      // Touch events for mobile - use only clientX/clientY for correct coordinates
      dragIcon.addEventListener('touchstart', (e) => {
        if (e && e.touches && e.touches[0]) {
          const touch = e.touches[0];
          // Use only clientX/clientY for mobile
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
  
  // Touch events for mobile - use only clientX/clientY for correct coordinates
  document.addEventListener('touchmove', (e) => {
    if (dragState.isDragging && e && e.touches && e.touches[0]) {
      e.preventDefault(); // Prevent browser scroll/interference
      const touch = e.touches[0];
      const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {}
      };
      handleDrag(mouseEvent);
    }
  }, { passive: false });
  
  document.addEventListener('touchstart', (e) => {
    if (dragState.isDragging && e && e.touches && e.touches[0]) {
      e.preventDefault(); // Prevent browser scroll/interference
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (dragState.isDragging && e && e.changedTouches && e.changedTouches[0]) {
      e.preventDefault(); // Prevent browser scroll/interference
      const touch = e.changedTouches[0];
      const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {}
      };
      endDrag(mouseEvent);
    }
  }, { passive: false });
  
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
  dragState.currentIndex = index; // Start at the same position
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
  
  // Make the original element transparent
  element.style.opacity = '0';
  element.style.transition = 'opacity 0.2s ease';
  element.style.pointerEvents = 'none';
  
  // Hide icons during drag - only show hex code
  const copyIcon = element.querySelector('.copy-icon');
  const dragIcon = element.querySelector('.fa-left-right');
  const heartIcon = element.querySelector('.color-heart-icon');
  const lockIcon = element.querySelector('.lock-icon');
  if (copyIcon) copyIcon.style.opacity = '0';
  if (dragIcon) {
    dragIcon.style.cursor = 'grabbing';
    dragIcon.style.opacity = '0';
  }
  if (heartIcon) heartIcon.style.opacity = '0';
  if (lockIcon) lockIcon.style.opacity = '0';
  
  // Force hide icons on mobile/tablet by overriding CSS !important
  if (window.innerWidth <= 768) {
    if (copyIcon) copyIcon.style.setProperty('opacity', '0', 'important');
    if (dragIcon) dragIcon.style.setProperty('opacity', '0', 'important');
    if (heartIcon) heartIcon.style.setProperty('opacity', '0', 'important');
    if (lockIcon) lockIcon.style.setProperty('opacity', '0', 'important');
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
      newIndex = calculateNewIndexVertical(e.clientY); // Pass finger position directly
    } else {
      const x = e.clientX - dragState.offsetX;
      dragState.dragClone.style.left = x + 'px';
      dragState.dragClone.style.top = dragState.originalTop + 'px';
      dragState.dragClone.style.transform = 'none';
      newIndex = calculateNewIndex(e.clientX);
    }

    // Only update visual order if the index actually changed AND we've moved enough
    const moveDistance = Math.abs(e.clientY - dragState.startY) + Math.abs(e.clientX - dragState.startX);
    const minMoveThreshold = 10; // pixels
    
    if (newIndex !== dragState.currentIndex && moveDistance > minMoveThreshold) {
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

function calculateNewIndexVertical(clientY) {
  const colorDivs = document.querySelectorAll('.gen-color');
  const paletteTop = dragState.paletteRect.top;
  const paletteHeight = dragState.paletteRect.height;
  const colorHeight = paletteHeight / 5; // 20% each, same as horizontal
  
  const relativeY = clientY - paletteTop;
  const newIndex = Math.floor(relativeY / colorHeight);
  
  return Math.max(0, Math.min(4, newIndex));
}

function updateVisualOrder() {
  const colorDivs = document.querySelectorAll('.gen-color');
  if (dragState.verticalMode) {
    // Calculate the pixel height of the dragged block
    const heights = Array.from(colorDivs).map(div => div.getBoundingClientRect().height);
    const draggedHeight = heights[dragState.originalIndex];
    colorDivs.forEach((div, index) => {
      div.style.transition = 'transform 0.2s ease';
      if (index === dragState.originalIndex) {
        div.style.transform = 'translateY(0)';
      } else if (dragState.currentIndex > dragState.originalIndex) {
        if (index > dragState.originalIndex && index <= dragState.currentIndex) {
          div.style.transform = `translateY(-${draggedHeight}px)`;
        } else {
          div.style.transform = 'translateY(0)';
        }
      } else if (dragState.currentIndex < dragState.originalIndex) {
        if (index >= dragState.currentIndex && index < dragState.originalIndex) {
          div.style.transform = `translateY(${draggedHeight}px)`;
        } else {
          div.style.transform = 'translateY(0)';
        }
      } else {
        div.style.transform = 'translateY(0)';
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
      } else {
        div.style.transform = 'translateX(0)';
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
  elements.forEach((element, i) => {
    palette.appendChild(element);
  });

  // --- Update paletteState to match new DOM order (by reference, not data-index) ---
  // Attach paletteState reference to each .gen-color div during rendering
  const newOrder = Array.from(palette.querySelectorAll('.gen-color')).map(div => div._paletteStateRef);
  if (newOrder.length === paletteState.length && newOrder.every(Boolean)) {
    paletteState = newOrder;
  }

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
    // Restore the original element - same as horizontal
    dragState.draggedElement.style.opacity = '1';
    dragState.draggedElement.style.transition = 'opacity 0.2s ease';
    dragState.draggedElement.style.pointerEvents = '';
    
    // Show icons again after drag
    const copyIcon = dragState.draggedElement.querySelector('.copy-icon');
    const dragIcon = dragState.draggedElement.querySelector('.fa-left-right');
    const heartIcon = dragState.draggedElement.querySelector('.color-heart-icon');
    const lockIcon = dragState.draggedElement.querySelector('.lock-icon');
    if (copyIcon) copyIcon.style.opacity = '';
    if (dragIcon) {
      dragIcon.style.cursor = 'grab';
      dragIcon.style.opacity = '';
    }
    if (heartIcon) heartIcon.style.opacity = '';
    if (lockIcon) lockIcon.style.opacity = '';
    // Force show icons on mobile/tablet by overriding CSS !important
    if (window.innerWidth <= 768) {
      if (copyIcon) copyIcon.style.setProperty('opacity', '1', 'important');
      if (dragIcon) dragIcon.style.setProperty('opacity', '1', 'important');
      if (heartIcon) heartIcon.style.setProperty('opacity', '1', 'important');
      if (lockIcon) lockIcon.style.setProperty('opacity', '1', 'important');
    }
  }

  // Remove transition before resetting transform, then restore it after a frame
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

// Global palette state: 5 objects { color: '#RRGGBB', isLocked: false }
let paletteState = null;

function syncPaletteStateToDOMOrder() {
  const colorDivs = document.querySelectorAll('.gen-color');
  if (!paletteState || paletteState.length !== colorDivs.length) return;
  const newOrder = Array.from(colorDivs).map(div => div._paletteStateRef);
  if (newOrder.length === paletteState.length && newOrder.every(Boolean)) {
    paletteState = newOrder;
  }
}

function generateRandomHexColor() {
  // Generate a random hex color string
  const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  return '#' + hex.toUpperCase();
}

function generatePalette() {
  syncPaletteStateToDOMOrder();
  try {
    const colorDivs = document.querySelectorAll('.gen-color');
    colorDivs.forEach(div => div.classList.add('loading'));

    // --- PALETTE STATE LOGIC ---
    // 1. If paletteState doesn't exist, create it with 5 random colors, all unlocked
    if (!paletteState || paletteState.length !== 5) {
      paletteState = Array.from({ length: 5 }, () => ({ color: generateRandomHexColor(), isLocked: false }));
    }

    // 2. Only update the color of unlocked entries in paletteState
    paletteState.forEach((entry, i) => {
      if (!entry.isLocked) {
        entry.color = generateRandomHexColor();
      }
    });

    // 3. Update the .gen-color divs in DOM order, applying paletteState in order
    colorDivs.forEach((div, i) => {
      const entry = paletteState[i];
      if (!entry || !div) return;
      // Attach paletteState reference to the div for drag reordering
      div._paletteStateRef = entry;
      // Sync lock state to div
      div.dataset.locked = entry.isLocked;
      // Set background color
      div.style.backgroundColor = entry.color;
      // Remove loading class
      div.classList.remove('loading');
      // --- Restore DOM content: hex code, icons, etc. ---
      div.innerHTML = '';
      const textColor = chroma(entry.color).luminance() > 0.5 ? '#000' : '#fff';
      const wrapper = document.createElement('div');
      wrapper.className = 'hex-wrapper';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '6.6px';
      // --- HEX CODE DISPLAY/EDIT LOGIC ---
      const hexText = document.createElement('span');
      hexText.className = 'hex-code';
      hexText.innerText = entry.color.replace(/^#/, '').toUpperCase();
      hexText.style.color = textColor;
      hexText.tabIndex = 0;
      hexText.addEventListener('click', () => switchToInput());
      hexText.addEventListener('touchend', (e) => {
        if (e.cancelable && e.touches && e.touches.length > 0) {
          e.preventDefault();
        }
        switchToInput();
      });
      hexText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          switchToInput();
        }
      });
      function switchToInput() {
        const input = document.createElement('input');
        input.className = 'hex-input';
        input.type = 'text';
        input.maxLength = 6;
        input.value = hexText.innerText;
        input.style.color = textColor;
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.inputMode = 'text';
        input.pattern = '[0-9A-Fa-f]{0,6}';
        input.title = 'Edit color (hex)';
        hexText.replaceWith(input);
        input.focus();
        input.select();
        input.addEventListener('input', () => {
          let val = input.value.toUpperCase().replace(/[^0-9A-F]/g, '');
          if (val.length > 6) val = val.slice(0, 6);
          input.value = val;
          let padded = val.padEnd(6, '0');
          div.style.backgroundColor = '#' + padded;
          const liveTextColor = chroma('#' + padded).luminance() > 0.5 ? '#000' : '#fff';
          input.style.color = liveTextColor;
          copyIcon.style.color = liveTextColor;
          dragIcon.style.color = liveTextColor;
          heartIcon.style.color = liveTextColor;
          lockIcon.style.color = liveTextColor;
          if (likeButton.classList.contains('fas')) {
            toggleLikeButton(false);
          }
          if (userIsLoggedIn && val.length === 6) {
            const favoriteHexCodes = sidebarFavoriteColors.map(c => c.hex_code.toUpperCase());
            if (favoriteHexCodes.includes(val)) {
              heartIcon.classList.remove('far');
              heartIcon.classList.add('fas');
            } else {
              heartIcon.classList.remove('fas');
              heartIcon.classList.add('far');
            }
          }
          if (userIsLoggedIn) {
            const currentHexes = getCurrentPaletteHexes();
            isCurrentPaletteFavorite = sidebarFavoritePalettes.some(p => palettesMatch(p.colors, currentHexes));
            toggleLikeButton(isCurrentPaletteFavorite);
          }
        });
        input.addEventListener('paste', (e) => {
          e.preventDefault();
          let text = (e.clipboardData || window.clipboardData).getData('text');
          text = text.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6);
          document.execCommand('insertText', false, text);
        });
        function commit() {
          let val = input.value.toUpperCase().replace(/[^0-9A-F]/g, '');
          // Always pad to 6 characters with zeros
          val = val.padEnd(6, '0');
          hexText.innerText = val;
          div.style.backgroundColor = '#' + val;
          const liveTextColor = chroma('#' + val).luminance() > 0.5 ? '#000' : '#fff';
          hexText.style.color = liveTextColor;
          copyIcon.style.color = liveTextColor;
          dragIcon.style.color = liveTextColor;
          heartIcon.style.color = liveTextColor;
          lockIcon.style.color = liveTextColor;
          if (userIsLoggedIn) {
            const favoriteHexCodes = sidebarFavoriteColors.map(c => c.hex_code.toUpperCase());
            if (favoriteHexCodes.includes(val)) {
              heartIcon.classList.remove('far');
              heartIcon.classList.add('fas');
            } else {
              heartIcon.classList.remove('fas');
              heartIcon.classList.add('far');
            }
          }
          // --- FIX: If locked, update paletteState color to new value ---
          if (Array.isArray(paletteState) && paletteState[i] && paletteState[i].isLocked) {
            paletteState[i].color = '#' + val;
          }
          input.replaceWith(hexText);
        }
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            commit();
          }
        });
      }
      // --- End HEX CODE DISPLAY/EDIT LOGIC ---
      const copyIcon = document.createElement('i');
      copyIcon.className = 'fas fa-copy copy-icon';
      copyIcon.style.color = textColor;
      copyIcon.title = 'Copy to clipboard';
      copyIcon.onclick = () => {
        let hexValue = null;
        const input = div.querySelector('.hex-input');
        const span = div.querySelector('.hex-code');
        if (input && document.activeElement === input) {
          hexValue = input.value.toUpperCase();
        } else if (span) {
          hexValue = span.innerText.toUpperCase();
        }
        if (hexValue && hexValue.length > 0) {
          navigator.clipboard.writeText(hexValue).then(() => {
            copyIcon.classList.replace('fa-copy', 'fa-check');
            setTimeout(() => {
              copyIcon.classList.replace('fa-check', 'fa-copy');
            }, 1000);
          });
        }
      };
      const dragIcon = document.createElement('i');
      dragIcon.className = 'fa-solid fa-left-right';
      dragIcon.style.color = textColor;
      dragIcon.style.fontSize = '1.2rem';
      dragIcon.title = 'Drag to reorder';
      dragIcon.style.cursor = 'grab';
      const lockIcon = document.createElement('i');
      lockIcon.className = 'fa-solid fa-lock-open lock-icon';
      lockIcon.style.color = textColor;
      lockIcon.title = 'Lock color';
      const heartIcon = document.createElement('i');
      heartIcon.className = 'far fa-heart color-heart-icon';
      heartIcon.style.color = textColor;
      heartIcon.title = 'Save color to favorites';
      if (userIsLoggedIn) {
        heartIcon.style.display = 'block';
        heartIcon.classList.remove('hidden');
        const currentHexCode = entry.color.replace(/^#/, '').toUpperCase();
        const favoriteHexCodes = sidebarFavoriteColors.map(c => c.hex_code.toUpperCase());
        if (favoriteHexCodes.includes(currentHexCode)) {
          heartIcon.classList.remove('far');
          heartIcon.classList.add('fas');
        }
        // --- Add click event handler for heart icon ---
        heartIcon.onclick = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!userIsLoggedIn) {
            alert('Please log in to save favorite colors.');
            return;
          }
          // Get current hex value from input or span
          let currentHexCode = null;
          const input = div.querySelector('.hex-input');
          const span = div.querySelector('.hex-code');
          if (input && document.activeElement === input) {
            currentHexCode = input.value.toUpperCase();
          } else if (span) {
            currentHexCode = span.innerText.toUpperCase();
          } else {
            currentHexCode = entry.color.replace(/^#/, '').toUpperCase();
          }
          if (!currentHexCode || currentHexCode.length === 0) {
            alert('Invalid color code.');
            return;
          }
          const isLiked = heartIcon.classList.contains('fas');
          if (isLiked) {
            // Remove from favorites
            heartIcon.classList.remove('fas');
            heartIcon.classList.add('far');
            try {
              await backend.delete_color(currentHexCode);
              sidebarFavoriteColors = sidebarFavoriteColors.filter(c => c.hex_code.toUpperCase() !== currentHexCode);
              updateAllHeartIconsForColor(currentHexCode, false);
            } catch (err) {
              heartIcon.classList.remove('far');
              heartIcon.classList.add('fas');
              alert('Failed to remove color from favorites: ' + err.message);
            }
          } else {
            // Add to favorites
            heartIcon.classList.remove('far');
            heartIcon.classList.add('fas');
            try {
              await backend.add_color(currentHexCode);
              sidebarFavoriteColors.push({ hex_code: currentHexCode });
              updateAllHeartIconsForColor(currentHexCode, true);
            } catch (err) {
              heartIcon.classList.remove('fas');
              heartIcon.classList.add('far');
              alert('Failed to save color to favorites: ' + err.message);
            }
          }
        };
      } else {
        heartIcon.style.display = 'none';
        heartIcon.classList.add('hidden');
      }
      let isLocked = div.dataset.locked === 'true';
      if (isLocked) {
        lockIcon.classList.remove('fa-lock-open');
        lockIcon.classList.add('fa-lock');
        lockIcon.title = 'Unlock color';
      }
      lockIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isLocked = !isLocked;
        div.dataset.locked = isLocked;
        // --- FIX: persist lock state and color in paletteState ---
        if (Array.isArray(paletteState) && paletteState[i]) {
          paletteState[i].isLocked = isLocked;
          if (isLocked) {
            // Save the current color as the locked color
            let currentColor = null;
            // Prefer input value if present and valid
            const input = div.querySelector('.hex-input');
            if (input && input.value && input.value.length > 0) {
              let val = input.value.toUpperCase().replace(/[^0-9A-F]/g, '');
              if (val.length === 6) {
                currentColor = '#' + val;
              } else if (val.length > 0) {
                currentColor = '#' + val.padEnd(6, '0');
              }
            }
            // Fallback to background color if no valid input
            if (!currentColor) {
              currentColor = div.style.backgroundColor;
              // Convert rgb to hex if needed
              if (currentColor.startsWith('rgb')) {
                const rgb = currentColor.match(/\d+/g);
                if (rgb && rgb.length >= 3) {
                  currentColor = '#' + rgb.slice(0,3).map(x => (+x).toString(16).padStart(2, '0')).join('').toUpperCase();
                }
              }
            }
            paletteState[i].color = currentColor;
          }
        }
        if (isLocked) {
          lockIcon.classList.remove('fa-lock-open');
          lockIcon.classList.add('fa-lock');
          lockIcon.title = 'Unlock color';
        } else {
          lockIcon.classList.remove('fa-lock');
          lockIcon.classList.add('fa-lock-open');
          lockIcon.title = 'Lock color';
        }
      });
      if (window.innerWidth <= 768) {
        const left = document.createElement('div');
        left.className = 'hex-left';
        left.style.display = 'flex';
        left.style.alignItems = 'center';
        left.style.flex = '1 1 auto';
        left.appendChild(hexText);
        const right = document.createElement('div');
        right.className = 'hex-right';
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        right.style.gap = '12px';
        right.style.flex = '0 0 auto';
        right.appendChild(copyIcon);
        right.appendChild(dragIcon);
        right.appendChild(lockIcon);
        right.appendChild(heartIcon);
        div.appendChild(left);
        div.appendChild(right);
      } else {
        wrapper.appendChild(hexText);
        wrapper.appendChild(copyIcon);
        wrapper.appendChild(dragIcon);
        wrapper.appendChild(lockIcon);
        wrapper.appendChild(heartIcon);
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        div.appendChild(wrapper);
      }
    });
    enforceGenColorLayout();
    initDragAndDrop();
  } catch (e) {
    console.error('Error generating palette:', e);
  }
}

function getCurrentPaletteHexes() {
  const colorDivs = document.querySelectorAll(".gen-color");
  const hexes = Array.from(colorDivs, div => {
    const span = div.querySelector(".hex-code");
    if (span) {
      return "#" + span.innerText.toUpperCase();
    }
    const input = div.querySelector(".hex-input");
    if (input) {
      return "#" + input.value.toUpperCase().padEnd(6, "0");
    }
    return null;
  }).filter(Boolean);
  return hexes;
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
  // Hide all icons in .gen-color divs before rendering
  const iconSelectors = [
    '.copy-icon',
    '.fa-left-right',
    '.lock-icon',
    '.color-heart-icon'
  ];
  const hiddenIcons = [];
  iconSelectors.forEach(selector => {
    document.querySelectorAll('.gen-color ' + selector).forEach(icon => {
      hiddenIcons.push({ icon, prev: icon.style.display });
      icon.style.display = 'none';
    });
  });
  // For mobile/vertical layout, also hide the entire .hex-right container
  const hexRightDivs = document.querySelectorAll('.gen-color .hex-right');
  hexRightDivs.forEach(div => {
    hiddenIcons.push({ icon: div, prev: div.style.display });
    div.style.display = 'none';
  });
  // Render palette to canvas
  html2canvas(palette, { backgroundColor: null, scale: 2 }).then(canvas => {
    // Restore icons and .hex-right containers
    hiddenIcons.forEach(({ icon, prev }) => {
      icon.style.display = prev;
    });
    const link = document.createElement("a");
    link.download = "huehut_palette.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
});

document.getElementById("list-button").addEventListener("click", () => {
  if (!userIsLoggedIn) {
    alert("Please log in to access this feature.");
    return;
  }
  openSidebarFavorites();
});

// ================================
// Sidebar Management
// ================================
// Pill toggle logic for sidebar-favorites
const pillPalettes = document.getElementById('pill-palettes');
const pillColors = document.getElementById('pill-colors');
const pillSlider = document.getElementById('pill-slider');
const sidebarFavoritesList = document.getElementById('sidebar-favorites-list');

const palettesList = [
  '<p class="sidebar-favorites-placeholder">No favorite palettes yet.</p>'
];
const colorsList = [
  '<p class="sidebar-favorites-placeholder">No favorite colors yet.</p>'
];

function setPillSliderToButton(button) {
  const pillToggleRect = document.getElementById('pill-toggle').getBoundingClientRect();
  const btnRect = button.getBoundingClientRect();
  const expand = 6; // px
  pillSlider.style.width = (btnRect.width + expand) + 'px';
  pillSlider.style.height = (btnRect.height + expand) + 'px';
  pillSlider.style.left = (btnRect.left - pillToggleRect.left - expand/2) + 'px';
  pillSlider.style.top = (btnRect.top - pillToggleRect.top - expand/2) + 'px';
}

// Store palettes and colors for sidebar-favorites
let sidebarFavoritePalettes = [];
let sidebarFavoriteColors = [];

// Fetch palettes for sidebar-favorites
async function fetchSidebarFavoritePalettes() {
  try {
    const palettes = await backend.get_palettes();
    sidebarFavoritePalettes = palettes;
    renderSidebarFavoritePalettes();
  } catch (err) {
    sidebarFavoritePalettes = [];
    renderSidebarFavoritePalettes();
  }
}

// Fetch colors for sidebar-favorites
async function fetchSidebarFavoriteColors() {
  try {
    const colors = await backend.get_colors();
    sidebarFavoriteColors = colors;
    renderSidebarFavoriteColors();
  } catch (err) {
    sidebarFavoriteColors = [];
    renderSidebarFavoriteColors();
  }
}

// Fetch all favorites from backend
async function fetchFavoriteColorsFromBackend() {
  try {
    const colors = await backend.get_colors();
    sidebarFavoriteColors = colors;
    updateHeartIconsForColors(colors);
    // Rebuild .gen-color icons after favorites are loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      rebuildGenColorDOMForLayout();
    }
  } catch (err) {
    console.error("Error fetching favorite colors:", err);
    sidebarFavoriteColors = [];
  }
}

function renderSidebarFavoritePalettes() {
  // Remove the pill active check - always render
  if (!sidebarFavoritesPalettes) return;
  
  if (!sidebarFavoritePalettes || sidebarFavoritePalettes.length === 0) {
    sidebarFavoritesPalettes.innerHTML = '<p class="sidebar-favorites-placeholder fade-in">No favorite palettes yet.</p>';
    return;
  }
  sidebarFavoritesPalettes.innerHTML = sidebarFavoritePalettes.map((palette, idx) => {
    const colors = (palette.colors || []).map(color => `<div class="sidebar-fav-color-box" style="background:${color}"></div>`).join('');
    // Use a unique id for the input
    return `
      <div class="sidebar-fav-palette-card" data-idx="${idx}">
        <div class="sidebar-fav-palette-header">
          <input class="sidebar-fav-palette-title-input" value="${palette.title || 'Untitled'}" data-idx="${idx}" />
          <div class="sidebar-fav-palette-actions">
            <i class="fas fa-expand sidebar-fav-expand-btn" title="Load Palette" data-idx="${idx}"></i>
            <i class="fas fa-trash-alt sidebar-fav-delete-btn" title="Remove" data-idx="${idx}"></i>
          </div>
        </div>
        <div class="sidebar-fav-palette-colors">${colors}</div>
      </div>
    `;
  }).join('');

  // Add event listeners for title editing
  document.querySelectorAll('.sidebar-fav-palette-title-input').forEach(input => {
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    });
    input.addEventListener('blur', async (e) => {
      const idx = parseInt(input.dataset.idx, 10);
      const palette = sidebarFavoritePalettes[idx];
      const newTitle = input.value.trim() || 'Untitled';
      if (newTitle !== palette.title) {
        const oldTitle = palette.title;
        input.disabled = true;
        try {
          await backend.update_palette_title(palette.colors, newTitle);
          palette.title = newTitle;
        } catch (err) {
          alert('Failed to update title.');
          input.value = oldTitle;
        }
        input.disabled = false;
      }
    });
  });

  // Add event listeners for expand button
  document.querySelectorAll('.sidebar-fav-expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.idx, 10);
      const palette = sidebarFavoritePalettes[idx];
      loadPaletteToMain(palette);
      closeSidebarFavorites();
    });
  });

  // Add event listeners for delete button
  document.querySelectorAll('.sidebar-fav-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(btn.dataset.idx, 10);
      const palette = sidebarFavoritePalettes[idx];
      const card = btn.closest('.sidebar-fav-palette-card');
      // Animate out
      card.classList.add('fade-out');
      // Remove from array immediately so it never reappears
      sidebarFavoritePalettes.splice(idx, 1);
      // After animation, re-render
      setTimeout(() => {
        renderSidebarFavoritePalettes();
        // If no palettes left, fade in placeholder
        if (sidebarFavoritePalettes.length === 0) {
          const placeholder = document.querySelector('.sidebar-favorites-placeholder');
          if (placeholder) {
            setTimeout(() => placeholder.classList.add('fade-in'), 10);
          }
        }
      }, 400);
      // Call backend (after UI update for UX)
      try {
        await backend.delete_palette(palette.colors);
        fetchFavoritesFromBackend(); // Also update dropdown
      } catch (err) {
        // Optionally show error, but do not re-add palette to UI
        alert('Failed to delete palette.');
      }
    });
  });
}

// Function to load a palette to the main area (same logic as dropdown)
function loadPaletteToMain(palette) {
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
    // Attach event listeners BEFORE appending to DOM
    hexText.tabIndex = 0;
    hexText.addEventListener("click", () => switchToInput());
    hexText.addEventListener("touchend", (e) => {
      if (e.cancelable && e.touches && e.touches.length > 0) {
        e.preventDefault();
      }
      switchToInput();
    });
    hexText.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        switchToInput();
      }
    });
    const copyIcon = document.createElement("i");
    copyIcon.className = "fas fa-copy copy-icon";
    copyIcon.style.color = textColor;
    copyIcon.title = "Copy to clipboard";
    copyIcon.onclick = () => {
      navigator.clipboard.writeText(color.replace(/^#/, "").toUpperCase()).then(() => {
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

    // Create lock icon for locking color
    const lockIcon = document.createElement("i");
    lockIcon.className = "fa-solid fa-lock-open lock-icon";
    lockIcon.style.color = textColor;
    lockIcon.title = "Lock color";
    // (No logic yet)

    // Create heart icon for individual color favorites
    const heartIcon = document.createElement("i");
    heartIcon.className = "far fa-heart color-heart-icon";
    heartIcon.style.color = textColor;
    heartIcon.title = "Save color to favorites";
    if (userIsLoggedIn) {
      heartIcon.style.display = "block";
      heartIcon.classList.remove('hidden');
      // Check if this color is already in favorites
      const currentHexCode = color.replace(/^#/, "").toUpperCase();
      const favoriteHexCodes = sidebarFavoriteColors.map(c => c.hex_code.toUpperCase());
      if (favoriteHexCodes.includes(currentHexCode)) {
        heartIcon.classList.remove('far');
        heartIcon.classList.add('fas');
      }
    } else {
      heartIcon.style.display = "none";
      heartIcon.classList.add('hidden');
    }
    
    // Add click event for heart icon
    heartIcon.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!userIsLoggedIn) {
        alert("Please log in to save favorite colors.");
        return;
      }
      
      // Get current hex value from input or span
      let currentHexCode = null;
      const input = div.querySelector(".hex-input");
      const span = div.querySelector(".hex-code");
      if (input && document.activeElement === input) {
        currentHexCode = input.value.toUpperCase();
      } else if (span) {
        currentHexCode = span.innerText.toUpperCase();
      }
      
      if (!currentHexCode || currentHexCode.length === 0) {
        alert("Invalid color code.");
        return;
      }
      
      const isLiked = heartIcon.classList.contains("fas");
      
      if (isLiked) {
        // Remove from favorites
        heartIcon.classList.remove("fas");
        heartIcon.classList.add("far");
        try {
          await backend.delete_color(currentHexCode);
          // Update local state immediately to prevent flicker
          sidebarFavoriteColors = sidebarFavoriteColors.filter(c => c.hex_code.toUpperCase() !== currentHexCode);
          // Update all heart icons for this color across all .gen-color divs
          updateAllHeartIconsForColor(currentHexCode, false);
        } catch (err) {
          heartIcon.classList.remove("far");
          heartIcon.classList.add("fas");
          alert("Failed to remove color from favorites: " + err.message);
        }
      } else {
        // Add to favorites
        heartIcon.classList.remove("far");
        heartIcon.classList.add("fas");
        try {
          await backend.add_color(currentHexCode);
          // Update local state immediately
          sidebarFavoriteColors.push({ hex_code: currentHexCode });
          // Update all heart icons for this color across all .gen-color divs
          updateAllHeartIconsForColor(currentHexCode, true);
        } catch (err) {
          heartIcon.classList.remove("fas");
          heartIcon.classList.add("far");
          alert("Failed to save color to favorites: " + err.message);
        }
      }
    });

    // Lock state for this color block (must be after heartIcon is created)
    let isLocked = div.dataset.locked === 'true';
    if (isLocked) {
      lockIcon.classList.remove('fa-lock-open');
      lockIcon.classList.add('fa-lock');
      lockIcon.title = 'Unlock color';
    }
    lockIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isLocked = !isLocked;
      div.dataset.locked = isLocked;
      // --- FIX: persist lock state and color in paletteState ---
      if (Array.isArray(paletteState) && paletteState[i]) {
        paletteState[i].isLocked = isLocked;
        if (isLocked) {
          // Save the current color as the locked color
          let currentColor = null;
          // Prefer input value if present and valid
          const input = div.querySelector('.hex-input');
          if (input && input.value && input.value.length > 0) {
            let val = input.value.toUpperCase().replace(/[^0-9A-F]/g, '');
            if (val.length === 6) {
              currentColor = '#' + val;
            } else if (val.length > 0) {
              currentColor = '#' + val.padEnd(6, '0');
            }
          }
          // Fallback to background color if no valid input
          if (!currentColor) {
            currentColor = div.style.backgroundColor;
            // Convert rgb to hex if needed
            if (currentColor.startsWith('rgb')) {
              const rgb = currentColor.match(/\d+/g);
              if (rgb && rgb.length >= 3) {
                currentColor = '#' + rgb.slice(0,3).map(x => (+x).toString(16).padStart(2, '0')).join('').toUpperCase();
              }
            }
          }
          paletteState[i].color = currentColor;
        }
      }
      if (isLocked) {
        lockIcon.classList.remove('fa-lock-open');
        lockIcon.classList.add('fa-lock');
        lockIcon.title = 'Unlock color';
      } else {
        lockIcon.classList.remove('fa-lock');
        lockIcon.classList.add('fa-lock-open');
        lockIcon.title = 'Lock color';
      }
    });

    // Append icons in correct order
    if (window.innerWidth <= 768) {
      // On mobile/tablet, use two containers for left/right alignment
      const left = document.createElement("div");
      left.className = "hex-left";
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.flex = "1 1 auto";
      left.appendChild(hexText);

      const right = document.createElement("div");
      right.className = "hex-right";
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.gap = "12px";
      right.style.flex = "0 0 auto";
      right.appendChild(copyIcon);
      right.appendChild(dragIcon);
      right.appendChild(lockIcon);
      right.appendChild(heartIcon);

      div.appendChild(left);
      div.appendChild(right);
    } else {
      wrapper.appendChild(hexText);
      wrapper.appendChild(copyIcon);
      wrapper.appendChild(dragIcon);
      wrapper.appendChild(lockIcon);
      wrapper.appendChild(heartIcon);
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
  toggleLikeButton(true);
  initDragAndDrop();
}

// Helper to show the correct panel
function setSidebarPanel(section) {
  const palettesPanel = document.getElementById('sidebar-favorites-palettes');
  const colorsPanel = document.getElementById('sidebar-favorites-colors');
  
  if (!palettesPanel || !colorsPanel) return;
  
  if (section === 'palettes') {
    palettesPanel.classList.add('active');
    colorsPanel.classList.remove('active');
  } else {
    palettesPanel.classList.remove('active');
    colorsPanel.classList.add('active');
  }
}

function setPillSelected(option) {
  if (option === 'palettes') {
    pillPalettes.classList.add('active');
    pillColors.classList.remove('active');
    setPillSliderToButton(pillPalettes);
    // Add small delay for smooth animation
    setTimeout(() => setSidebarPanel('palettes'), 50);
  } else {
    pillPalettes.classList.remove('active');
    pillColors.classList.add('active');
    setPillSliderToButton(pillColors);
    // Add small delay for smooth animation
    setTimeout(() => setSidebarPanel('colors'), 50);
  }
}

// On window resize, keep slider in sync
window.addEventListener('resize', () => {
  if (pillPalettes.classList.contains('active')) {
    setPillSliderToButton(pillPalettes);
  } else {
    setPillSliderToButton(pillColors);
  }
});

function updateSidebarFavoritesList(list) {
  if (list.length === 1 && list[0].includes('sidebar-favorites-placeholder')) {
    sidebarFavoritesList.innerHTML = list[0];
  } else {
    sidebarFavoritesList.innerHTML = list.map(item => `<li>${item}</li>`).join('');
  }
}

pillPalettes.addEventListener('click', () => setPillSelected('palettes'));
pillColors.addEventListener('click', () => setPillSelected('colors'));

// --- Swipe gesture support for sidebar-favorites (mobile) ---
let touchStartX = null;
let touchStartY = null;
let touchMoved = false;

const sidebar = document.getElementById('sidebar-favorites');

function handleSidebarTouchStart(e) {
  if (e.touches.length !== 1) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchMoved = false;
}

function handleSidebarTouchMove(e) {
  if (touchStartX === null) return;
  const dx = e.touches[0].clientX - touchStartX;
  const dy = e.touches[0].clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
    touchMoved = true;
    e.preventDefault();
  }
}

function handleSidebarTouchEnd(e) {
  if (touchStartX === null || !touchMoved) {
    touchStartX = null;
    touchStartY = null;
    return;
  }
  const dx = e.changedTouches[0].clientX - touchStartX;
  const isPalettesActive = pillPalettes.classList.contains('active');
  
  if (dx < -40) {
    // Swipe left: if on Palettes, go to Colors
    if (isPalettesActive) {
      setPillSelected('colors');
    }
  } else if (dx > 40) {
    // Swipe right: if on Colors, go to Palettes; if on Palettes, close sidebar
    if (isPalettesActive) {
      closeSidebarFavorites();
    } else {
      setPillSelected('palettes');
    }
  }
  touchStartX = null;
  touchStartY = null;
  touchMoved = false;
}

function enableSidebarSwipe() {
  if (!sidebar) return;
  sidebar.addEventListener('touchstart', handleSidebarTouchStart, { passive: false });
  sidebar.addEventListener('touchmove', handleSidebarTouchMove, { passive: false });
  sidebar.addEventListener('touchend', handleSidebarTouchEnd, { passive: false });
}

function disableSidebarSwipe() {
  if (!sidebar) return;
  sidebar.removeEventListener('touchstart', handleSidebarTouchStart);
  sidebar.removeEventListener('touchmove', handleSidebarTouchMove);
  sidebar.removeEventListener('touchend', handleSidebarTouchEnd);
}

// Enable swipe only on mobile
function checkSidebarSwipe() {
  if (window.innerWidth <= 768) {
    enableSidebarSwipe();
  } else {
    disableSidebarSwipe();
  }
}
window.addEventListener('resize', checkSidebarSwipe);
document.addEventListener('DOMContentLoaded', checkSidebarSwipe);

// Ensure Palettes is selected by default when sidebar opens
function openSidebarFavorites() {
  const sidebar = document.getElementById('sidebar-favorites');
  const sidebarBackdrop = document.getElementById('sidebar-favorites-backdrop');
  const body = document.body;
  
  sidebar.classList.add('open');
  body.classList.add('sidebar-favorites-open');
  // Always show backdrop on all screen sizes
  sidebarBackdrop.classList.add('active');
  setPillSelected('palettes');
  // Ensure both panels are positioned correctly
  setTimeout(() => setSidebarPanel('palettes'), 100);
  fetchSidebarFavoritePalettes();
  fetchSidebarFavoriteColors();
  // Render both sections immediately
  renderSidebarFavoritePalettes();
  renderSidebarFavoriteColors();
}

function closeSidebarFavorites() {
  const sidebar = document.getElementById('sidebar-favorites');
  const sidebarBackdrop = document.getElementById('sidebar-favorites-backdrop');
  const body = document.body;
  
  sidebar.classList.remove('open');
  body.classList.remove('sidebar-favorites-open');
  sidebarBackdrop.classList.remove('active');
}

// Close sidebar when clicking the close button
document.getElementById('close-sidebar-favorites').addEventListener('click', closeSidebarFavorites);

// Close sidebar when clicking the backdrop (mobile)
document.getElementById('sidebar-favorites-backdrop').addEventListener('click', closeSidebarFavorites);

// Close sidebar when pressing Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const sidebar = document.getElementById('sidebar-favorites');
    if (sidebar.classList.contains('open')) {
      closeSidebarFavorites();
    }
  }
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
    const current = getCurrentPaletteHexes();
    
    isCurrentPaletteFavorite = palettes.some(p => palettesMatch(p.colors, current));
    toggleLikeButton(isCurrentPaletteFavorite);

    const palettes = await backend.get_palettes();
    updateFavoritesDropdown(palettes);

    const colorDivs = document.querySelectorAll(".gen-color");
    // Only proceed if colorDivs exist
    if (colorDivs && colorDivs.length > 0) {
      const current = Array.from(colorDivs, div => {
        const hexSpan = div.querySelector(".hex-code");
        return hexSpan ? ("#" + hexSpan.innerText.toUpperCase()) : null;
      }).filter(Boolean);
      const found = palettes.some(p => palettesMatch(p.colors, current));
      toggleLikeButton(found);
    }
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
        // Attach event listeners BEFORE appending to DOM
        hexText.tabIndex = 0;
        hexText.addEventListener("click", () => switchToInput());
        hexText.addEventListener("touchend", (e) => {
          if (e.cancelable && e.touches && e.touches.length > 0) {
            e.preventDefault();
          }
          switchToInput();
        });
        hexText.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            switchToInput();
          }
        });
        const copyIcon = document.createElement("i");
        copyIcon.className = "fas fa-copy copy-icon";
        copyIcon.style.color = textColor;
        copyIcon.title = "Copy to clipboard";
        copyIcon.onclick = () => {
          navigator.clipboard.writeText(color.replace(/^#/, "").toUpperCase()).then(() => {
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

        // Create lock icon for locking color
        const lockIcon = document.createElement("i");
        lockIcon.className = "fa-solid fa-lock-open lock-icon";
        lockIcon.style.color = textColor;
        lockIcon.title = "Lock color";
        // (No logic yet)

        // Create heart icon for individual color favorites
        const heartIcon = document.createElement("i");
        heartIcon.className = "far fa-heart color-heart-icon";
        heartIcon.style.color = textColor;
        heartIcon.title = "Save color to favorites";
        if (userIsLoggedIn) {
          heartIcon.style.display = "block";
          heartIcon.classList.remove('hidden');
          // Check if this color is already in favorites
          const currentHexCode = color.replace(/^#/, "").toUpperCase();
          const favoriteHexCodes = sidebarFavoriteColors.map(c => c.hex_code.toUpperCase());
          if (favoriteHexCodes.includes(currentHexCode)) {
            heartIcon.classList.remove('far');
            heartIcon.classList.add('fas');
          }
        } else {
          heartIcon.style.display = "none";
          heartIcon.classList.add('hidden');
        }
        
        // Add click event for heart icon
        heartIcon.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (!userIsLoggedIn) {
            alert("Please log in to save favorite colors.");
            return;
          }
          
          // Get current hex value from input or span
          let currentHexCode = null;
          const input = div.querySelector(".hex-input");
          const span = div.querySelector(".hex-code");
          if (input && document.activeElement === input) {
            currentHexCode = input.value.toUpperCase();
          } else if (span) {
            currentHexCode = span.innerText.toUpperCase();
          }
          
          if (!currentHexCode || currentHexCode.length === 0) {
            alert("Invalid color code.");
            return;
          }
          
          const isLiked = heartIcon.classList.contains("fas");
          
          if (isLiked) {
            // Remove from favorites
            heartIcon.classList.remove("fas");
            heartIcon.classList.add("far");
            try {
              await backend.delete_color(currentHexCode);
              // Update local state immediately to prevent flicker
              sidebarFavoriteColors = sidebarFavoriteColors.filter(c => c.hex_code.toUpperCase() !== currentHexCode);
              // Update all heart icons for this color across all .gen-color divs
              updateAllHeartIconsForColor(currentHexCode, false);
            } catch (err) {
              heartIcon.classList.remove("far");
              heartIcon.classList.add("fas");
              alert("Failed to remove color from favorites: " + err.message);
            }
          } else {
            // Add to favorites
            heartIcon.classList.remove("far");
            heartIcon.classList.add("fas");
            try {
              await backend.add_color(currentHexCode);
              // Update local state immediately
              sidebarFavoriteColors.push({ hex_code: currentHexCode });
              // Update all heart icons for this color across all .gen-color divs
              updateAllHeartIconsForColor(currentHexCode, true);
            } catch (err) {
              heartIcon.classList.remove("fas");
              heartIcon.classList.add("far");
              alert("Failed to save color to favorites: " + err.message);
            }
          }
        });

        // Lock state for this color block (must be after heartIcon is created)
        let isLocked = div.dataset.locked === 'true';
        if (isLocked) {
          lockIcon.classList.remove('fa-lock-open');
          lockIcon.classList.add('fa-lock');
          lockIcon.title = 'Unlock color';
        }
        lockIcon.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          isLocked = !isLocked;
          div.dataset.locked = isLocked;
          // --- FIX: persist lock state and color in paletteState ---
          if (Array.isArray(paletteState) && paletteState[i]) {
            paletteState[i].isLocked = isLocked;
            if (isLocked) {
              // Save the current color as the locked color
              let currentColor = null;
              // Prefer input value if present and valid
              const input = div.querySelector('.hex-input');
              if (input && input.value && input.value.length > 0) {
                let val = input.value.toUpperCase().replace(/[^0-9A-F]/g, '');
                if (val.length === 6) {
                  currentColor = '#' + val;
                } else if (val.length > 0) {
                  currentColor = '#' + val.padEnd(6, '0');
                }
              }
              // Fallback to background color if no valid input
              if (!currentColor) {
                currentColor = div.style.backgroundColor;
                // Convert rgb to hex if needed
                if (currentColor.startsWith('rgb')) {
                  const rgb = currentColor.match(/\d+/g);
                  if (rgb && rgb.length >= 3) {
                    currentColor = '#' + rgb.slice(0,3).map(x => (+x).toString(16).padStart(2, '0')).join('').toUpperCase();
                  }
                }
              }
              paletteState[i].color = currentColor;
            }
          }
          if (isLocked) {
            lockIcon.classList.remove('fa-lock-open');
            lockIcon.classList.add('fa-lock');
            lockIcon.title = 'Unlock color';
          } else {
            lockIcon.classList.remove('fa-lock');
            lockIcon.classList.add('fa-lock-open');
            lockIcon.title = 'Lock color';
          }
        });

        // Append icons in correct order
        if (window.innerWidth <= 768) {
          // On mobile/tablet, use two containers for left/right alignment
          const left = document.createElement("div");
          left.className = "hex-left";
          left.style.display = "flex";
          left.style.alignItems = "center";
          left.style.flex = "1 1 auto";
          left.appendChild(hexText);

          const right = document.createElement("div");
          right.className = "hex-right";
          right.style.display = "flex";
          right.style.alignItems = "center";
          right.style.gap = "12px";
          right.style.flex = "0 0 auto";
          right.appendChild(copyIcon);
          right.appendChild(dragIcon);
          right.appendChild(lockIcon);
          right.appendChild(heartIcon);

          div.appendChild(left);
          div.appendChild(right);
        } else {
          wrapper.appendChild(hexText);
          wrapper.appendChild(copyIcon);
          wrapper.appendChild(dragIcon);
          wrapper.appendChild(lockIcon);
          wrapper.appendChild(heartIcon);
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
// Like Button (Favorite Toggle)
// ================================
const likeButton = document.getElementById("like-button");

likeButton.addEventListener("click", async () => {
  if (likeButton.classList.contains("disabled")) return;

  if (!userIsLoggedIn) {
    alert("Please log in to save favorites.");
    return;
  }

  // Collect current palette from DOM
  const colorDivs = document.querySelectorAll(".gen-color");
  const paletteColors = Array.from(colorDivs, div => {
    const hexSpan = div.querySelector(".hex-code");
    return hexSpan ? ("#" + hexSpan.innerText.toUpperCase()) : null;
  }).filter(Boolean);

  if (paletteColors.length !== 5) {
    alert("Incomplete palette — make sure there are 5 colors.");
    toggleLikeButton(false);
    return;
  }

  const isLiked = likeButton.classList.contains("fas");

  if (isLiked) {
    // Remove from favorites
    likeButton.classList.remove("fas");
    likeButton.classList.add("far");
    try {
      await backend.delete_palette(paletteColors);
      isCurrentPaletteFavorite = false;
      toggleLikeButton(false);
      fetchFavoritesFromBackend();
    } catch (err) {
      likeButton.classList.remove("far");
      likeButton.classList.add("fas");
      alert("Failed to remove favorite: " + err.message);
    }
  } else {
    // Add to favorites
    likeButton.classList.remove("far");
    likeButton.classList.add("fas");
    try {
      await backend.add_palette("Untitled", paletteColors);
      isCurrentPaletteFavorite = true;
      toggleLikeButton(true);
      fetchFavoritesFromBackend();
    } catch (err) {
      likeButton.classList.remove("fas");
      likeButton.classList.add("far");
      if (err.message.includes("already exists")) {
        isCurrentPaletteFavorite = true;
        toggleLikeButton(true);
      } else {
        alert("Failed to save favorite: " + err.message);
      }
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
  // Only fetch favorites if DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    fetchFavoritesFromBackend();
    fetchFavoriteColorsFromBackend().then(() => {
      generatePalette();
    });
  }
  // Also set up editable hex code UI immediately
  generatePalette();
}

// ================================
// UI State Helpers
// ================================
function updateFavoritesUI(isLoggedIn) {
  const wrapper = document.getElementById('favorites-wrapper');
  const likeBtn = document.getElementById('like-button');
  const listBtn = document.getElementById('list-button');

  if (isLoggedIn) {
    wrapper.classList.remove('favorites-disabled');
    likeBtn.classList.remove('disabled');
    listBtn.classList.remove('disabled');
  } else {
    wrapper.classList.add('favorites-disabled');
    likeBtn.classList.add('disabled');
    listBtn.classList.add('disabled');
  }

  // Update individual color heart icons
  const heartIcons = document.querySelectorAll('.color-heart-icon');
  heartIcons.forEach(icon => {
    if (isLoggedIn) {
      icon.style.display = 'block';
      icon.classList.remove('hidden');
    } else {
      icon.style.display = 'none';
      icon.classList.add('hidden');
    }
  });
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

async function initialPaletteLoad() {
  // Initialize sidebar variables
  sidebarFavoritesSlider = document.getElementById('sidebar-favorites-slider');
  sidebarFavoritesPalettes = document.getElementById('sidebar-favorites-palettes');
  sidebarFavoritesColors = document.getElementById('sidebar-favorites-colors');
  
  await loadPalettes();
  generatePalette();
  // Fetch favorites after DOM is ready
  if (userIsLoggedIn) {
    fetchFavoritesFromBackend();
    fetchFavoriteColorsFromBackend();
  }
  // Rebuild .gen-color DOM to attach hex code editing listeners after initial load
  rebuildGenColorDOMForLayout();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialPaletteLoad);
} else {
  initialPaletteLoad();
}

// Call generatePalette on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', generatePalette);
} else {
  generatePalette();
}

// Call generatePalette when Generate button is clicked
const generateBtn = document.getElementById('generate');
if (generateBtn) {
  generateBtn.addEventListener('click', function(e) {
    // Remove any existing ripple
    const oldRipple = this.querySelector('.ripple');
    if (oldRipple) oldRipple.remove();
    const rect = this.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
    generatePalette();
  });
}

// Render favorite colors in sidebar
function renderSidebarFavoriteColors() {
  // Remove the pill active check - always render
  if (!sidebarFavoritesColors) return;
  
  if (!sidebarFavoriteColors || sidebarFavoriteColors.length === 0) {
    sidebarFavoritesColors.innerHTML = '<p class="sidebar-favorites-placeholder fade-in">No favorite colors yet.</p>';
    return;
  }
  sidebarFavoritesColors.innerHTML = sidebarFavoriteColors.map((color, idx) => {
    return `
      <div class="sidebar-fav-color-card" data-idx="${idx}">
        <div class="sidebar-fav-color-header-row">
          <input class="sidebar-fav-color-title-input" value="${color.title ? color.title.replace(/\"/g, '&quot;') : 'Untitled'}" data-idx="${idx}" />
          <div class="sidebar-fav-color-actions">
            <i class="fas fa-copy sidebar-fav-color-copy-btn" title="Copy" data-idx="${idx}"></i>
            <i class="fas fa-trash-alt sidebar-fav-color-delete-btn" title="Remove" data-idx="${idx}"></i>
          </div>
        </div>
        <div class="sidebar-fav-color-row">
          <div class="sidebar-fav-color-box" style="background:#${color.hex_code}"></div>
          <div class="sidebar-fav-color-hex">#${color.hex_code}</div>
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners for delete button
  document.querySelectorAll('.sidebar-fav-color-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(btn.dataset.idx, 10);
      const color = sidebarFavoriteColors[idx];
      const card = btn.closest('.sidebar-fav-color-card');
      // Animate out
      card.classList.add('fade-out');
      // Remove from array immediately so it never reappears
      sidebarFavoriteColors.splice(idx, 1);
      // After animation, re-render
      setTimeout(() => {
        renderSidebarFavoriteColors();
        // If no colors left, fade in placeholder
        if (sidebarFavoriteColors.length === 0) {
          const placeholder = document.querySelector('.sidebar-favorites-placeholder');
          if (placeholder) {
            setTimeout(() => placeholder.classList.add('fade-in'), 10);
          }
        }
      }, 400);
      // Call backend (after UI update for UX)
      try {
        await backend.delete_color(color.hex_code);
        fetchFavoriteColorsFromBackend(); // Also update heart icons
      } catch (err) {
        // Optionally show error, but do not re-add color to UI
        alert('Failed to delete color.');
      }
    });
  });

  // Add event listeners for copy button
  document.querySelectorAll('.sidebar-fav-color-copy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(btn.dataset.idx, 10);
      const color = sidebarFavoriteColors[idx];
      if (!color || !color.hex_code) return;
      try {
        await navigator.clipboard.writeText(color.hex_code.toUpperCase());
        btn.classList.remove('fa-copy');
        btn.classList.add('fa-check');
        setTimeout(() => {
          btn.classList.remove('fa-check');
          btn.classList.add('fa-copy');
        }, 1000);
      } catch (err) {
        alert('Failed to copy color.');
      }
    });
  });

  // Add event listeners for color title editing (interactivity only, backend call is a placeholder)
  document.querySelectorAll('.sidebar-fav-color-title-input').forEach(input => {
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    });
    input.addEventListener('blur', async (e) => {
      const idx = parseInt(input.dataset.idx, 10);
      const color = sidebarFavoriteColors[idx];
      const newTitle = input.value.trim() || 'Untitled';
      if (newTitle !== color.title) {
        input.disabled = true;
        try {
          await backend.update_color_title(color.hex_code, newTitle);
          color.title = newTitle;
        } catch (err) {
          alert('Failed to update color title.');
          input.value = color.title;
        }
        input.disabled = false;
      }
    });
  });
}

// Update heart icons based on favorite colors
function updateHeartIconsForColors(colors) {
  const colorDivs = document.querySelectorAll('.gen-color');
  const favoriteHexCodes = colors.map(c => c.hex_code.toUpperCase());
  
  colorDivs.forEach(div => {
    const heartIcon = div.querySelector('.color-heart-icon');
    if (!heartIcon) return;
    
    const hexSpan = div.querySelector('.hex-code');
    const hexInput = div.querySelector('.hex-input');
    
    let currentHexCode = null;
    if (hexInput && document.activeElement === hexInput) {
      currentHexCode = hexInput.value.toUpperCase();
    } else if (hexSpan) {
      currentHexCode = hexSpan.innerText.toUpperCase();
    }
    
    if (currentHexCode && favoriteHexCodes.includes(currentHexCode)) {
      heartIcon.classList.remove('far');
      heartIcon.classList.add('fas');
    } else {
      heartIcon.classList.remove('fas');
      heartIcon.classList.add('far');
    }
  });
}

// Helper to slide the slider
function setSidebarSlider(section) {
  if (!sidebarFavoritesSlider) return;
  if (section === 'palettes') {
    sidebarFavoritesSlider.style.transform = 'translateX(0)';
  } else {
    sidebarFavoritesSlider.style.transform = 'translateX(-50%)';
  }
}

// Update all heart icons for a specific color across all .gen-color divs
function updateAllHeartIconsForColor(hexCode, isFavorite) {
  const colorDivs = document.querySelectorAll('.gen-color');
  colorDivs.forEach(div => {
    const heartIcon = div.querySelector('.color-heart-icon');
    if (!heartIcon) return;
    
    // Get the current hex value for this div
    let currentHexCode = null;
    const input = div.querySelector(".hex-input");
    const span = div.querySelector(".hex-code");
    if (input && document.activeElement === input) {
      currentHexCode = input.value.toUpperCase();
    } else if (span) {
      currentHexCode = span.innerText.toUpperCase();
    }
    
    // If this div has the same hex code, update its heart icon
    if (currentHexCode === hexCode.toUpperCase()) {
      if (isFavorite) {
        heartIcon.classList.remove('far');
        heartIcon.classList.add('fas');
      } else {
        heartIcon.classList.remove('fas');
        heartIcon.classList.add('far');
      }
    }
  });
}

// ================================
// Layout Mode Change Handling for .gen-color Icons
// ================================

// Track current layout mode (vertical/mobile or horizontal/desktop)
let currentLayoutVertical = window.innerWidth <= 768;

function isCurrentVerticalMode() {
  return window.innerWidth <= 768;
}

function rebuildGenColorDOMForLayout() {
  const colorDivs = document.querySelectorAll('.gen-color');
  colorDivs.forEach((div, i) => {
    // Get current color and hex value
    let color = div.style.backgroundColor;
    let hex = null;
    const input = div.querySelector('.hex-input');
    const span = div.querySelector('.hex-code');
    if (input && document.activeElement === input) {
      hex = input.value.toUpperCase();
    } else if (span) {
      hex = span.innerText.toUpperCase();
    } else {
      // fallback: try to get from <b>Color N</b>
      const b = div.querySelector('b');
      if (b) hex = null;
    }
    // If color is not a hex, try to get from hex
    if (!color && hex) {
      color = '#' + hex;
    }
    // If color is rgb(), convert to hex
    if (color && color.startsWith('rgb')) {
      const rgb = color.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        color = '#' + rgb.slice(0,3).map(x => (+x).toString(16).padStart(2, '0')).join('').toUpperCase();
      }
    }
    // If still no hex, fallback to #000000
    if (!hex) {
      hex = '000000';
    }
    // Remove all children
    div.innerHTML = '';
    // Set background color
    div.style.backgroundColor = color || ('#' + hex);
    // Determine text color for contrast
    let textColor = '#fff';
    try {
      textColor = chroma(color || ('#' + hex)).luminance() > 0.5 ? '#000' : '#fff';
    } catch (e) {}
    // Build DOM structure for current layout
    let heartIcon;
    if (isCurrentVerticalMode()) {
      // Mobile/tablet: left/right layout, icons always visible
      const left = document.createElement('div');
      left.className = 'hex-left';
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.flex = '1 1 auto';
      const hexText = document.createElement('span');
      hexText.className = 'hex-code';
      hexText.innerText = hex;
      hexText.style.color = textColor;
      left.appendChild(hexText);
      const right = document.createElement('div');
      right.className = 'hex-right';
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '12px';
      right.style.flex = '0 0 auto';
      // Copy icon
      const copyIcon = document.createElement('i');
      copyIcon.className = 'fas fa-copy copy-icon';
      copyIcon.style.color = textColor;
      copyIcon.title = 'Copy to clipboard';
      copyIcon.onclick = () => {
        navigator.clipboard.writeText(hex).then(() => {
          copyIcon.classList.replace('fa-copy', 'fa-check');
          setTimeout(() => copyIcon.classList.replace('fa-check', 'fa-copy'), 1000);
        });
      };
      // Drag icon
      const dragIcon = document.createElement('i');
      dragIcon.className = 'fa-solid fa-left-right';
      dragIcon.style.color = textColor;
      dragIcon.style.fontSize = '1.2rem';
      dragIcon.title = 'Drag to reorder';
      dragIcon.style.cursor = 'grab';
      // Lock icon
      const lockIcon = document.createElement('i');
      lockIcon.className = 'fa-solid fa-lock-open lock-icon';
      lockIcon.style.color = textColor;
      lockIcon.title = 'Lock color';
      // Lock state for this color block
      let isLocked = div.dataset.locked === 'true';
      if (isLocked) {
        lockIcon.classList.remove('fa-lock-open');
        lockIcon.classList.add('fa-lock');
        lockIcon.title = 'Unlock color';
      }
      lockIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isLocked = !isLocked;
        div.dataset.locked = isLocked;
        if (Array.isArray(paletteState) && paletteState[i]) {
          paletteState[i].isLocked = isLocked;
          if (isLocked) {
            let currentColor = null;
            const input = div.querySelector('.hex-input');
            if (input && input.value && input.value.length > 0) {
              let val = input.value.toUpperCase().replace(/[^0-9A-F]/g, '');
              if (val.length === 6) {
                currentColor = '#' + val;
              } else if (val.length > 0) {
                currentColor = '#' + val.padEnd(6, '0');
              }
            }
            if (!currentColor) {
              currentColor = div.style.backgroundColor;
              if (currentColor.startsWith('rgb')) {
                const rgb = currentColor.match(/\d+/g);
                if (rgb && rgb.length >= 3) {
                  currentColor = '#' + rgb.slice(0,3).map(x => (+x).toString(16).padStart(2, '0')).join('').toUpperCase();
                }
              }
            }
            paletteState[i].color = currentColor;
          }
        }
        if (isLocked) {
          lockIcon.classList.remove('fa-lock-open');
          lockIcon.classList.add('fa-lock');
          lockIcon.title = 'Unlock color';
        } else {
          lockIcon.classList.remove('fa-lock');
          lockIcon.classList.add('fa-lock-open');
          lockIcon.title = 'Lock color';
        }
      });
      // Heart icon
      heartIcon = document.createElement('i');
      heartIcon.className = 'far fa-heart color-heart-icon';
      heartIcon.style.color = textColor;
      heartIcon.title = 'Save color to favorites';
      if (userIsLoggedIn) {
        heartIcon.style.display = 'block';
        heartIcon.classList.remove('hidden');
        const favoriteHexCodes = sidebarFavoriteColors.map(c => c.hex_code.toUpperCase());
        if (favoriteHexCodes.includes(hex)) {
          heartIcon.classList.remove('far');
          heartIcon.classList.add('fas');
        }
      } else {
        heartIcon.style.display = 'none';
        heartIcon.classList.add('hidden');
      }
      right.appendChild(copyIcon);
      right.appendChild(dragIcon);
      right.appendChild(lockIcon);
      right.appendChild(heartIcon);
      div.appendChild(left);
      div.appendChild(right);
      // Always show icons in vertical mode
      [copyIcon, dragIcon, lockIcon, heartIcon].forEach(icon => {
        icon.style.opacity = '1';
        icon.style.pointerEvents = 'auto';
      });
    } else {
      // Desktop: vertical stack, icons only on hover (CSS handles opacity)
      const wrapper = document.createElement('div');
      wrapper.className = 'hex-wrapper';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.gap = '6px';
      const hexText = document.createElement('span');
      hexText.className = 'hex-code';
      hexText.innerText = hex;
      hexText.style.color = textColor;
      // Copy icon
      const copyIcon = document.createElement('i');
      copyIcon.className = 'fas fa-copy copy-icon';
      copyIcon.style.color = textColor;
      copyIcon.title = 'Copy to clipboard';
      copyIcon.onclick = () => {
        navigator.clipboard.writeText(hex).then(() => {
          copyIcon.classList.replace('fa-copy', 'fa-check');
          setTimeout(() => copyIcon.classList.replace('fa-check', 'fa-copy'), 1000);
        });
      };
      // Drag icon
      const dragIcon = document.createElement('i');
      dragIcon.className = 'fa-solid fa-left-right';
      dragIcon.style.color = textColor;
      dragIcon.style.fontSize = '1.2rem';
      dragIcon.title = 'Drag to reorder';
      dragIcon.style.cursor = 'grab';
      // Lock icon
      const lockIcon = document.createElement('i');
      lockIcon.className = 'fa-solid fa-lock-open lock-icon';
      lockIcon.style.color = textColor;
      lockIcon.title = 'Lock color';
      let isLocked = div.dataset.locked === 'true';
      if (isLocked) {
        lockIcon.classList.remove('fa-lock-open');
        lockIcon.classList.add('fa-lock');
        lockIcon.title = 'Unlock color';
      }
      lockIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isLocked = !isLocked;
        div.dataset.locked = isLocked;
        if (Array.isArray(paletteState) && paletteState[i]) {
          paletteState[i].isLocked = isLocked;
          if (isLocked) {
            let currentColor = null;
            const input = div.querySelector('.hex-input');
            if (input && input.value && input.value.length > 0) {
              let val = input.value.toUpperCase().replace(/[^0-9A-F]/g, '');
              if (val.length === 6) {
                currentColor = '#' + val;
              } else if (val.length > 0) {
                currentColor = '#' + val.padEnd(6, '0');
              }
            }
            if (!currentColor) {
              currentColor = div.style.backgroundColor;
              if (currentColor.startsWith('rgb')) {
                const rgb = currentColor.match(/\d+/g);
                if (rgb && rgb.length >= 3) {
                  currentColor = '#' + rgb.slice(0,3).map(x => (+x).toString(16).padStart(2, '0')).join('').toUpperCase();
                }
              }
            }
            paletteState[i].color = currentColor;
          }
        }
        if (isLocked) {
          lockIcon.classList.remove('fa-lock-open');
          lockIcon.classList.add('fa-lock');
          lockIcon.title = 'Unlock color';
        } else {
          lockIcon.classList.remove('fa-lock');
          lockIcon.classList.add('fa-lock-open');
          lockIcon.title = 'Lock color';
        }
      });
      // Heart icon
      heartIcon = document.createElement('i');
      heartIcon.className = 'far fa-heart color-heart-icon';
      heartIcon.style.color = textColor;
      heartIcon.title = 'Save color to favorites';
      if (userIsLoggedIn) {
        heartIcon.style.display = 'block';
        heartIcon.classList.remove('hidden');
        const favoriteHexCodes = sidebarFavoriteColors.map(c => c.hex_code.toUpperCase());
        if (favoriteHexCodes.includes(hex)) {
          heartIcon.classList.remove('far');
          heartIcon.classList.add('fas');
        }
      } else {
        heartIcon.style.display = 'none';
        heartIcon.classList.add('hidden');
      }
      wrapper.appendChild(hexText);
      wrapper.appendChild(copyIcon);
      wrapper.appendChild(dragIcon);
      wrapper.appendChild(lockIcon);
      wrapper.appendChild(heartIcon);
      div.appendChild(wrapper);
      // Let CSS handle icon visibility (opacity on hover)
      [copyIcon, dragIcon, lockIcon, heartIcon].forEach(icon => {
        icon.style.opacity = '';
        icon.style.pointerEvents = '';
      });
    }
    // --- Add click event handler for heart icon (always, regardless of layout) ---
    heartIcon.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!userIsLoggedIn) {
        alert('Please log in to save favorite colors.');
        return;
      }
      // Get current hex value from input or span
      let currentHexCode = null;
      const input = div.querySelector('.hex-input');
      const span = div.querySelector('.hex-code');
      if (input && document.activeElement === input) {
        currentHexCode = input.value.toUpperCase();
      } else if (span) {
        currentHexCode = span.innerText.toUpperCase();
      } else {
        currentHexCode = hex;
      }
      if (!currentHexCode || currentHexCode.length === 0) {
        alert('Invalid color code.');
        return;
      }
      const isLiked = heartIcon.classList.contains('fas');
      if (isLiked) {
        // Remove from favorites
        heartIcon.classList.remove('fas');
        heartIcon.classList.add('far');
        try {
          await backend.delete_color(currentHexCode);
          sidebarFavoriteColors = sidebarFavoriteColors.filter(c => c.hex_code.toUpperCase() !== currentHexCode);
          updateAllHeartIconsForColor(currentHexCode, false);
        } catch (err) {
          heartIcon.classList.remove('far');
          heartIcon.classList.add('fas');
          alert('Failed to remove color from favorites: ' + err.message);
        }
      } else {
        // Add to favorites
        heartIcon.classList.remove('far');
        heartIcon.classList.add('fas');
        try {
          await backend.add_color(currentHexCode);
          sidebarFavoriteColors.push({ hex_code: currentHexCode });
          updateAllHeartIconsForColor(currentHexCode, true);
        } catch (err) {
          heartIcon.classList.remove('fas');
          heartIcon.classList.add('far');
          alert('Failed to save color to favorites: ' + err.message);
        }
      }
    };
  });
  enforceGenColorLayout();
  initDragAndDrop();
}

// Listen for window resize and update layout if mode changes
window.addEventListener('resize', () => {
  const vertical = isCurrentVerticalMode();
  if (vertical !== currentLayoutVertical) {
    currentLayoutVertical = vertical;
    rebuildGenColorDOMForLayout();
  }
});
