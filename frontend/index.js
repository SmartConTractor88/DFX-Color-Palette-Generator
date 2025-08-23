// ================================
// Imports
// ================================
import { backend } from 'declarations/backend';
import { AuthClient } from "@dfinity/auth-client";
import html2canvas from 'html2canvas';
import { getNewColor } from './colors';

// ================================
// Global Variables
// ================================
let sidebarFavoritesSlider;
let sidebarFavoritesPalettes;
let sidebarFavoritesColors;
// BACK HERE

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
  
  // Ensure icons have correct initial opacity state
  enforceIconVisibility();
}

function enforceIconVisibility() {
  const colorDivs = document.querySelectorAll('.gen-color');
  colorDivs.forEach(div => {
    const copyIcon = div.querySelector('.copy-icon');
    const dragIcon = div.querySelector('.fa-left-right');
    const lockIcon = div.querySelector('.lock-icon');
    const heartIcon = div.querySelector('.color-heart-icon');
    
    if (window.innerWidth <= 768) {
      // Mobile: always show icons
      [copyIcon, dragIcon, lockIcon, heartIcon].forEach(icon => {
        if (icon) {
          icon.style.opacity = '1';
          icon.style.pointerEvents = 'auto';
        }
      });
    } else {
      // Desktop: let CSS handle the opacity for hover effects
      [copyIcon, dragIcon, heartIcon].forEach(icon => {
        if (icon) {
          // Remove any inline styles to let CSS take over
          icon.style.removeProperty('opacity');
          icon.style.removeProperty('pointer-events');
        }
      });
      
      // Handle lock icon specially - show if locked
      if (lockIcon) {
        if (lockIcon.classList.contains('fa-lock')) {
          lockIcon.style.opacity = '1';
          lockIcon.style.pointerEvents = 'auto';
        } else {
          // Remove inline styles to let CSS handle hover
          lockIcon.style.removeProperty('opacity');
          lockIcon.style.removeProperty('pointer-events');
        }
      }
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

  const changed = dragState.currentIndex !== dragState.originalIndex;
  if (changed) {
    const prev = JSON.parse(JSON.stringify(paletteState));
    reorderDOM();
    recordPaletteChange(prev);
    // Re-check favorite palette status after reorder (order-insensitive)
    try { updateToolbarFavoritePaletteIconLocal?.(); } catch (_) {}
  } else {
    console.log("Drag ended, no index change.");
    try { updateToolbarFavoritePaletteIconLocal?.(); } catch (_) {}
  }

  cleanupDrag();
}

function reorderDOM() {
  const colorDivs = document.querySelectorAll('.gen-color');
  const palette = document.querySelector('.palette');

  // Remove transforms and transitions before DOM update ---
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
  
  // Filter out null values and update paletteState with the new order
  const validNewOrder = newOrder.filter(ref => ref !== null && ref !== undefined);
  if (validNewOrder.length === paletteState.length) {
    paletteState = validNewOrder;
  } else {
    console.log("paletteState NOT updated - lengths don't match");
  }

  // Update _paletteStateRef properties to match the new order
  const reorderedElements = Array.from(palette.querySelectorAll('.gen-color'));
  reorderedElements.forEach((div, i) => {
    // Only update if we have a valid reference for this index
    if (i < validNewOrder.length && validNewOrder[i]) {
      div._paletteStateRef = validNewOrder[i];
    }
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
  try { updateToolbarFavoritePaletteIconLocalWithFallback?.(); } catch (_) {}
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
  // After any drag ends (reorder or not), recompute toolbar favorite state ignoring order
  try { updateToolbarFavoritePaletteIconLocalWithFallback?.(); } catch (_) {}
  
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
    // Fallback for when chroma is not available
    if (typeof window !== 'undefined' && window.chroma) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? "#000000" : "#FFFFFF";
    } else {
        // Simple fallback calculation
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? "#000000" : "#FFFFFF";
    }
}

// ================================
// Palette Management
// ================================

// Global palette state: 5 objects { color: '#RRGGBB', isLocked: false }
let paletteState = null;

function syncPaletteStateToDOMOrder() {
  const colorDivs = document.querySelectorAll('.gen-color');
  if (!paletteState || paletteState.length !== colorDivs.length) return;

  const newOrder = Array.from(colorDivs).map(div => {
    const entry = div._paletteStateRef;
    return entry ? { color: entry.color.toUpperCase(), isLocked: !!entry.isLocked } : null;
  });

  if (newOrder.every(Boolean)) {
    paletteState = newOrder;
  }
}

function renderPaletteFromState() {
  // Takes the global paletteState and updates the .gen-color divs to match it
  const colorDivs = document.querySelectorAll('.gen-color');
  
  colorDivs.forEach((div, i) => {
    const entry = paletteState[i];
    if (!entry || !div) return;
    
    // Attach paletteState reference to the div for drag reordering
    div._paletteStateRef = entry;
    // Set background color
    div.style.backgroundColor = entry.color;
    // Remove loading class
    div.classList.remove('loading');
    
    // --- Restore DOM content: hex code, icons, etc. ---
    div.innerHTML = '';
    const textColor = getTextColor(entry.color);
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
    hexText.addEventListener('click', () => switchToInput(hexText, div, i));
    hexText.addEventListener('touchend', (e) => {
      if (e.cancelable && e.touches && e.touches.length > 0) {
        e.preventDefault();
      }
      switchToInput(hexText, div, i);
    });
    hexText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchToInput(hexText, div, i);
      }
    });
    
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
    
    // Read lock status from paletteState instead of DOM dataset
    let isLocked = entry.isLocked;
    if (isLocked) {
      lockIcon.classList.remove('fa-lock-open');
      lockIcon.classList.add('fa-lock');
      lockIcon.title = 'Unlock color';
    }
    
    lockIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isLocked = !isLocked;
      // Update paletteState directly instead of DOM dataset
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
  bindInputEvents();
  enforceIconVisibility();
  
  // After rebuilding the DOM, sync heart icons with favorite colors
  if (typeof updateHeartIconsForColors === 'function') {
    try { updateHeartIconsForColors(sidebarFavoriteColors || []); } catch (_) {}
  }
  try { updateToolbarFavoritePaletteIconLocalWithFallback?.(); } catch (_) {}
}

function generatePalette() {
  // Only sync if paletteState doesn't exist or is invalid
  if (!paletteState || paletteState.length !== 5) {
    syncPaletteStateToDOMOrder();
  }
  
  try {
    const colorDivs = document.querySelectorAll('.gen-color');
    colorDivs.forEach(div => div.classList.add('loading'));

    // --- PALETTE STATE LOGIC ---
    // 1. If paletteState doesn't exist, create it with 5 random colors, all unlocked
    if (!paletteState || paletteState.length !== 5) {
      paletteState = Array.from({ length: 5 }, (_, i) => ({ color: getNewColor(i, paletteState), isLocked: false }));
    }

    // 2. Only update the color of unlocked entries in paletteState
    paletteState.forEach((entry, i) => {
      if (!entry.isLocked) {
        entry.color = getNewColor(i, paletteState);
      }
    });

    // 3. Render the updated palette state to the DOM
    renderPaletteFromState();
  } catch (e) {
    console.error('Error generating palette:', e);
    // Fallback: generate random colors if there's an error
    paletteState = Array.from({ length: 5 }, () => ({ 
      color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase(), 
      isLocked: false 
    }));
    renderPaletteFromState();
  }
}

// ==============================
// Manual Input
// ==============================

// --- Helpers: normalize hex and convert HEX -> HSL ---
function normalizeHex(str) {
  if (!str) return '#000000';
  str = String(str).trim();
  if (str[0] !== '#') str = '#' + str;
  // Expand #RGB to #RRGGBB
  if (/^#([0-9A-Fa-f]{3})$/.test(str)) {
    str = '#' + str[1] + str[1] + str[2] + str[2] + str[3] + str[3];
  }
  // If now valid, return uppercased
  if (/^#([0-9A-Fa-f]{6})$/.test(str)) return str.toUpperCase();

  // Otherwise coerce to 6 hex chars
  const only = str.replace(/[^0-9A-Fa-f]/g, '').slice(-6);
  return ('#' + only.padEnd(6, '0')).toUpperCase();
}

function hexToHsl(hex) {
  hex = normalizeHex(hex).slice(1); // drop '#'
  const r = parseInt(hex.slice(0,2), 16) / 255;
  const g = parseInt(hex.slice(2,4), 16) / 255;
  const b = parseInt(hex.slice(4,6), 16) / 255;

  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = 0; s = 0; // gray
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
  return { h: Math.round(h * 360), s, l };
}

// --- HSV / RGB helpers ---
function hexToRgb(hex) {
  hex = normalizeHex(hex);
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0"))
      .join("")
  ).toUpperCase();
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const v = max;
  const s = max === 0 ? 0 : d / max;
  return { h: Math.round(h), s, v };
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;

  let rp = 0, gp = 0, bp = 0;
  if (0 <= h && h < 60) { rp = c; gp = x; bp = 0; }
  else if (60 <= h && h < 120) { rp = x; gp = c; bp = 0; }
  else if (120 <= h && h < 180) { rp = 0; gp = c; bp = x; }
  else if (180 <= h && h < 240) { rp = 0; gp = x; bp = c; }
  else if (240 <= h && h < 300) { rp = x; gp = 0; bp = c; }
  else { rp = c; gp = 0; bp = x; }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

function hsvToHex(h, s, v) {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

// Color picker skeleton

// --- Build Color Picker Skeleton + Live Updater ---
function buildColorPickerSkeleton(colorPopup, initialHex) {
  // Clear (in case of re-open)
  colorPopup.innerHTML = '';

  // Container padding/layout
  colorPopup.style.display = 'flex';
  colorPopup.style.flexDirection = 'column';
  colorPopup.style.gap = '10px';
  colorPopup.style.padding = '12px';

  // Matrix (S/L square)
  const matrix = document.createElement('div');
  matrix.style.position = 'relative';
  matrix.style.width = '100%';
  matrix.style.aspectRatio = '1 / 1';
  matrix.style.borderRadius = '10px';
  matrix.style.cursor = 'crosshair';
  matrix.style.overflow = 'hidden';
  matrix.setAttribute('data-role', 'matrix');

  const matrixHandle = document.createElement('div');
  matrixHandle.style.position = 'absolute';
  matrixHandle.style.width = '14px';
  matrixHandle.style.height = '14px';
  matrixHandle.style.border = '2px solid #fff';
  matrixHandle.style.borderRadius = '50%';
  matrixHandle.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.35)';
  matrixHandle.style.transform = 'translate(-50%, -50%)';
  matrixHandle.setAttribute('data-role', 'matrix-handle');
  matrix.appendChild(matrixHandle);

  // Hue slider
  const hue = document.createElement('div');
  hue.style.position = 'relative';
  hue.style.height = '16px';
  hue.style.borderRadius = '999px';
  hue.style.cursor = 'ew-resize';
  hue.style.background = 'linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)';
  hue.setAttribute('data-role', 'hue');

  const hueHandle = document.createElement('div');
  hueHandle.style.position = 'absolute';
  hueHandle.style.top = '50%';
  hueHandle.style.width = '14px';
  hueHandle.style.height = '14px';
  hueHandle.style.border = '2px solid #fff';
  hueHandle.style.borderRadius = '50%';
  hueHandle.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.35)';
  hueHandle.style.transform = 'translate(-50%, -50%)';
  hueHandle.setAttribute('data-role', 'hue-handle');
  hue.appendChild(hueHandle);

  // Add to popup
  colorPopup.appendChild(matrix);
  colorPopup.appendChild(hue);

  // Store refs on the popup for easy live updates later
  colorPopup._matrix = matrix;
  colorPopup._matrixHandle = matrixHandle;
  colorPopup._hueHandle = hueHandle;

  // Initialize visuals from the current color
  updateMatrixFromHex(initialHex, colorPopup);
}

// Live-updates the matrix & handles from a hex value
// Live-updates the matrix & handles from a hex value (HSV mapping)
function updateMatrixFromHex(hex, colorPopup) {
  if (!colorPopup) return;
  const matrix = colorPopup._matrix;
  const matrixHandle = colorPopup._matrixHandle;
  const hueHandle = colorPopup._hueHandle;
  if (!matrix || !matrixHandle || !hueHandle) return;

  const { h, s, v } = hexToHsv(hex);

  // Visual square: left→right = white→pure hue; bottom→top = black→bright
  matrix.style.background = `
    linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0)),
    linear-gradient(to right, #ffffff, hsl(${h} 100% 50%))
  `;

  matrixHandle.style.left = (s * 100) + '%';       // S
  matrixHandle.style.top  = ((1 - v) * 100) + '%'; // V (top = 1)
  hueHandle.style.left = ((h / 360) * 100) + '%';

  // Keep current HSV handy
  colorPopup._hsv = { h, s, v };
}

function makeMatrixInteractive(matrix, matrixHandle, hueHandle, input, div, colorPopup) {
  // Single source of truth: HSV state
  let hsv = hexToHsv('#' + input.value.padEnd(6, '0'));

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const clampHue = (h) => {
    // keep [0, 360), avoids 360 flipping to 0 visually
    h = Math.round(h);
    if (h < 0) h = (h % 360 + 360) % 360;
    if (h >= 360) h = h % 360;
    return h;
  };

  function setColorFromHsv(newH, newS, newV, {fromDrag=false, updateInput=true} = {}) {
    hsv = { h: clampHue(newH), s: clamp01(newS), v: clamp01(newV) };

    // Update matrix background (depends on hue only)
    matrix.style.background = `
      linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0)),
      linear-gradient(to right, #ffffff, hsl(${hsv.h} 100% 50%))
    `;

    // Move handles (S, V)
    matrixHandle.style.left = (hsv.s * 100) + '%';
    matrixHandle.style.top  = ((1 - hsv.v) * 100) + '%';

    // Move hue handle when hue changes (dragging hue or syncing)
    // (If we're dragging the matrix we don't change hue)
    if (!fromDrag) {
      hueHandle.style.left = ((hsv.h / 360) * 100) + '%';
    }

    // Push back to HEX + UI (only if not from user typing)
    if (updateInput) {
      const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
      input.value = hex.slice(1).toUpperCase();
    }

    // Live preview on swatch
    const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
    div.style.backgroundColor = hex;
    const textColor = getTextColor(hex);
    input.style.color = textColor;
    div.querySelectorAll('i').forEach(icon => (icon.style.color = textColor));

    // Keep popup's copy in sync so other helpers can read it
    if (colorPopup) colorPopup._hsv = { ...hsv };
  }

  // --- Sync HSV whenever the input text changes (typing/paste) ---
  input.addEventListener('input', () => {
    const hex = '#' + input.value.toUpperCase().replace(/[^0-9A-F]/g, '').padEnd(6, '0');
    const newHsv = hexToHsv(hex);
    setColorFromHsv(newHsv.h, newHsv.s, newHsv.v, { updateInput: false });
  });

  // --- Matrix dragging: controls S (x) and V (y) ---
  matrix.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const rect = matrix.getBoundingClientRect();

    function update(ev) {
      const s = clamp01((ev.clientX - rect.left) / rect.width);
      const v = clamp01(1 - (ev.clientY - rect.top) / rect.height);
      setColorFromHsv(hsv.h, s, v, { fromDrag: true });
    }
    function stop() {
      document.removeEventListener('mousemove', update);
      document.removeEventListener('mouseup', stop);
    }
    update(e);
    document.addEventListener('mousemove', update);
    document.addEventListener('mouseup', stop);
  });

  // --- Hue dragging: controls H only ---
  const hueBar = hueHandle.parentElement;
  hueBar.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const rect = hueBar.getBoundingClientRect();

    function update(ev) {
      const ratio = clamp01((ev.clientX - rect.left) / rect.width);
      const h = clampHue(ratio * 360);
      hueHandle.style.left = (ratio * 100) + '%';
      setColorFromHsv(h, hsv.s, hsv.v);
    }
    function stop() {
      document.removeEventListener('mousemove', update);
      document.removeEventListener('mouseup', stop);
    }
    update(e);
    document.addEventListener('mousemove', update);
    document.addEventListener('mouseup', stop);
  });
}

// Add this helper
function hslToHex(h, s, l) {
  s = s; l = l;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c/2;
  let r=0,g=0,b=0;

  if (0 <= h && h < 60) { r=c; g=x; b=0; }
  else if (60 <= h && h < 120) { r=x; g=c; b=0; }
  else if (120 <= h && h < 180) { r=0; g=c; b=x; }
  else if (180 <= h && h < 240) { r=0; g=x; b=c; }
  else if (240 <= h && h < 300) { r=x; g=0; b=c; }
  else if (300 <= h && h < 360) { r=c; g=0; b=x; }

  r = Math.round((r+m)*255);
  g = Math.round((g+m)*255);
  b = Math.round((b+m)*255);

  return "#" + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
}


function switchToInput(hexText, div, i) {
  const textColor = hexText.style.color;
  const input = document.createElement('input');
  input.className = 'hex-input';
  input.type = 'text';
  input.maxLength = 6;
  input.value = hexText.innerText;
  input.style.color = textColor;
  input.style.padding = '0';
  input.style.border = '1px solid #FFF';
  input.style.borderRadius = '16px';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.inputMode = 'text';
  input.pattern = '[0-9A-Fa-f]{0,6}';
  input.title = 'Edit color (hex)';
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('spellcheck', 'false');

  // Create popup window for desktop only
  let colorPopup = null;
  if (window.innerWidth > 768) {
    colorPopup = document.createElement('div');
    colorPopup.className = 'color-popup';
    colorPopup.style.position = 'absolute';
    colorPopup.style.width = '90%';
    colorPopup.style.height = '250px';
    colorPopup.style.backgroundColor = '#FFFFFF';
    colorPopup.style.borderRadius = '16px';
    colorPopup.style.border = 'none';
    colorPopup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    colorPopup.style.zIndex = '1000';
    colorPopup.style.left = '50%';
    colorPopup.style.transform = 'translateX(-50%)';
    colorPopup.style.top = 'calc(50% + 30px)';
    colorPopup.style.pointerEvents = 'auto';

    div.appendChild(colorPopup);

    // Initialize picker UI from the current color
    const currentHex = '#' + (hexText.innerText || '000000');
    buildColorPickerSkeleton(colorPopup, currentHex);
    makeMatrixInteractive(
      colorPopup._matrix,
      colorPopup._matrixHandle,
      colorPopup._hueHandle,
      input,
      div,
      colorPopup
    );
  }

  hexText.replaceWith(input);
  input.focus();
  input.select();

  input.addEventListener('input', () => {
    let val = input.value.toUpperCase().replace(/[^0-9A-F]/g, '');
    if (val.length > 6) val = val.slice(0, 6);
    input.value = val;
    let padded = val.padEnd(6, '0');
    const hex = '#' + padded;

    // Live preview on the swatch
    div.style.backgroundColor = hex;
    const liveTextColor = getTextColor(hex);
    input.style.color = liveTextColor;
    div.querySelectorAll('i').forEach(icon => icon.style.color = liveTextColor);

    // 🔥 Live update the matrix & handles if the popup is open
    if (colorPopup) {
      updateMatrixFromHex(hex, colorPopup);
    }

    // Keep existing app sync
    if (typeof updateHeartIconsForColors === 'function') {
      try { updateHeartIconsForColors(sidebarFavoriteColors || []); } catch (_) {}
    }
    try { updateToolbarFavoritePaletteIconLocal?.(); } catch (_) {}
  });

  input.addEventListener('paste', (e) => {
    e.preventDefault();
    let text = (e.clipboardData || window.clipboardData).getData('text');
    text = text.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6);
    document.execCommand('insertText', false, text);
  });

  // --- Commit function ---
  let committed = false;
  function commit() {
    if (committed) return; // prevent double execution
    committed = true;

    document.removeEventListener('mousedown', handleOutsideClick);
    input.removeEventListener('blur', commit);
    input.removeEventListener('keydown', keydownHandler);

    let val = input.value.toUpperCase().replace(/[^0-9A-F]/g, '').padEnd(6, '0');
    const prev = JSON.parse(JSON.stringify(paletteState));

    // Build a fresh <span class="hex-code">
    const newHexText = document.createElement('span');
    newHexText.className = 'hex-code';
    newHexText.innerText = val;
    newHexText.style.color = getTextColor('#' + val);
    newHexText.tabIndex = 0;

    div.style.backgroundColor = '#' + val;
    div.querySelectorAll('i').forEach(icon => icon.style.color = newHexText.style.color);

    if (Array.isArray(paletteState) && paletteState[i]) {
      paletteState[i].color = '#' + val;
    }
    recordPaletteChange(prev);

    if (colorPopup) {
      // Clean up stored refs to avoid leaks
      colorPopup._matrix = null;
      colorPopup._matrixHandle = null;
      colorPopup._hueHandle = null;
      colorPopup.remove();
    }

    input.replaceWith(newHexText);

    // Re-attach event listeners to the new span
    newHexText.addEventListener('click', () => switchToInput(newHexText, div, i));
    newHexText.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      switchToInput(newHexText, div, i);
    });
    newHexText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchToInput(newHexText, div, i);
      }
    });

    if (typeof updateHeartIconsForColors === 'function') {
      try { updateHeartIconsForColors(sidebarFavoriteColors || []); } catch (_) {}
    }
    try { updateToolbarFavoritePaletteIconLocalWithFallback?.(); } catch (_) {}
  }

  function handleOutsideClick(e) {
    if (!input.contains(e.target) && (!colorPopup || !colorPopup.contains(e.target))) {
      commit();
    }
  }
  document.addEventListener('mousedown', handleOutsideClick);

  function keydownHandler(e) {
    if (e.key === 'Enter') commit();
  }
  input.addEventListener('keydown', keydownHandler);
  input.addEventListener('blur', commit);
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

function updateColorFromInput(input) {
  const div = input.closest('.gen-color');
  if (!div) return;
  const index = [...document.querySelectorAll('.gen-color')].indexOf(div);
  if (index === -1 || !paletteState[index]) return;

  let value = input.value.toUpperCase().replace(/[^0-9A-F]/g, '');
  if (value.length === 6) {
    const hex = '#' + value;
    const prev = JSON.parse(JSON.stringify(paletteState));
    // Record current state before changing it
    recordPaletteChange(prev);
    paletteState[index].color = hex;
    renderPaletteFromState();
    // Ensure heart icons reflect favorites after input update
    if (typeof updateHeartIconsForColors === 'function') {
      try { updateHeartIconsForColors(sidebarFavoriteColors || []); } catch (_) {}
    }
    try { updateToolbarFavoritePaletteIconLocal?.(); } catch (_) {}
  }
}

// ================================
// Toolbar Functionality
// ================================

// Adds blur/enter event listeners to manual hex inputs
function bindInputEvents() {
  document.querySelectorAll('.hex-input').forEach(input => {
    input.addEventListener('blur', () => {
      updateColorFromInput(input);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
    });
  });
}

// ---------- Generate button -----------
document.addEventListener("DOMContentLoaded", () => {
  updateUndoRedoButtons();
  document.querySelectorAll(".generate").forEach((button) => {
    button.addEventListener("click", async () => {
      const prev = JSON.parse(JSON.stringify(paletteState));
      toggleLikeButton(false);
      generatePalette();
      recordPaletteChange(prev);
      setTimeout(() => {
        fetchFavoritesFromBackend();
        try { updateToolbarFavoritePaletteIconLocalWithFallback?.(); } catch (_) {}
      }, 100);
    });      
  });
});


// ------------- Undo / Redo -------------

let undoStack = [];           // Stores past palettes for undo
let redoStack = [];          // Stores undone palettes for redo
const HISTORY_LIMIT = 20;   // Limit the number of history entries

function updatePaletteDOM() {
  if (isCurrentVerticalMode()) {
    // Delegate to the vertical/mobile rendering logic
    rebuildGenColorDOMForLayout();
    return;
  }

  // Desktop/horizontal layout rendering logic
  const colorDivs = document.querySelectorAll('.gen-color');
  
  // Safety check: ensure we have the right number of DOM elements
  if (colorDivs.length !== 5) {
    console.warn("Expected 5 color divs, found:", colorDivs.length);
    return;
  }

  paletteState.forEach((entry, i) => {
    const { color, isLocked } = entry;
    const div = colorDivs[i];
    if (!div) {
      console.warn("Color div at index", i, "is null");
      return;
    }

    div.innerHTML = '';
    div.style.backgroundColor = color;

    const textColor = chroma(color).luminance() > 0.5 ? '#000' : '#fff';

    const wrapper = document.createElement('div');
    wrapper.className = 'hex-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.gap = '6px';

    const hexText = document.createElement('span');
    hexText.className = 'hex-code';
    hexText.innerText = color.replace(/^#/, '').toUpperCase();
    hexText.style.color = textColor;
    hexText.tabIndex = 0;
    hexText.addEventListener('click', () => switchToInput(hexText, div, i));
    hexText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchToInput(hexText, div, i);
      }
    });

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
          setTimeout(() => copyIcon.classList.replace('fa-check', 'fa-copy'), 1000);
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
    lockIcon.className = isLocked ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open';
    lockIcon.classList.add('lock-icon');
    lockIcon.style.color = textColor;
    lockIcon.title = isLocked ? 'Unlock color' : 'Lock color';
    lockIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      paletteState[i].isLocked = !paletteState[i].isLocked;
      renderPaletteFromState(); // Refresh UI
    });

    const heartIcon = document.createElement('i');
    heartIcon.className = 'far fa-heart color-heart-icon';
    heartIcon.style.color = textColor;
    heartIcon.title = 'Save color to favorites';

    if (userIsLoggedIn) {
      heartIcon.style.display = 'block';
      heartIcon.classList.remove('hidden');
      const currentHexCode = color.replace(/^#/, '').toUpperCase();
      const favoriteHexCodes = sidebarFavoriteColors.map(c => c.hex_code.toUpperCase());
      if (favoriteHexCodes.includes(currentHexCode)) {
        heartIcon.classList.remove('far');
        heartIcon.classList.add('fas');
      }
    } else {
      heartIcon.style.display = 'none';
      heartIcon.classList.add('hidden');
    }

  heartIcon.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
    // Compute current hex dynamically from DOM to avoid stale closures
    let currentHexCode = null;
    const inputEl = div.querySelector('.hex-input');
    const spanEl = div.querySelector('.hex-code');
    if (inputEl && document.activeElement === inputEl) {
      currentHexCode = inputEl.value.toUpperCase();
    } else if (spanEl) {
      currentHexCode = spanEl.innerText.toUpperCase();
    } else {
      // Fallback to latest state or initial color
      const fallback = (paletteState?.[i]?.color || color) || '';
      currentHexCode = fallback.replace(/^#/, '').toUpperCase();
    }

      if (!userIsLoggedIn) {
        alert('Please log in to save favorite colors.');
        return;
      }

      const isLiked = heartIcon.classList.contains('fas');

      if (isLiked) {
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
    });

    wrapper.appendChild(hexText);
    wrapper.appendChild(copyIcon);
    wrapper.appendChild(dragIcon);
    wrapper.appendChild(lockIcon);
    wrapper.appendChild(heartIcon);

    div.appendChild(wrapper);
  });

  enforceGenColorLayout?.();
  initDragAndDrop?.();
  bindInputEvents();
  enforceIconVisibility();
  // After rebuilding the DOM, sync heart icons with favorite colors
  if (typeof updateHeartIconsForColors === 'function') {
    try { updateHeartIconsForColors(sidebarFavoriteColors || []); } catch (_) {}
  }
  try { updateToolbarFavoritePaletteIconLocalWithFallback?.(); } catch (_) {}
}

function recordPaletteChange(prevPaletteState) {
  const snapshot = prevPaletteState.map(entry => ({
    color: entry.color.toUpperCase(),
    isLocked: !!entry.isLocked
  }));



  const lastSnapshot = undoStack[undoStack.length - 1];
  const lastSerialized = lastSnapshot?.map(e => e.color + (e.isLocked ? '1' : '0')).join(',');
  const currentSerialized = snapshot.map(e => e.color + (e.isLocked ? '1' : '0')).join(',');

  if (lastSerialized === currentSerialized) {
    return;
  }

  undoStack.push(snapshot);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();

  redoStack = [];
  updateUndoRedoButtons();
}

function handleUndo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.parse(JSON.stringify(paletteState)));
  paletteState = JSON.parse(JSON.stringify(undoStack.pop()));

  renderPaletteFromState();
  updateUndoRedoButtons();
  
  // Ensure toolbar heart icon is updated after undo operation
  forceUpdateToolbarHeartIcon();
}

function handleRedo() {
  if (redoStack.length === 0) return;

  const prev = JSON.parse(JSON.stringify(paletteState)); // Save current state
  const next = JSON.parse(JSON.stringify(redoStack.pop())); // Get next state
  
  undoStack.push(prev); // Manually add current state to undo stack
  paletteState = next; // Apply next state


  renderPaletteFromState();
  updateUndoRedoButtons();
  
  // Ensure toolbar heart icon is updated after redo operation
  forceUpdateToolbarHeartIcon();
}

// Undo/Redo event listeners
['undo-button-desktop', 'undo-button-mobile'].forEach(id =>
  document.getElementById(id).addEventListener('click', handleUndo)
);
['redo-button-desktop', 'redo-button-mobile'].forEach(id =>
  document.getElementById(id).addEventListener('click', handleRedo)
);

// Dynamically enable/disable
function updateUndoRedoButtons() {
  const undoDisabled = undoStack.length === 0;
  const redoDisabled = redoStack.length === 0;

  ['undo-button-desktop', 'undo-button-mobile'].forEach(id =>
    document.getElementById(id).classList.toggle('disabled', undoDisabled)
  );
  ['redo-button-desktop', 'redo-button-mobile'].forEach(id =>
    document.getElementById(id).classList.toggle('disabled', redoDisabled)
  );
}

// ---------- Copy all HEXs ----------
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


// ---------- Save as PNG ----------
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
  if (!sidebarFavoritesPalettes) return;

  if (!sidebarFavoritePalettes || sidebarFavoritePalettes.length === 0) {
    sidebarFavoritesPalettes.innerHTML = '<p class="sidebar-favorites-placeholder fade-in">No favorite palettes yet.</p>';
    return;
  }

  sidebarFavoritesPalettes.innerHTML = sidebarFavoritePalettes.map((palette, idx) => {
    const colors = (palette.colors || []).map(color => `<div class="sidebar-fav-color-box" style="background:${color}"></div>`).join('');
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

  // Title editing
  document.querySelectorAll('.sidebar-fav-palette-title-input').forEach(input => {
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') input.blur();
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

  // Load palette button
  document.querySelectorAll('.sidebar-fav-expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prev = JSON.parse(JSON.stringify(paletteState));
      recordPaletteChange(prev); // Record before loading
      const idx = parseInt(btn.dataset.idx, 10);
      const palette = sidebarFavoritePalettes[idx];
      loadPaletteToMain(palette);
      closeSidebarFavorites();
      
      // Ensure toolbar heart icon is updated after loading palette
      setTimeout(() => {
        forceUpdateToolbarHeartIcon();
      }, 200);
    });
  });

  // Delete button
  document.querySelectorAll('.sidebar-fav-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(btn.dataset.idx, 10);
      const palette = sidebarFavoritePalettes[idx];
      const card = btn.closest('.sidebar-fav-palette-card');
      card.classList.add('fade-out');
      sidebarFavoritePalettes.splice(idx, 1);
      setTimeout(() => {
        renderSidebarFavoritePalettes();
        if (sidebarFavoritePalettes.length === 0) {
          const placeholder = document.querySelector('.sidebar-favorites-placeholder');
          if (placeholder) {
            setTimeout(() => placeholder.classList.add('fade-in'), 10);
          }
        }
      }, 400);
      try {
        await backend.delete_palette(palette.colors);
        fetchFavoritesFromBackend();
      } catch (err) {
        alert('Failed to delete palette.');
      }
    });
  });
}


  // Function to load a palette to the main area
  function loadPaletteToMain(palette) {
  // First update the global state
  paletteState = palette.colors.map(hex => ({
    color: hex,
    isLocked: false
  }));

  // Then record the change
  renderPaletteFromState();
  
  // Force update toolbar heart icon after loading palette
  forceUpdateToolbarHeartIcon();

  // Now apply the colors to the DOM
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
    hexText.tabIndex = 0;
    hexText.addEventListener("click", () => switchToInput(hexText, div, i));
    hexText.addEventListener("touchend", (e) => {
      if (e.cancelable && e.touches && e.touches.length > 0) {
        e.preventDefault();
      }
      switchToInput(hexText, div, i);
    });
    hexText.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        switchToInput(hexText, div, i);
      }
    });

    const copyIcon = document.createElement("i");
    copyIcon.className = "fas fa-copy copy-icon";
    copyIcon.style.color = textColor;
    copyIcon.title = "Copy to clipboard";
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

    const dragIcon = document.createElement("i");
    dragIcon.className = "fa-solid fa-left-right";
    dragIcon.style.color = textColor;
    dragIcon.style.fontSize = "1.2rem";
    dragIcon.title = "Drag to reorder";
    dragIcon.style.cursor = 'grab';

    const lockIcon = document.createElement("i");
    lockIcon.className = "fa-solid fa-lock-open lock-icon";
    lockIcon.style.color = textColor;
    lockIcon.title = "Lock color";

    const heartIcon = document.createElement("i");
    heartIcon.className = "far fa-heart color-heart-icon";
    heartIcon.style.color = textColor;
    heartIcon.title = "Save color to favorites";

    if (userIsLoggedIn) {
      heartIcon.style.display = "block";
      heartIcon.classList.remove('hidden');
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

    heartIcon.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!userIsLoggedIn) {
        alert("Please log in to save favorite colors.");
        return;
      }

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
        heartIcon.classList.remove("fas");
        heartIcon.classList.add("far");
        try {
          await backend.delete_color(currentHexCode);
          sidebarFavoriteColors = sidebarFavoriteColors.filter(c => c.hex_code.toUpperCase() !== currentHexCode);
          updateAllHeartIconsForColor(currentHexCode, false);
        } catch (err) {
          heartIcon.classList.remove("far");
          heartIcon.classList.add("fas");
          alert("Failed to remove color from favorites: " + err.message);
        }
      } else {
        heartIcon.classList.remove("far");
        heartIcon.classList.add("fas");
        try {
          await backend.add_color(currentHexCode);
          sidebarFavoriteColors.push({ hex_code: currentHexCode });
          updateAllHeartIconsForColor(currentHexCode, true);
        } catch (err) {
          heartIcon.classList.remove("fas");
          heartIcon.classList.add("far");
          alert("Failed to save color to favorites: " + err.message);
        }
      }
    });

    // Append all icons and text to the wrapper
    wrapper.appendChild(hexText);
    wrapper.appendChild(copyIcon);
    wrapper.appendChild(dragIcon);
    wrapper.appendChild(lockIcon);
    wrapper.appendChild(heartIcon);
    div.appendChild(wrapper);
  });

  enforceGenColorLayout?.();
  initDragAndDrop?.();
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
  
  // Update toolbar heart icon after closing sidebar
  forceUpdateToolbarHeartIcon();
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
    const palettes = await backend.get_palettes();
    // Cache favorites for local checks
    sidebarFavoritePalettes = Array.isArray(palettes) ? palettes : [];
    updateFavoritesDropdown(palettes);

    const current = getCurrentPaletteHexes();
    const found = palettes.some(p => palettesMatchUnordered(p.colors, current));
    isCurrentPaletteFavorite = found;
    toggleLikeButton(found);
  } catch (err) {
    console.error("Error fetching favorites:", err);
  }
}

// Local-only toolbar heart state based on cached palettes (order-insensitive)
function updateToolbarFavoritePaletteIconLocal() {
  const current = getCurrentPaletteHexes();
  const list = Array.isArray(sidebarFavoritePalettes) ? sidebarFavoritePalettes : [];
  const found = list.some(p => palettesMatchUnordered(p.colors, current));
  toggleLikeButton(found);
}

// Enhanced version that ensures favorites are loaded before checking
async function updateToolbarFavoritePaletteIconLocalWithFallback() {
  // First try with cached data
  updateToolbarFavoritePaletteIconLocal();
  
  // If no favorites are cached, try to fetch them
  if (!sidebarFavoritePalettes || sidebarFavoritePalettes.length === 0) {
    try {
      await fetchFavoritesFromBackend();
      // After fetching, check again
      updateToolbarFavoritePaletteIconLocal();
    } catch (err) {
      console.log("Could not fetch favorites for toolbar update:", err);
    }
  }
}

// Force update toolbar heart icon - useful for mobile when loading palettes
function forceUpdateToolbarHeartIcon() {
  if (userIsLoggedIn) {
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      updateToolbarFavoritePaletteIconLocalWithFallback();
    }, 100);
  }
}

function palettesMatch(p1, p2) {
  if (!Array.isArray(p1) || !Array.isArray(p2)) return false;
  if (p1.length !== p2.length) return false;
  return p1.every((val, index) => val.toUpperCase() === p2[index].toUpperCase());
}

// Order-insensitive comparison of two palettes (treat as multisets)
function palettesMatchUnordered(p1, p2) {
  if (!Array.isArray(p1) || !Array.isArray(p2)) return false;
  if (p1.length !== p2.length) return false;
  const norm = (arr) => arr.map(v => (v || '').replace(/^#/, '').toUpperCase()).sort();
  const a = norm(p1);
  const b = norm(p2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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
        hexText.addEventListener("click", () => switchToInput(hexText, div, i));
        hexText.addEventListener("touchend", (e) => {
          if (e.cancelable && e.touches && e.touches.length > 0) {
            e.preventDefault();
          }
          switchToInput(hexText, div, i);
        });
        hexText.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            switchToInput(hexText, div, i);
          }
        });
        const copyIcon = document.createElement("i");
        copyIcon.className = "fas fa-copy copy-icon";
        copyIcon.style.color = textColor;
        copyIcon.title = "Copy to clipboard";
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
        // Read lock status from paletteState instead of DOM dataset
        let isLocked = Array.isArray(paletteState) && paletteState[i] ? paletteState[i].isLocked : false;
        if (isLocked) {
          lockIcon.classList.remove('fa-lock-open');
          lockIcon.classList.add('fa-lock');
          lockIcon.title = 'Unlock color';
        }
        lockIcon.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          isLocked = !isLocked;
          // Update paletteState directly instead of DOM dataset
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
      
      // Force update toolbar heart icon after loading palette
      forceUpdateToolbarHeartIcon();
      
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
      // Find the matching saved palette (order-insensitive) and delete using its stored order
      let matched = null;
      const list = Array.isArray(sidebarFavoritePalettes) ? sidebarFavoritePalettes : [];
      matched = list.find(p => palettesMatchUnordered(p.colors, paletteColors));
      if (!matched) {
        // Fallback: fetch latest and try again
        const latest = await backend.get_palettes();
        sidebarFavoritePalettes = Array.isArray(latest) ? latest : [];
        matched = sidebarFavoritePalettes.find(p => palettesMatchUnordered(p.colors, paletteColors));
      }
      const colorsToDelete = matched?.colors || paletteColors;
      await backend.delete_palette(colorsToDelete);
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
// Global username to represent the signed-in user across providers
let username = null;

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
  
  // Check if user is authenticated via AuthClient (Internet Identity or NFID)
  if (await authClient.isAuthenticated()) {
    const identity = authClient.getIdentity();
    const principal = identity.getPrincipal().toText();
    updateIdentityDisplay(principal);
    return;
  }
  
  // Check if user is connected via Plug wallet
  if (window.ic && window.ic.plug) {
    try {
      const isConnected = await window.ic.plug.isConnected();
      if (isConnected) {
        const principal = await window.ic.plug.agent.getPrincipal();
        const principalText = principal.toText();
        updateIdentityDisplay(principalText);
        return;
      }
    } catch (error) {
      console.log("Plug wallet connection check failed:", error);
      // If there's an error checking connection, try to disconnect to reset state
      try {
        await window.ic.plug.disconnect();
      } catch (disconnectError) {
        console.log("Plug wallet disconnect error:", disconnectError);
      }
    }
  } else {
    // If Plug wallet is not available yet, wait a bit and try again
    setTimeout(async () => {
      if (window.ic && window.ic.plug) {
        try {
          const isConnected = await window.ic.plug.isConnected();
          if (isConnected) {
            const principal = await window.ic.plug.agent.getPrincipal();
            const principalText = principal.toText();
            updateIdentityDisplay(principalText);
          }
        } catch (error) {
          console.log("Delayed Plug wallet connection check failed:", error);
        }
      }
    }, 1000);
  }
  
  // No authentication found
  userIsLoggedIn = false;
  username = null;
  profileName.textContent = "Sign In";
  fullPrincipalSpan.textContent = "";
  tooltip.style.display = "none";
  logoutButton.classList.add("disabled");
  updateFavoritesUI(false);
  // Remove username section from dropdown if present
  removeUserMenuIdentitySection();
}

// Internet Identity login button event listener
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

// NFID login button event listener
const loginNfidButton = document.getElementById("login-nfid");
loginNfidButton.addEventListener("click", async () => {
  if (!authClient) {
    authClient = await AuthClient.create();
  }
  await authClient.login({
    identityProvider: "https://nfid.one/authenticate",
    onSuccess: async () => {
      const principal = authClient.getIdentity().getPrincipal().toText();
      updateIdentityDisplay(principal);
    }
  });
});

// Plug Wallet login button event listener
const loginPlugButton = document.getElementById("login-plug");
loginPlugButton.addEventListener("click", async () => {
  try {
    // Check if Plug wallet extension is available
    if (!window.ic || !window.ic.plug) {
      alert("Plug wallet extension is not installed. Please install it from https://plugwallet.ooo/");
      return;
    }

    // Request connection to Plug wallet
    await window.ic.plug.requestConnect({
      whitelist: ["rimxq-wyaaa-aaaae-qfd2q-cai"], // Backend canister ID
      host: "https://mainnet.dfinity.network"
    });

    // Get the principal from Plug wallet
    const principal = await window.ic.plug.agent.getPrincipal();
    const principalText = principal.toText();
    
    // Update the identity display
    updateIdentityDisplay(principalText);
  } catch (error) {
    console.error("Plug wallet login failed:", error);
    if (error.message && error.message.includes("User rejected")) {
      alert("Connection to Plug wallet was cancelled.");
    } else {
      alert("Failed to connect to Plug wallet. Please try again.");
    }
  }
});

if (logoutButton) {
  logoutButton.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (logoutButton.disabled) {
      return;
    }

    try {
      // Logout from AuthClient (Internet Identity and NFID)
      if (!authClient) {
        authClient = await AuthClient.create();
      }
      await authClient.logout({ returnTo: window.location.origin });
      
      // Disconnect from Plug wallet if connected
      if (window.ic && window.ic.plug) {
        try {
          await window.ic.plug.disconnect();
        } catch (plugError) {
          console.log("Plug wallet disconnect error (may not be connected):", plugError);
        }
      }
      
      console.log("Logout success, reloading page");
      window.location.reload();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  });
}

function updateIdentityDisplay(principal) {
  userIsLoggedIn = true;
  username = principal;
  profileName.textContent = username.slice(0, 12) + "...";
  profileName.dataset.fullPrincipal = username;
  fullPrincipalSpan.textContent = username;
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
  
  // Ensure toolbar heart icon is updated after login
  setTimeout(() => {
    forceUpdateToolbarHeartIcon();
  }, 500);
  // Ensure username line is visible inside the user menu
  addOrUpdateUserMenuIdentitySection();
}

// Inject or update "Signed in as" section inside the dropdown menu
function addOrUpdateUserMenuIdentitySection() {
  if (!dropdownMenu || !userIsLoggedIn || !username) return;

  // Header: "Signed in as:"
  let signedInHeader = dropdownMenu.querySelector('#dropdownSignedInHeader');
  if (!signedInHeader) {
    signedInHeader = document.createElement('div');
    signedInHeader.id = 'dropdownSignedInHeader';
    signedInHeader.className = 'dropdown-header';
    signedInHeader.textContent = 'Signed in as:';
    // Prepend to the very top of the menu
    dropdownMenu.insertBefore(signedInHeader, dropdownMenu.firstElementChild);
  }

  // Row with the full username/principal and a copy icon
  let userRow = dropdownMenu.querySelector('#dropdownSignedInUser');
  if (!userRow) {
    userRow = document.createElement('div');
    userRow.id = 'dropdownSignedInUser';
    userRow.className = 'dropdown-option';
    userRow.style.display = 'flex';
    userRow.style.alignItems = 'center';
    userRow.style.justifyContent = 'space-between';

    // Leading user icon (dark), same as the button
    const userIcon = document.createElement('i');
    userIcon.id = 'dropdownUserIcon';
    userIcon.className = 'fa-solid fa-user';
    userIcon.style.color = '#444';
    userIcon.style.marginRight = '8px';

    const nameSpan = document.createElement('span');
    nameSpan.id = 'dropdownSignedInUsername';
    // Keep the username on a single line with ellipsis
    nameSpan.style.whiteSpace = 'nowrap';
    nameSpan.style.overflow = 'hidden';
    nameSpan.style.textOverflow = 'ellipsis';
    nameSpan.style.flex = '1 1 auto';
    nameSpan.style.marginRight = '8px';

    const copyIcon = document.createElement('i');
    copyIcon.className = 'fas fa-copy copy-icon';
    copyIcon.title = 'Copy Principal';
    copyIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(username).then(() => {
        copyIcon.classList.replace('fa-copy', 'fa-check');
        setTimeout(() => copyIcon.classList.replace('fa-check', 'fa-copy'), 1000);
      });
    });

    userRow.appendChild(userIcon);
    userRow.appendChild(nameSpan);
    userRow.appendChild(copyIcon);
    // Ensure it sits directly under the header at the top
    if (signedInHeader.nextSibling) {
      dropdownMenu.insertBefore(userRow, signedInHeader.nextSibling);
    } else {
      dropdownMenu.appendChild(userRow);
    }
  }

  // If elements already existed but were not at the top, move them
  if (dropdownMenu.firstElementChild !== signedInHeader) {
    dropdownMenu.insertBefore(signedInHeader, dropdownMenu.firstElementChild);
  }
  if (signedInHeader.nextSibling !== userRow) {
    dropdownMenu.insertBefore(userRow, signedInHeader.nextSibling);
  }

  // Ensure user icon exists in case the row pre-existed without it
  let userIcon = userRow.querySelector('#dropdownUserIcon');
  if (!userIcon) {
    userIcon = document.createElement('i');
    userIcon.id = 'dropdownUserIcon';
    userIcon.className = 'fa-solid fa-user';
    userIcon.style.color = '#444';
    userIcon.style.marginRight = '8px';
    const nameSpanExisting = userRow.querySelector('#dropdownSignedInUsername');
    if (nameSpanExisting) {
      userRow.insertBefore(userIcon, nameSpanExisting);
    } else {
      userRow.prepend(userIcon);
    }
  }

  const nameSpan = dropdownMenu.querySelector('#dropdownSignedInUsername');
  if (nameSpan) {
    const shortName = username && username.length > 12 ? (username.slice(0, 12) + '...') : username;
    nameSpan.textContent = shortName;
    nameSpan.title = username;
  }
}

function removeUserMenuIdentitySection() {
  if (!dropdownMenu) return;
  const header = dropdownMenu.querySelector('#dropdownSignedInHeader');
  const row = dropdownMenu.querySelector('#dropdownSignedInUser');
  if (header) header.remove();
  if (row) row.remove();
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
  // --- Fix: Only one palette generated on load, no history ---
  if (typeof undoStack !== 'undefined') undoStack = [];
  if (typeof redoStack !== 'undefined') redoStack = [];
  if (typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();
  // Initialize sidebar variables
  sidebarFavoritesSlider = document.getElementById('sidebar-favorites-slider');
  sidebarFavoritesPalettes = document.getElementById('sidebar-favorites-palettes');
  sidebarFavoritesColors = document.getElementById('sidebar-favorites-colors');
  // Only generate one palette and record the initial state
  // Initialize paletteState as null first, then create colors
  paletteState = null;
  paletteState = Array.from({ length: 5 }, (_, i) => ({ color: getNewColor(i, paletteState), isLocked: false }));
  renderPaletteFromState();
  // Fetch favorites after DOM is ready
  if (userIsLoggedIn) {
    fetchFavoritesFromBackend();
    fetchFavoriteColorsFromBackend();
  }
  // Rebuild .gen-color DOM to attach hex code editing listeners after initial load
  rebuildGenColorDOMForLayout();
  try { updateToolbarFavoritePaletteIconLocalWithFallback?.(); } catch (_) {}
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialPaletteLoad);
} else {
  initialPaletteLoad();
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

  paletteState.forEach((entry, i) => {
    const { color, isLocked } = entry;
    const div = colorDivs[i];
    if (!div) return;

    // Attach paletteState reference to the div for drag reordering
    div._paletteStateRef = entry;

    div.innerHTML = '';
    div.style.backgroundColor = color;

    const hex = color.replace(/^#/, '').toUpperCase();
    let textColor = '#fff';
    try {
      textColor = chroma(color).luminance() > 0.5 ? '#000' : '#fff';
    } catch (e) {}

    // Create hex text
    const hexText = document.createElement('span');
    hexText.className = 'hex-code';
    hexText.innerText = hex;
    hexText.style.color = textColor;
    hexText.tabIndex = 0;
    hexText.addEventListener('click', () => switchToInput(hexText, div, i));
    hexText.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      switchToInput(hexText, div, i);
    });
    hexText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchToInput(hexText, div, i);
      }
    });

    // Create icons
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
          setTimeout(() => copyIcon.classList.replace('fa-check', 'fa-copy'), 1000);
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
    lockIcon.className = isLocked ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open';
    lockIcon.classList.add('lock-icon');
    lockIcon.style.color = textColor;
    lockIcon.title = isLocked ? 'Unlock color' : 'Lock color';
    lockIcon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      paletteState[i].isLocked = !paletteState[i].isLocked;
      renderPaletteFromState();
    });

    const heartIcon = document.createElement('i');
    heartIcon.className = 'far fa-heart color-heart-icon';
    heartIcon.style.color = textColor;
    heartIcon.title = 'Save color to favorites';

    const currentHexCode = hex;
    if (userIsLoggedIn) {
      heartIcon.style.display = 'block';
      heartIcon.classList.remove('hidden');
      const favoriteHexCodes = sidebarFavoriteColors.map(c => c.hex_code.toUpperCase());
      if (favoriteHexCodes.includes(currentHexCode)) {
        heartIcon.classList.remove('far');
        heartIcon.classList.add('fas');
      }
    } else {
      heartIcon.style.display = 'none';
      heartIcon.classList.add('hidden');
    }

    heartIcon.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!userIsLoggedIn) {
        alert('Please log in to save favorite colors.');
        return;
      }
      // Determine current hex from DOM at click time to avoid stale values
      let dynamicHex = null;
      const activeInput = div.querySelector('.hex-input');
      const spanCode = div.querySelector('.hex-code');
      if (activeInput && document.activeElement === activeInput) {
        dynamicHex = activeInput.value.toUpperCase();
      } else if (spanCode) {
        dynamicHex = spanCode.innerText.toUpperCase();
      } else {
        const fallback = (paletteState?.[i]?.color || color) || '';
        dynamicHex = fallback.replace(/^#/, '').toUpperCase();
      }
      const isLiked = heartIcon.classList.contains('fas');
      try {
        if (isLiked) {
          await backend.delete_color(dynamicHex);
          sidebarFavoriteColors = sidebarFavoriteColors.filter(c => c.hex_code.toUpperCase() !== dynamicHex);
          heartIcon.classList.remove('fas');
          heartIcon.classList.add('far');
          updateAllHeartIconsForColor(dynamicHex, false);
        } else {
          await backend.add_color(dynamicHex);
          sidebarFavoriteColors.push({ hex_code: dynamicHex });
          heartIcon.classList.remove('far');
          heartIcon.classList.add('fas');
          updateAllHeartIconsForColor(dynamicHex, true);
        }
      } catch (err) {
        alert('Failed to update favorite: ' + err.message);
      }
    };

    // Build mobile layout (left + right)
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
    [copyIcon, dragIcon, lockIcon, heartIcon].forEach(icon => {
      if (icon) {
        // This function is only called for mobile layout, so always show icons
        icon.style.opacity = '1';
        icon.style.pointerEvents = 'auto';
        right.appendChild(icon);
      }
    });

    div.appendChild(left);
    div.appendChild(right);
  });

  enforceGenColorLayout();
  initDragAndDrop();
  bindInputEvents();
  
  // After rebuilding the DOM, sync heart icons with favorite colors
  if (typeof updateHeartIconsForColors === 'function') {
    try { updateHeartIconsForColors(sidebarFavoriteColors || []); } catch (_) {}
  }
  try { updateToolbarFavoritePaletteIconLocalWithFallback?.(); } catch (_) {}
}

// Listen for window resize and update layout if mode changes
window.addEventListener('resize', () => {
  const vertical = isCurrentVerticalMode();
  if (vertical !== currentLayoutVertical) {
    currentLayoutVertical = vertical;
    rebuildGenColorDOMForLayout();
    // Update toolbar heart icon when switching between mobile/desktop
    forceUpdateToolbarHeartIcon();
  }
});
