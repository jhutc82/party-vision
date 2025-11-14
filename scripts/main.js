// ==============================================
// PARTY VISION MODULE - MAIN SCRIPT
// Version 2.5.2 - Bug Fixes & PF2e Improvements
// ==============================================

import { FORMATION_PRESETS } from './formations.js';

// ==============================================
// CONSTANTS
// ==============================================

const MAX_PORTRAITS = 8;
const PORTRAIT_SIZE = 32;
const PORTRAIT_SPACING = 36;
const NEARBY_DISTANCE_MULTIPLIER = 3;
const SPIRAL_SEARCH_MAX_RADIUS = 20;
const WALL_COLLISION_TEST_OFFSET = 5; // pixels from edge for collision testing

// ==============================================
// GLOBAL STATE
// ==============================================

// Global state for follow-the-leader mode
let followLeaderMode = false;
let leaderToken = null;
let followerOffsets = new Map();

// Debouncing for party lighting updates
const pendingLightingUpdates = new Map(); // Map<partyTokenId, timeoutId>
const LIGHTING_UPDATE_DEBOUNCE_MS = 100; // Wait 100ms before actually updating

// Debug mode flag (set to false in production)
const DEBUG_MODE = false;

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validate and sanitize image URL to prevent XSS
 * @param {string} url - URL to validate
 * @returns {string} Safe URL or default placeholder
 */
function sanitizeImageURL(url) {
  if (typeof url !== 'string') return 'icons/svg/mystery-man.svg';
  const urlLower = url.toLowerCase().trim();
  // Block javascript: and data: URLs (data: can contain SVG with scripts)
  if (urlLower.startsWith('javascript:') || urlLower.startsWith('data:')) {
    console.warn('Party Vision | Blocked potentially malicious URL:', url);
    return 'icons/svg/mystery-man.svg';
  }
  return url;
}

/**
 * Validate CSS class name to prevent injection
 * @param {string} className - Class name to validate
 * @returns {string} Safe class name
 */
function sanitizeClassName(className) {
  if (typeof className !== 'string') return 'fas fa-circle';
  // Only allow alphanumeric, hyphens, spaces, and underscores
  const sanitized = className.replace(/[^a-zA-Z0-9\-_\s]/g, '');
  return sanitized || 'fas fa-circle';
}

/**
 * Debug logging (only logs when DEBUG_MODE is true)
 * @param {...any} args - Arguments to log
 */
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

// ==============================================
// INITIALIZATION
// ==============================================

Hooks.once('init', () => {
  console.log('Party Vision | Initializing Enhanced Module v2.5.2');
  
  // Explicit check for Foundry version
  if (!game || !game.version) {
    console.error('Party Vision | Foundry game object not available');
    return;
  }
  
  console.log('Party Vision | Foundry version:', game.version);

  // --- REGISTER MODULE SETTINGS FIRST (before any early returns) ---
  console.log('Party Vision | Registering module settings...');
  
  game.settings.register('party-vision', 'showHudButtons', {
    name: "Show HUD Buttons",
    hint: "Display 'Form Party' and 'Deploy Party' buttons on the Token HUD.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('party-vision', 'allowPlayerActions', {
    name: "Allow Players to Form/Deploy Party",
    hint: "Allow players to use Form/Deploy Party functions. Default is GM-only.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register('party-vision', 'autoDeployOnCombat', {
    name: "Auto-Deploy on Combat Start",
    hint: "Automatically deploy the party when combat begins.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('party-vision', 'autoFormOnCombatEnd', {
    name: "Auto-Form on Combat End",
    hint: "Automatically reform the party when combat ends.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('party-vision', 'animateDeployment', {
    name: "Animate Deployment",
    hint: "Smoothly animate tokens when deploying the party.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('party-vision', 'deploymentAnimationSpeed', {
    name: "Deployment Animation Speed (ms)",
    hint: "Duration of deployment animation in milliseconds. Lower = faster.",
    scope: 'world',
    config: true,
    type: Number,
    default: 500,
    range: {
      min: 100,
      max: 2000,
      step: 100
    }
  });

  game.settings.register('party-vision', 'showMemberPortraits', {
    name: "Show Member Portraits",
    hint: "Display character portraits around the party token.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('party-vision', 'showRangeIndicator', {
    name: "Show Range Indicator",
    hint: "Show visual indicator of party member spread distance.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('party-vision', 'lastFormationPreset', {
    name: "Last Formation Preset",
    hint: "Remembers the last formation preset used.",
    scope: 'client',
    config: false,
    type: String,
    default: 'current'
  });

  game.settings.register('party-vision', 'lastDeployDirection', {
    name: "Last Deploy Direction",
    hint: "Remembers the last direction the party was deployed.",
    scope: 'client',
    config: false,
    type: String,
    default: 'north'
  });

  game.settings.register('party-vision', 'savedPartyConfigs', {
    name: "Saved Party Configurations",
    hint: "Remembers party names and images for specific token combinations.",
    scope: 'world',
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register('party-vision', 'autoRollInitiative', {
    name: "Auto-Roll Initiative for Party",
    hint: "Automatically roll initiative for all party members when adding to combat.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('party-vision', 'showHealthIndicator', {
    name: "Show Party Health Indicator",
    hint: "Display an aggregate health bar on the party token.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('party-vision', 'showStatusEffects', {
    name: "Show Status Effect Indicators",
    hint: "Display active status effects from party members on the party token.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('party-vision', 'showPassivePerception', {
    name: "Show Perception",
    hint: "Display the highest perception value in the party token tooltip on hover. Shows passive perception for D&D 5e, perception modifier for PF2e.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('party-vision', 'enableDoubleClickSheets', {
    name: "Double-Click Opens All Sheets",
    hint: "Double-clicking a party token opens all member actor sheets.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('party-vision', 'enableMemberAccessPanel', {
    name: "Enable Member Access Panel",
    hint: "Show a quick access panel for party members when hovering over party token.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('party-vision', 'smartFormationOrdering', {
    name: "Smart Formation Ordering",
    hint: "Automatically arrange party members in formations with leader first, then tanks/defenders, strikers, and casters/support in back. Works with D&D 5e and PF2e.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  console.log('Party Vision | Settings registered successfully');
  
  // --- CHECK DEPENDENCIES ---

  // Check for libWrapper (supports v1.12+ which is an object, not a function)
  if (!game.modules.get('lib-wrapper')?.active) {
    console.error('Party Vision | libWrapper not found! This module requires libWrapper to function.');
    ui.notifications.error('Party Vision requires the libWrapper module. Please install it from the Foundry module browser.');
    return;
  }
  
  console.log('Party Vision | libWrapper detected');
  
  // Register libWrapper hooks
  try {
    // Wrap Token._refreshVisibility to allow multiple users to see from the same party token
    libWrapper.register('party-vision', 'Token.prototype._refreshVisibility', function(wrapped, ...args) {
      // Call original method
      const result = wrapped(...args);
      
      // Check if this is a party token
      const memberData = this.document.getFlag('party-vision', 'memberData');
      if (!memberData || memberData.length === 0) {
        return result;
      }
      
      // For party tokens, make visible to all members
      // This allows each player to see from the party token using their character's vision
      const memberActorIds = memberData.map(m => m.actorId);
      
      // Check if current user owns any of the member actors
      const currentUserOwns = memberActorIds.some(actorId => {
        const actor = game.actors.get(actorId);
        return actor && actor.testUserPermission(game.user, "OWNER");
      });
      
      if (currentUserOwns) {
        this.visible = true;
        this.renderable = true;
      }
      
      return result;
    }, 'WRAPPER');
    
    console.log('Party Vision | Vision hooks registered successfully');
  } catch (e) {
    console.error('Party Vision | Failed to register libWrapper hooks:', e);
    ui.notifications.error('Party Vision failed to initialize vision system. Check console for details.');
  }
  
  // Register keybinding for Follow-the-Leader toggle
  game.keybindings.register('party-vision', 'toggleFollowLeader', {
    name: "Toggle Follow-the-Leader Mode",
    hint: "Enable/disable follow-the-leader mode for selected tokens",
    editable: [{ key: "KeyL", modifiers: ["Control"] }],
    onDown: () => {
      toggleFollowLeaderMode();
      return true;
    },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });
  
  console.log('Party Vision | Initialization complete');
});

// ==============================================
// READY HOOK - POST-INITIALIZATION SETUP
// ==============================================

Hooks.once('ready', () => {
  console.log('Party Vision | Ready hook fired');
  
  if (!game.user) {
    console.warn('Party Vision | No game.user available');
    return;
  }
  
  console.log('Party Vision | User:', game.user.name, '| Role:', game.user.role);
  
  // Set up token HUD buttons
  Hooks.on('renderTokenHUD', (app, html, data) => {
    // Safety check: ensure settings are registered before accessing
    try {
      if (!game.settings.settings.has('party-vision.showHudButtons')) {
        console.warn('Party Vision | Settings not yet registered, skipping HUD setup');
        return;
      }
    } catch (e) {
      console.warn('Party Vision | Settings check failed:', e);
      return;
    }
    
    if (!game.settings.get('party-vision', 'showHudButtons')) return;
    
    const canAct = game.user.isGM || game.settings.get('party-vision', 'allowPlayerActions');
    if (!canAct) return;
    
    // Ensure html is a jQuery object
    const $html = html instanceof jQuery ? html : $(html);
    const col = $html.find('.col.left');
    const controlled = canvas.tokens.controlled;
    
    // Show FORM PARTY button (multiple tokens selected)
    if (controlled.length > 1) {
      const formButton = $(`
        <div class="control-icon party-vision-form" title="Form Party">
          <i class="fas fa-users"></i>
        </div>
      `);
      
      formButton.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showFormPartyDialog();
      });
      
      col.append(formButton);
    }
    
    // Show DEPLOY PARTY button (party token selected)
    if (controlled.length === 1) {
      const token = controlled[0];
      const memberData = token.document.getFlag('party-vision', 'memberData');
      
      if (memberData && memberData.length > 0) {
        const deployButton = $(`
          <div class="control-icon party-vision-deploy" title="Deploy Party (Right-click to cycle lighting)">
            <i class="fas fa-chevron-circle-right"></i>
          </div>
        `);

        deployButton.on('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showDeployDialog(token);
        });

        deployButton.on('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          cycleLightSource(token);
        });

        col.append(deployButton);
      }
    }
  });
  
  // Check for party tokens when scene loads
  Hooks.on('canvasReady', () => {
    console.log('Party Vision | Canvas ready - checking for party tokens');
    
    const partyTokens = canvas.tokens.placeables.filter(t => {
      const memberData = t.document.getFlag('party-vision', 'memberData');
      return memberData && memberData.length > 0;
    });
    
    if (partyTokens.length > 0) {
      console.log(`Party Vision | Found ${partyTokens.length} party token(s) on scene`);
      
      // Refresh lighting for all party tokens
      partyTokens.forEach(token => {
        updatePartyLightingFromActors(token);
      });
    }
  });
});

// ==============================================
// PLAYER-FRIENDLY ENHANCEMENTS
// ==============================================

// Double-click to open all actor sheets
Hooks.on('targetToken', (user, token, targeted) => {
  // This is a workaround since there's no direct double-click hook
  // We'll use a different approach with canvas click events
});

// Track when we handle a party token double-click
let lastPartyDoubleClick = 0;

// Wrap Token._onClickLeft2 to intercept double-clicks on party tokens using libWrapper
Hooks.once('ready', () => {
  try {
    libWrapper.register('party-vision', 'Token.prototype._onClickLeft2', function(wrapped, event) {
      // Check if this is a party token
      const memberData = this.document.getFlag('party-vision', 'memberData');

      if (memberData && memberData.length > 0 && game.settings.get('party-vision', 'enableDoubleClickSheets')) {
        console.log('Party Vision | Double-click detected on party token');

        // Track that we handled a party double-click
        lastPartyDoubleClick = Date.now();

        // Open member sheets
        openAllMemberSheets(this);

        // Prevent default behavior (opening actor sheet)
        return;
      }

      // Call original method for non-party tokens
      return wrapped(event);
    }, 'MIXED');

    console.log('Party Vision | Double-click handler registered successfully');
  } catch (e) {
    console.error('Party Vision | Failed to register double-click handler:', e);
  }
});

// Add context menu options for party tokens
Hooks.on('getTokenConfigHeaderButtons', (app, buttons) => {
  const token = app.object;
  const memberData = token.document?.getFlag('party-vision', 'memberData');

  if (memberData && memberData.length > 0) {
    buttons.unshift({
      label: 'View Members',
      class: 'party-vision-view-members',
      icon: 'fas fa-users',
      onclick: () => showMemberAccessPanel(token)
    });
  }
});

// Note: The 'getTokenHUDMenuItems' hook doesn't exist in Foundry VTT
// Context menu functionality is provided through other hooks and HUD buttons

// Enhance token HUD to add combat toggle functionality
Hooks.on('renderTokenHUD', (app, html, data) => {
  const token = canvas.tokens.get(data._id);
  if (!token) return;

  const memberData = token.document.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) return;

  // Find the combat toggle button
  const combatButton = $(html).find('.control-icon[data-action="combat"]');

  if (combatButton.length) {
    // Override the click handler for party tokens
    combatButton.off('click');
    combatButton.on('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await togglePartyCombat(token);
    });
  }

  // Fix movement type selector for party tokens (PF2e)
  if (game.system.id === 'pf2e') {
    const movementData = token.document.getFlag('party-vision', 'movement');

    console.log(`Party Vision | Party token detected, movement data:`, movementData);

    if (movementData && movementData.types && movementData.types.length > 0) {
      // Wait a moment for the HUD to fully render
      setTimeout(() => {
        // Try multiple possible selectors for the movement dropdown
        let speedSelector = $(html).find('.attribute.speed select');

        if (!speedSelector.length) {
          speedSelector = $(html).find('select[name="movement"]');
        }

        if (!speedSelector.length) {
          speedSelector = $(html).find('.speed select');
        }

        if (!speedSelector.length) {
          // Try to find any select in the speed-related area
          speedSelector = $(html).find('[data-action="speed"] select, .col.middle select');
          console.log(`Party Vision | Trying fallback selector, found: ${speedSelector.length}`);
        }

        if (speedSelector.length) {
          console.log(`Party Vision | Found movement selector, current options:`, speedSelector.find('option').map((i, el) => $(el).val()).get());

          // Clear existing options
          speedSelector.empty();

          // Add movement types from party data
          movementData.types.forEach(type => {
            const option = $('<option></option>')
              .attr('value', type)
              .text(type.charAt(0).toUpperCase() + type.slice(1));
            speedSelector.append(option);
          });

          // Set default selection
          const defaultType = getDefaultMovementType();
          if (movementData.types.includes(defaultType)) {
            speedSelector.val(defaultType);
          } else {
            speedSelector.val(movementData.types[0]);
          }

          console.log(`Party Vision | ✅ Updated movement selector with types: ${movementData.types.join(', ')}`);
        } else {
          console.log(`Party Vision | ⚠️ Could not find movement selector in Token HUD`);
          console.log(`Party Vision | Available elements:`, $(html).find('select').map((i, el) => el.className + ' ' + el.name).get());
        }
      }, 50);
    }
  }
});

// Chat command listener for /party commands
Hooks.on('chatMessage', (chatLog, message, chatData) => {
  if (!message.startsWith('/party')) return true;

  const args = message.slice(6).trim().split(' ');
  const command = args[0]?.toLowerCase();

  switch (command) {
    case 'status':
      showPartyStatus();
      break;
    case 'members':
      showPartyMembers();
      break;
    case 'help':
      showPartyHelp();
      break;
    default:
      ChatMessage.create({
        content: `<p>Unknown party command: ${escapeHTML(command)}</p><p>Try /party help for available commands.</p>`,
        whisper: [game.user.id]
      });
  }

  return false; // Prevent the message from being sent to chat
});

// Enhance token tooltips with perception display (system-agnostic)
Hooks.on('hoverToken', (token, hovered) => {
  if (!game.settings.get('party-vision', 'showPassivePerception')) return;

  const memberData = token.document?.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) return;

  // Validate tooltip exists
  if (!token.tooltip) {
    console.warn('Party Vision | Token has no tooltip object');
    return;
  }

  const tooltip = token.tooltip;

  if (hovered) {
    // Get the current tooltip text and strip any existing perception text
    const currentText = tooltip.text || '';
    const cleanText = currentText.replace(/\s*\|\s*(PP|Perception|Perc):\s*[+\-]?\d+/g, '');

    // Store the clean original tooltip text
    if (!token._pvOriginalTooltip || token._pvOriginalTooltip.match(/(PP|Perception|Perc):/)) {
      token._pvOriginalTooltip = cleanText;
    }

    const perceptionValue = getHighestPassivePerception(token);
    if (perceptionValue !== null && perceptionValue !== undefined) {
      // Format display based on game system
      let perceptionLabel;
      if (game.system.id === 'pf2e') {
        // PF2e: show as modifier (e.g., "Perception: +5")
        const sign = perceptionValue >= 0 ? '+' : '';
        perceptionLabel = `Perception: ${sign}${perceptionValue}`;
      } else {
        // D&D 5e and others: show as passive perception (e.g., "PP: 15")
        perceptionLabel = `PP: ${perceptionValue}`;
      }

      // Set tooltip with perception appended (using clean original text)
      tooltip.text = `${token._pvOriginalTooltip} | ${perceptionLabel}`;
    }
  } else {
    // Restore original tooltip when hover ends (strip perception text just in case)
    const cleanText = (token._pvOriginalTooltip || tooltip.text || '').replace(/\s*\|\s*(PP|Perception|Perc):\s*[+\-]?\d+/g, '');
    token._pvOriginalTooltip = cleanText;
    tooltip.text = cleanText;
  }
});

// Clean up tooltip cache and debounce timers when token is destroyed to prevent memory leaks
Hooks.on('destroyToken', (token) => {
  // Clean up tooltip cache
  if (token._pvOriginalTooltip) {
    delete token._pvOriginalTooltip;
  }

  // Clean up pending lighting updates
  if (pendingLightingUpdates.has(token.id)) {
    clearTimeout(pendingLightingUpdates.get(token.id));
    pendingLightingUpdates.delete(token.id);
  }

  // Clean up PIXI resources (health bars and status effect icons)
  try {
    // Remove party health bar
    const healthBar = token.children.find(c => c.name === 'partyHealthBar');
    if (healthBar) {
      token.removeChild(healthBar);
      healthBar.destroy({ children: true });
    }

    // Remove party effect icons
    const effectIcons = token.children.filter(c => c.name === 'partyEffectIcon');
    effectIcons.forEach(icon => {
      token.removeChild(icon);
      icon.destroy({ children: true });
    });
  } catch (error) {
    console.warn('Party Vision | Error cleaning up PIXI resources:', error);
  }
});

// Refresh health and status indicators on token refresh
Hooks.on('refreshToken', (token) => {
  const memberData = token.document?.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) return;

  // Clear cached tooltip to ensure fresh PP display on next hover
  delete token._pvOriginalTooltip;

  if (game.settings.get('party-vision', 'showHealthIndicator')) {
    refreshHealthIndicator(token);
  }

  if (game.settings.get('party-vision', 'showStatusEffects')) {
    refreshStatusEffects(token);
  }
});

// ==============================================
// FORM PARTY SYSTEM
// ==============================================

/**
 * Generate a unique key for party configuration based on member actor IDs
 * @param {Array<Token>} tokens - Array of tokens
 * @returns {string} Unique key for this party composition
 */
function generatePartyConfigKey(tokens) {
  const actorIds = tokens
    .map(t => t.actor?.id)
    .filter(id => id)
    .sort() // Sort for consistency regardless of selection order
    .join('|');
  return actorIds;
}

/**
 * Get saved party configuration for given tokens
 * @param {Array<Token>} tokens - Array of tokens
 * @returns {Object|null} Saved configuration or null
 */
function getSavedPartyConfig(tokens) {
  const key = generatePartyConfigKey(tokens);
  const savedConfigs = game.settings.get('party-vision', 'savedPartyConfigs');
  return savedConfigs[key] || null;
}

/**
 * Save party configuration for given tokens
 * @param {Array<Token>} tokens - Array of tokens
 * @param {string} partyName - Name for the party
 * @param {string} partyImage - Image path for the party token
 * @param {number} leaderIndex - Index of the leader
 * @param {Object} customFormation - Optional custom formation data
 */
async function savePartyConfig(tokens, partyName, partyImage, leaderIndex = 0, customFormation = null) {
  const key = generatePartyConfigKey(tokens);
  const savedConfigs = game.settings.get('party-vision', 'savedPartyConfigs');
  
  const config = {
    name: partyName,
    image: partyImage,
    leaderActorId: tokens[leaderIndex]?.actor?.id,
    savedAt: Date.now()
  };
  
  // Save custom formation if provided
  if (customFormation) {
    config.customFormation = customFormation;
  }
  
  savedConfigs[key] = config;
  
  await game.settings.set('party-vision', 'savedPartyConfigs', savedConfigs);
  console.log(`Party Vision | Saved configuration for party: ${partyName}`, config);
}

/**
 * Get movement speed from actor (system-agnostic)
 * @param {Actor} actor - The actor to get speed from
 * @returns {number} Movement speed
 */
function getActorSpeed(actor) {
  // Input validation
  if (!actor?.system) {
    console.warn('Party Vision | getActorSpeed called with invalid actor');
    return 30; // Default speed
  }

  let speed = 30; // Default

  // PF2e v7.5+ uses system.movement.speeds
  if (actor.system.movement?.speeds?.land?.total !== undefined) {
    speed = actor.system.movement.speeds.land.total;
  } else if (actor.system.movement?.speeds?.walk?.total !== undefined) {
    speed = actor.system.movement.speeds.walk.total;
  } else if (actor.system.attributes?.movement?.walk !== undefined) {
    speed = actor.system.attributes.movement.walk;
  } else if (actor.system.attributes?.speed?.value !== undefined) {
    speed = actor.system.attributes.speed.value;
  } else if (actor.system.movement?.walk !== undefined) {
    speed = actor.system.movement.walk;
  }

  return speed;
}

/**
 * Show the Form Party dialog
 */
async function showFormPartyDialog() {
  const controlled = canvas.tokens.controlled;
  
  if (controlled.length < 2) {
    ui.notifications.warn("Select at least 2 tokens to form a party.");
    return;
  }
  
  // Filter tokens - must have linked actors
  const validTokens = controlled.filter(t => {
    const actor = t.actor;
    if (!actor) {
      console.warn(`Party Vision | Token ${t.name} has no linked actor, skipping`);
      return false;
    }
    return true;
  });
  
  if (validTokens.length < 2) {
    ui.notifications.warn("Selected tokens must have linked actors to form a party.");
    return;
  }
  
  // Check for saved configuration
  const savedConfig = getSavedPartyConfig(validTokens);
  const defaultName = savedConfig?.name || `Party`;
  const defaultImage = savedConfig?.image || validTokens[0].actor.img;
  
  // Determine default leader index
  let defaultLeaderIndex = 0;
  if (savedConfig?.leaderActorId) {
    const leaderIdx = validTokens.findIndex(t => t.actor?.id === savedConfig.leaderActorId);
    if (leaderIdx >= 0) defaultLeaderIndex = leaderIdx;
  }
  
  // Build member list HTML
  const memberListHTML = validTokens.map((token, index) => {
    const actor = token.actor;
    const speed = getActorSpeed(actor);
    return `
      <div class="party-member" style="display: flex; align-items: center; padding: 8px; margin: 4px 0; background: rgba(0,0,0,0.2); border-radius: 4px;">
        <img src="${escapeHTML(actor.img)}" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 12px; border: 2px solid #555;">
        <div style="flex: 1;">
          <div style="font-weight: bold; color: #ddd;">${escapeHTML(actor.name)}</div>
          <div style="font-size: 0.85em; color: #aaa;">
            ${speed} movement
          </div>
        </div>
        <input type="radio" name="leader" value="${index}" ${index === defaultLeaderIndex ? 'checked' : ''} 
               style="margin-left: 12px; transform: scale(1.2);" title="Set as leader">
      </div>
    `;
  }).join('');
  
  // Formation presets dropdown - include custom formation if saved
  let formationOptions = Object.keys(FORMATION_PRESETS).map(key => {
    const preset = FORMATION_PRESETS[key];
    return `<option value="${escapeHTML(key)}">${escapeHTML(preset.name)}</option>`;
  }).join('');
  
  // Add saved custom formation option if it exists
  if (savedConfig?.customFormation) {
    formationOptions += `<option value="saved-custom">Saved Custom Formation</option>`;
  }
  
  const lastPreset = game.settings.get('party-vision', 'lastFormationPreset');
  
  new Dialog({
    title: "Form Party",
    content: `
      <style>
        .form-party-dialog {
          padding: 15px;
          font-family: "Signika", sans-serif;
        }
        .form-party-dialog h3 {
          margin: 0 0 12px 0;
          color: #ddd;
          font-size: 1.1em;
          border-bottom: 2px solid #00ff88;
          padding-bottom: 8px;
        }
        .form-party-dialog .section {
          margin: 15px 0;
        }
        .form-party-dialog label {
          display: block;
          color: #ddd;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .form-party-dialog select, .form-party-dialog input[type="text"] {
          width: 100%;
          padding: 8px;
          background: rgba(0,0,0,0.4);
          border: 1px solid #555;
          color: #ddd;
          border-radius: 4px;
          font-size: 14px;
          min-height: 36px;
        }
        .form-party-dialog select option {
          background: #fff;
          color: #000;
          padding: 8px;
        }
        .form-party-dialog .info-text {
          font-size: 0.85em;
          color: #aaa;
          margin: 8px 0;
          font-style: italic;
        }
        .form-party-dialog .image-picker-container {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .form-party-dialog .image-preview {
          width: 60px;
          height: 60px;
          border: 2px solid #555;
          border-radius: 4px;
          overflow: hidden;
          flex-shrink: 0;
          background: rgba(0,0,0,0.4);
        }
        .form-party-dialog .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .form-party-dialog .image-input-group {
          flex: 1;
          display: flex;
          gap: 5px;
        }
        .form-party-dialog .image-input-group input {
          flex: 1;
        }
        .form-party-dialog .image-input-group button {
          padding: 8px 12px;
          background: #0088ff;
          border: 1px solid #0066cc;
          color: #fff;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
          white-space: nowrap;
          min-width: auto;
          max-width: 120px;
        }
        .form-party-dialog .image-input-group button:hover {
          background: #0099ff;
        }
        .form-party-dialog .formation-choice {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-party-dialog .formation-option {
          display: flex;
          align-items: center;
          padding: 10px;
          background: rgba(0,0,0,0.2);
          border: 2px solid #555;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .form-party-dialog .formation-option:hover {
          border-color: #00ff88;
          background: rgba(0,255,136,0.1);
        }
        .form-party-dialog .formation-option input[type="radio"] {
          margin-right: 10px;
          transform: scale(1.2);
        }
        .form-party-dialog .formation-option-label {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-party-dialog .formation-option-desc {
          font-size: 0.85em;
          color: #aaa;
          font-weight: normal;
        }
      </style>
      <div class="form-party-dialog">
        <div class="section">
          <label for="party-name">
            <i class="fas fa-tag"></i> Party Name
          </label>
          <input type="text" id="party-name" name="partyName" value="${escapeHTML(defaultName)}" placeholder="Enter party name">
          <div class="info-text">This name will be saved and reused when you form a party with these same members.</div>
        </div>

        <div class="section">
          <label>
            <i class="fas fa-image"></i> Party Token Image
          </label>
          <div class="image-picker-container">
            <div class="image-preview">
              <img id="party-image-preview" src="${escapeHTML(defaultImage)}" alt="Party Token">
            </div>
            <div class="image-input-group">
              <input type="text" id="party-image" name="partyImage" value="${escapeHTML(defaultImage)}" placeholder="Token image path">
              <button type="button" id="browse-image">
                <i class="fas fa-folder-open"></i> Browse
              </button>
            </div>
          </div>
          <div class="info-text">Select an image for the party token. This will be saved for future use.</div>
        </div>
        
        <h3>Select Party Members</h3>
        <div class="info-text">
          <i class="fas fa-info-circle"></i> Select a leader by clicking the radio button. The party will orient around the leader.
        </div>
        <div class="section">
          ${memberListHTML}
        </div>
        
        ${savedConfig ? `
        <div class="section">
          <label>
            <i class="fas fa-chess-board"></i> Formation
          </label>
          <div class="formation-choice">
            <label class="formation-option">
              <input type="radio" name="formation-choice" value="use-last" checked>
              <span class="formation-option-label">
                <strong>Use Last Formation</strong>
                <span class="formation-option-desc">${savedConfig.customFormation ? 'Saved Custom Formation' : FORMATION_PRESETS[lastPreset]?.name || 'Custom'}</span>
              </span>
            </label>
            <label class="formation-option">
              <input type="radio" name="formation-choice" value="choose-different">
              <span class="formation-option-label">Choose Different Formation</span>
            </label>
          </div>
          <div id="formation-dropdown-container" style="display: none; margin-top: 10px;">
            <select id="formation-preset" name="formation">
              ${formationOptions}
            </select>
          </div>
        </div>
        ` : ''}
        <input type="hidden" id="formation-preset-hidden" name="formation" value="custom">
      </div>
    `,
    buttons: {
      form: {
        label: '<i class="fas fa-users"></i> Form Party',
        callback: async (html) => {
          const leaderIndex = parseInt(html.find('input[name="leader"]:checked').val());

          // Determine formation key based on UI state
          let formationKey;
          if (savedConfig) {
            const formationChoice = html.find('input[name="formation-choice"]:checked').val();
            if (formationChoice === 'use-last') {
              // Use saved custom formation or last preset
              formationKey = savedConfig.customFormation ? 'saved-custom' : lastPreset;
            } else {
              // User chose different formation from dropdown
              formationKey = html.find('#formation-preset').val();
            }
          } else {
            // New party - use custom formation (current positions)
            formationKey = html.find('#formation-preset-hidden').val() || 'custom';
          }

          const partyName = html.find('#party-name').val().trim() || 'Party';
          const partyImage = html.find('#party-image').val().trim() || defaultImage;
          
          // Prepare custom formation data if using custom or saved-custom
          let customFormation = null;
          if (formationKey === 'custom') {
            // Save current positions as custom formation
            customFormation = {
              offsets: validTokens.map((token, i) => {
                const leaderToken = validTokens[leaderIndex];
                const gridSize = canvas.grid.size;
                const leaderGridX = leaderToken.x / gridSize;
                const leaderGridY = leaderToken.y / gridSize;
                const tokenGridX = token.x / gridSize;
                const tokenGridY = token.y / gridSize;
                return {
                  actorId: token.actor.id,
                  dx: tokenGridX - leaderGridX,
                  dy: tokenGridY - leaderGridY
                };
              }),
              savedAt: Date.now()
            };
          } else if (formationKey === 'saved-custom' && savedConfig?.customFormation) {
            customFormation = savedConfig.customFormation;
          }
          
          // Save configuration with leader and custom formation
          await savePartyConfig(validTokens, partyName, partyImage, leaderIndex, customFormation);
          
          // Save last used formation
          await game.settings.set('party-vision', 'lastFormationPreset', formationKey);
          
          // Form the party
          await formParty(validTokens, leaderIndex, formationKey, partyName, partyImage, customFormation);
        }
      },
      cancel: {
        label: '<i class="fas fa-times"></i> Cancel',
        callback: () => {}
      }
    },
    default: "form",
    render: (html) => {
      // Handle formation choice for existing parties
      if (savedConfig) {
        // Set default formation value in dropdown
        const defaultFormation = savedConfig.customFormation ? 'saved-custom' : lastPreset;
        html.find('#formation-preset').val(defaultFormation);

        // Handle radio button changes
        html.find('input[name="formation-choice"]').on('change', (e) => {
          const choice = e.target.value;
          const dropdownContainer = html.find('#formation-dropdown-container');

          if (choice === 'choose-different') {
            dropdownContainer.slideDown(200);
          } else {
            dropdownContainer.slideUp(200);
          }
        });
      }

      // Handle image input changes
      html.find('#party-image').on('input', (e) => {
        const imagePath = e.target.value;
        html.find('#party-image-preview').attr('src', imagePath);
      });
      
      // Handle browse button
      html.find('#browse-image').on('click', async () => {
        const fp = new FilePicker({
          type: "image",
          current: html.find('#party-image').val(),
          callback: (path) => {
            html.find('#party-image').val(path);
            html.find('#party-image-preview').attr('src', path);
          }
        });
        fp.render(true);
      });
    }
  }, {
    width: 550,
    classes: ["dialog", "party-vision-dialog"]
  }).render(true);
}

/**
 * Form a party from selected tokens
 * @param {Array<Token>} tokens - Tokens to form into party
 * @param {number} leaderIndex - Index of the leader token
 * @param {string} formationKey - Formation preset key
 * @param {string} partyName - Name for the party token
 * @param {string} partyImage - Image path for the party token
 * @param {Object} customFormation - Optional custom formation data
 */
async function formParty(tokens, leaderIndex, formationKey, partyName, partyImage, customFormation = null) {
  try {
    if (tokens.length < 2) {
      ui.notifications.warn("Need at least 2 tokens to form a party.");
      return;
    }

    const leaderToken = tokens[leaderIndex];
    const leaderActor = leaderToken.actor;

    if (!leaderActor) {
      ui.notifications.error("Leader token must have a linked actor.");
      return;
    }

    console.log(`Party Vision | Forming party "${partyName}" with ${tokens.length} members, leader: ${leaderActor.name}`);

  // Formation presets are applied during deployment, not during formation
  // Just use the current positions of the tokens
  const positionedTokens = tokens;

  // Calculate member data with offsets from leader
  const gridSize = canvas.grid.size;
  const leaderGridX = leaderToken.x / gridSize;
  const leaderGridY = leaderToken.y / gridSize;
  
  const memberData = [];
  
  for (let i = 0; i < positionedTokens.length; i++) {
    const token = positionedTokens[i];
    const actor = token.actor;
    
    if (!actor) continue;
    
    const tokenGridX = token.x / gridSize;
    const tokenGridY = token.y / gridSize;
    
    // Calculate offset from leader in grid units
    const dx = tokenGridX - leaderGridX;
    const dy = tokenGridY - leaderGridY;
    
    // Store original lighting from prototype token (NOT current token lighting)
    // This ensures we save the base lighting without any active items/effects
    // which will be reapplied automatically when the token is deployed
    const protoLight = actor.prototypeToken.light || {};
    const originalLight = {
      bright: protoLight.bright || 0,
      dim: protoLight.dim || 0,
      angle: protoLight.angle || 360,
      color: protoLight.color || null,
      alpha: protoLight.alpha || 0.5,
      animation: foundry.utils.deepClone(protoLight.animation) || {}
    };
    
    memberData.push({
      actorId: actor.id,
      actorUuid: actor.uuid,
      name: actor.name,
      img: actor.img,
      dx: dx,
      dy: dy,
      isLeader: i === leaderIndex,
      originalLight: originalLight
    });
  }
  
  // Determine natural facing based on leader position relative to group
  const naturalFacing = determineNaturalFacing(memberData);
  console.log(`Party Vision | Natural facing determined: ${naturalFacing}`);
  
  // Calculate movement capabilities (slowest member determines party speed)
  const movementData = calculateMovementCapabilities(tokens);

  // Determine party token size (largest member)
  const maxWidth = Math.max(...tokens.map(t => t.document.width));
  const maxHeight = Math.max(...tokens.map(t => t.document.height));

  // Get default movement type based on system
  const defaultMovementType = getDefaultMovementType();

  // Build actor data for movement selector (PF2e format)
  let actorData = {};
  if (game.system.id === 'pf2e') {
    // PF2e v7.5+ format
    const speeds = {};
    movementData.types.forEach(type => {
      speeds[type] = {
        total: movementData.speed,
        value: movementData.speed,
        type: type
      };
    });

    actorData = {
      system: {
        attributes: {
          speed: {
            value: movementData.speed,
            type: defaultMovementType,
            otherSpeeds: movementData.types.filter(t => t !== defaultMovementType).map(type => ({
              type: type,
              value: movementData.speed
            }))
          }
        },
        movement: {
          speeds: speeds
        }
      }
    };
  } else if (game.system.id === 'dnd5e') {
    // D&D 5e format
    const movement = {};
    movementData.types.forEach(type => {
      movement[type] = movementData.speed;
    });

    actorData = {
      system: {
        attributes: {
          movement: movement
        }
      }
    };
  }

  // Create party token at leader's position
  const partyTokenData = {
    name: partyName,
    texture: {
      src: partyImage
    },
    x: leaderToken.x,
    y: leaderToken.y,
    width: maxWidth,
    height: maxHeight,
    displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
    displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
    actorId: null, // Explicitly set to null - this is an unlinked token
    actorLink: false, // Not linked to any actor
    sight: {
      enabled: true,
      range: 0,
      angle: 360,
      visionMode: "basic"
    },
    detectionModes: [],
    actorData: actorData,
    flags: {
      'party-vision': {
        memberData: memberData,
        naturalFacing: naturalFacing,
        movement: movementData,
        formedAt: Date.now(),
        partyName: partyName,
        formationKey: formationKey,
        customFormation: customFormation
      }
    }
  };
  
  // Create the party token
  const created = await canvas.scene.createEmbeddedDocuments("Token", [partyTokenData]);
  const partyToken = canvas.tokens.get(created[0].id);
  
  // Update party lighting from members
  await updatePartyLightingFromActors(partyToken);
  
  // CRITICAL: Delete original tokens properly to clean up vision
  const tokenIds = tokens.map(t => t.id);
  await canvas.scene.deleteEmbeddedDocuments("Token", tokenIds);
  
  // Force a canvas refresh to clean up any lingering vision artifacts
  await new Promise(resolve => setTimeout(resolve, 100));
  canvas.perception.update({
    refreshVision: true,
    refreshLighting: true
  }, true);
  
  ui.notifications.info(`Party formed: ${tokens.length} members with ${leaderActor.name} as leader!`);
  
    // Select the new party token
    if (partyToken) {
      partyToken.control({ releaseOthers: true });
    }
  } catch (error) {
    console.error('Party Vision | Error forming party:', error);
    ui.notifications.error(`Failed to form party: ${error.message}`);
  }
}

/**
 * Determine the natural facing direction of the formation
 * @param {Array} memberData - Array of member data with dx/dy offsets
 * @returns {string} Direction ('north', 'east', 'south', 'west')
 */
function determineNaturalFacing(memberData) {
  // Find the leader
  const leader = memberData.find(m => m.isLeader);
  if (!leader) return 'north';
  
  // Calculate center of all non-leader members
  const nonLeaders = memberData.filter(m => !m.isLeader);
  if (nonLeaders.length === 0) return 'north';
  
  let sumX = 0;
  let sumY = 0;
  nonLeaders.forEach(m => {
    sumX += m.dx;
    sumY += m.dy;
  });
  
  const centerX = sumX / nonLeaders.length;
  const centerY = sumY / nonLeaders.length;
  
  // Vector from group center to leader
  const vectorX = leader.dx - centerX;
  const vectorY = leader.dy - centerY;
  
  // Determine direction based on vector
  return determineNaturalFacingFromOffsets(vectorX, vectorY);
}

/**
 * Get default movement type based on game system
 * @returns {string} Default movement type
 */
function getDefaultMovementType() {
  const systemId = game.system.id;

  if (systemId === 'pf2e') {
    // PF2e default is "land" for travel
    return 'land';
  } else if (systemId === 'dnd5e') {
    // D&D 5e default is "walk"
    return 'walk';
  }

  // Generic fallback
  return 'walk';
}

/**
 * Calculate movement capabilities for party (slowest member)
 * @param {Array<Token>} tokens - Party member tokens
 * @returns {Object} Movement data
 */
function calculateMovementCapabilities(tokens) {
  let minSpeed = Infinity;
  const commonTypes = new Set();
  let firstMember = true;

  console.log(`Party Vision | Calculating movement for ${tokens.length} tokens`);

  tokens.forEach(token => {
    const actor = token.actor;
    if (!actor) {
      console.log(`Party Vision | Token ${token.name} has no actor, skipping`);
      return;
    }

    // Get movement speed (system-agnostic)
    let speed = 30; // Default

    // Try various common locations for movement speed
    // PF2e v7.5+ uses system.movement.speeds
    if (actor.system.movement?.speeds?.land?.total !== undefined) {
      // PF2e v7.5+ land speed
      speed = actor.system.movement.speeds.land.total;
    } else if (actor.system.movement?.speeds?.walk?.total !== undefined) {
      // PF2e v7.5+ walk speed (alternative naming)
      speed = actor.system.movement.speeds.walk.total;
    } else if (actor.system.attributes?.movement?.walk !== undefined) {
      // Generic D&D-style path
      speed = actor.system.attributes.movement.walk;
    } else if (actor.system.attributes?.speed?.value !== undefined) {
      // Old generic path (deprecated in PF2e but still used elsewhere)
      speed = actor.system.attributes.speed.value;
    } else if (actor.system.movement?.walk !== undefined) {
      // Alternative path
      speed = actor.system.movement.walk;
    }

    minSpeed = Math.min(minSpeed, speed);

    // Track movement types
    const types = [];

    // PF2e v7.5+ movement types
    if (actor.system.movement?.speeds) {
      console.log(`Party Vision | ${actor.name} has movement.speeds:`, Object.keys(actor.system.movement.speeds));
      Object.keys(actor.system.movement.speeds).forEach(type => {
        const speedData = actor.system.movement.speeds[type];
        const total = speedData?.total || speedData?.value || 0;
        console.log(`Party Vision | ${actor.name} - ${type}: ${total}`);
        if (speedData && (speedData.total > 0 || speedData.value > 0)) {
          types.push(type);
        }
      });
    }
    // Fallback to older path
    else if (actor.system.attributes?.movement) {
      console.log(`Party Vision | ${actor.name} has attributes.movement:`, Object.keys(actor.system.attributes.movement));
      Object.keys(actor.system.attributes.movement).forEach(type => {
        const value = actor.system.attributes.movement[type];
        console.log(`Party Vision | ${actor.name} - ${type}: ${value}`);
        if (actor.system.attributes.movement[type] > 0) {
          types.push(type);
        }
      });
    } else {
      console.log(`Party Vision | ${actor.name} has no recognizable movement data structure`);
    }

    console.log(`Party Vision | ${actor.name} movement types:`, types);

    if (firstMember) {
      types.forEach(t => commonTypes.add(t));
      firstMember = false;
    } else {
      // Keep only types common to all members
      const typeSet = new Set(types);
      commonTypes.forEach(t => {
        if (!typeSet.has(t)) {
          commonTypes.delete(t);
        }
      });
    }
  });

  const result = {
    speed: minSpeed === Infinity ? 30 : minSpeed,
    types: Array.from(commonTypes)
  };

  console.log(`Party Vision | Final movement calculation:`, result);

  return result;
}

// ==============================================
// DEPLOY PARTY SYSTEM
// ==============================================

/**
 * Show the Deploy/Split Party dialog
 * @param {Token} partyToken - The party token to deploy
 */
async function showDeployDialog(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  
  if (!memberData || memberData.length === 0) {
    ui.notifications.warn("This token is not a party token.");
    return;
  }
  
  const naturalFacing = partyToken.document.getFlag('party-vision', 'naturalFacing') || 'north';
  const lastDirection = game.settings.get('party-vision', 'lastDeployDirection');
  const savedFormationKey = partyToken.document.getFlag('party-vision', 'formationKey') || 'current';
  const customFormation = partyToken.document.getFlag('party-vision', 'customFormation');
  
  // Build member checkboxes for split functionality
  const memberCheckboxes = memberData.map((member, index) => {
    return `
      <div class="member-checkbox" style="display: flex; align-items: center; padding: 4px 6px; margin: 2px 0; background: rgba(0,0,0,0.2); border-radius: 3px;">
        <input type="checkbox" id="member-${index}" value="${index}" checked style="margin-right: 8px; transform: scale(1.1);">
        <img src="${escapeHTML(member.img)}" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px; border: 2px solid ${member.isLeader ? '#00ff88' : '#555'};">
        <label for="member-${index}" style="flex: 1; color: #ddd; cursor: pointer; font-size: 13px;">
          ${escapeHTML(member.name)}${member.isLeader ? ' <i class="fas fa-star" style="color: #00ff88; font-size: 11px;"></i>' : ''}
        </label>
      </div>
    `;
  }).join('');
  
  // Formation presets dropdown
  let formationOptions = Object.keys(FORMATION_PRESETS).map(key => {
    const preset = FORMATION_PRESETS[key];
    return `<option value="${escapeHTML(key)}">${escapeHTML(preset.name)} - ${escapeHTML(preset.description)}</option>`;
  }).join('');
  
  // Add saved custom formation if available
  if (customFormation) {
    formationOptions += `<option value="saved-custom">Saved Custom Formation</option>`;
  }
  
  const lastPreset = game.settings.get('party-vision', 'lastFormationPreset');
  
  new Dialog({
    title: "Deploy Party",
    content: `
      <style>
        .deploy-party-dialog {
          padding: 8px;
          font-family: "Signika", sans-serif;
        }
        .deploy-party-dialog h3 {
          margin: 8px 0 6px 0;
          color: #ddd;
          font-size: 0.95em;
          border-bottom: 1px solid #ff8800;
          padding-bottom: 4px;
        }
        .deploy-party-dialog h3:first-child {
          margin-top: 0;
        }
        .deploy-party-dialog .section {
          margin: 8px 0;
        }
        .deploy-party-dialog label {
          display: block;
          color: #ddd;
          font-weight: bold;
          margin-bottom: 4px;
          font-size: 13px;
        }
        .deploy-party-dialog select {
          width: 100%;
          padding: 5px;
          background: rgba(0,0,0,0.4);
          border: 1px solid #555;
          color: #ddd;
          border-radius: 3px;
          font-size: 13px;
          min-height: 28px;
        }
        .deploy-party-dialog select option {
          background: #fff;
          color: #000;
          padding: 5px;
        }
        .deploy-party-dialog .info-text {
          font-size: 0.75em;
          color: #aaa;
          margin: 4px 0;
          font-style: italic;
        }
        .deploy-party-dialog .direction-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 5px;
          max-width: 150px;
          margin: 8px auto;
        }
        .deploy-party-dialog .direction-btn {
          aspect-ratio: 1;
          border: 2px solid #555;
          background: rgba(0,0,0,0.4);
          border-radius: 5px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .deploy-party-dialog .direction-btn:hover {
          border-color: #ff8800;
          background: rgba(255, 136, 0, 0.2);
          transform: scale(1.05);
        }
        .deploy-party-dialog .direction-btn.selected {
          border-color: #00ff88;
          background: rgba(0, 255, 136, 0.2);
        }
        .deploy-party-dialog .direction-btn.empty {
          visibility: hidden;
        }
        .deploy-party-dialog .direction-btn i {
          font-size: 18px;
          color: #ddd;
        }
        .deploy-party-dialog .member-list {
          max-height: 200px;
          overflow-y: auto;
        }
        .deploy-party-dialog .quick-select {
          display: flex;
          gap: 6px;
          margin-bottom: 6px;
        }
        .deploy-party-dialog .quick-select button {
          padding: 4px 8px;
          background: rgba(0,0,0,0.4);
          border: 1px solid #555;
          color: #ddd;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
        }
        .deploy-party-dialog .quick-select button:hover {
          background: rgba(255, 136, 0, 0.2);
          border-color: #ff8800;
        }
      </style>
      <div class="deploy-party-dialog">
        <h3>Formation & Direction</h3>
        <div class="info-text">
          <i class="fas fa-info-circle"></i> Natural facing: ${naturalFacing.toUpperCase()}. Select deployment formation and direction.
        </div>
        
        <div class="section">
          <label for="deploy-formation">
            <i class="fas fa-chess-board"></i> Formation
          </label>
          <select id="deploy-formation" name="formation">
            ${formationOptions}
          </select>
        </div>
        
        <div class="section">
          <label>
            <i class="fas fa-compass"></i> Deployment Direction
          </label>
          <div class="direction-grid">
            <div class="direction-btn empty"></div>
            <div class="direction-btn" data-direction="north" ${lastDirection === 'north' ? 'class="direction-btn selected"' : ''}>
              <i class="fas fa-arrow-up"></i>
            </div>
            <div class="direction-btn empty"></div>
            <div class="direction-btn" data-direction="west" ${lastDirection === 'west' ? 'class="direction-btn selected"' : ''}>
              <i class="fas fa-arrow-left"></i>
            </div>
            <div class="direction-btn empty"></div>
            <div class="direction-btn" data-direction="east" ${lastDirection === 'east' ? 'class="direction-btn selected"' : ''}>
              <i class="fas fa-arrow-right"></i>
            </div>
            <div class="direction-btn empty"></div>
            <div class="direction-btn" data-direction="south" ${lastDirection === 'south' ? 'class="direction-btn selected"' : ''}>
              <i class="fas fa-arrow-down"></i>
            </div>
            <div class="direction-btn empty"></div>
          </div>
        </div>
        
        <h3>Select Members to Deploy</h3>
        <div class="info-text">
          <i class="fas fa-user-friends"></i> Choose which members to deploy. Unchecked members remain in the party token.
        </div>
        <div class="section">
          <div class="quick-select">
            <button type="button" id="select-all">Select All</button>
            <button type="button" id="select-none">Select None</button>
          </div>
          <div class="member-list">
            ${memberCheckboxes}
          </div>
        </div>
      </div>
    `,
    buttons: {
      deploy: {
        label: '<i class="fas fa-chevron-circle-right"></i> Deploy Selected',
        callback: async (html) => {
          const formationKey = html.find('#deploy-formation').val();
          const direction = html.find('.direction-btn.selected').data('direction') || 'north';

          // Get selected member indices
          const selectedIndices = [];
          html.find('input[type="checkbox"]:checked').each(function() {
            selectedIndices.push(parseInt($(this).val()));
          });

          if (selectedIndices.length === 0) {
            ui.notifications.warn("Select at least one member to deploy.");
            return;
          }

          // Save last used values
          await game.settings.set('party-vision', 'lastFormationPreset', formationKey);
          await game.settings.set('party-vision', 'lastDeployDirection', direction);

          // Deploy based on selection
          if (selectedIndices.length === memberData.length) {
            // Deploy all members
            await deployParty(partyToken, formationKey, direction);
          } else {
            // Split and deploy selected
            await splitAndDeployMembers(partyToken, selectedIndices, formationKey, direction);
          }
        }
      },
      deployAndForm: {
        label: '<i class="fas fa-users"></i> Deploy & Form New Party',
        callback: async (html) => {
          const formationKey = html.find('#deploy-formation').val();
          const direction = html.find('.direction-btn.selected').data('direction') || 'north';

          // Get selected member indices
          const selectedIndices = [];
          html.find('input[type="checkbox"]:checked').each(function() {
            selectedIndices.push(parseInt($(this).val()));
          });

          if (selectedIndices.length === 0) {
            ui.notifications.warn("Select at least one member to deploy.");
            return;
          }

          if (selectedIndices.length < 2) {
            ui.notifications.warn("Need at least 2 members to form a new party after deployment.");
            return;
          }

          // Save last used values
          await game.settings.set('party-vision', 'lastFormationPreset', formationKey);
          await game.settings.set('party-vision', 'lastDeployDirection', direction);

          // Deploy based on selection
          if (selectedIndices.length === memberData.length) {
            // Deploy all members
            await deployParty(partyToken, formationKey, direction, true);
          } else {
            // Split and deploy selected
            await splitAndDeployMembers(partyToken, selectedIndices, formationKey, direction, true);
          }
        }
      },
      cancel: {
        label: '<i class="fas fa-times"></i> Cancel',
        callback: () => {}
      }
    },
    default: "deploy",
    render: (html) => {
      // Select last used formation, or use saved formation
      const formationToSelect = savedFormationKey && html.find(`#deploy-formation option[value="${savedFormationKey}"]`).length > 0 
        ? savedFormationKey 
        : lastPreset;
      html.find('#deploy-formation').val(formationToSelect);
      
      // Handle direction selection
      html.find('.direction-btn').on('click', function() {
        if ($(this).hasClass('empty')) return;
        html.find('.direction-btn').removeClass('selected');
        $(this).addClass('selected');
      });
      
      // Handle quick select buttons
      html.find('#select-all').on('click', function() {
        html.find('input[type="checkbox"]').prop('checked', true);
      });
      
      html.find('#select-none').on('click', function() {
        html.find('input[type="checkbox"]').prop('checked', false);
      });
    }
  }, {
    width: 500,
    classes: ["dialog", "party-vision-dialog"]
  }).render(true);
}

/**
 * Deploy party tokens from a party token
 * @param {Token} partyToken - The party token
 * @param {string} formationKey - Formation preset key
 * @param {string} direction - Deployment direction
 * @param {boolean} formNewParty - Whether to show form party dialog after deployment
 */
async function deployParty(partyToken, formationKey, direction, formNewParty = false) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  
  if (!memberData || memberData.length === 0) {
    ui.notifications.warn("This token has no party data.");
    return;
  }
  
  console.log(`Party Vision | Deploying party with formation: ${formationKey}, direction: ${direction}`);
  
  // Get formation - could be preset, custom, or saved-custom
  let formationFunc = null;
  
  if (formationKey === 'saved-custom') {
    // Use saved custom formation
    const customFormation = partyToken.document.getFlag('party-vision', 'customFormation');
    if (customFormation) {
      console.log('Party Vision | Using saved custom formation');
      formationFunc = (dx, dy, index, total) => {
        // Find the offset for this member by actor ID
        const offset = customFormation.offsets.find(o => o.actorId === memberData[index].actorId);
        return offset ? { dx: offset.dx, dy: offset.dy } : { dx, dy };
      };
    }
  } else if (formationKey === 'custom') {
    // Use current positions
    console.log('Party Vision | Using current positions as custom formation');
    formationFunc = (dx, dy) => ({ dx, dy });
  } else {
    // Use preset formation
    const preset = FORMATION_PRESETS[formationKey];
    if (preset && preset.transform) {
      formationFunc = preset.transform;
    }
  }
  
  // Fall back to custom if no formation found
  if (!formationFunc) {
    console.warn(`Party Vision | Formation ${formationKey} not found, using custom`);
    formationFunc = (dx, dy) => ({ dx, dy });
  }
  
  // Calculate rotation from natural facing to deployment direction
  const naturalFacing = partyToken.document.getFlag('party-vision', 'naturalFacing') || 'north';
  const rotation = calculateRotationDelta(naturalFacing, direction);
  
  // Prepare token creation data
  const gridSize = canvas.grid.size;
  const partyGridX = partyToken.x / gridSize;
  const partyGridY = partyToken.y / gridSize;

  const tokenCreationData = [];
  const animate = game.settings.get('party-vision', 'animateDeployment');
  const animSpeed = game.settings.get('party-vision', 'deploymentAnimationSpeed');

  // Smart formation ordering (if enabled and not using custom formations)
  let orderedMembers = memberData;
  const useSmartOrdering = game.settings.get('party-vision', 'smartFormationOrdering');
  const isCustomFormation = formationKey === 'custom' || formationKey === 'saved-custom';

  if (useSmartOrdering && !isCustomFormation) {
    console.log('Party Vision | Using smart formation ordering');

    // Get all actors
    const actors = memberData.map(m => game.actors.get(m.actorId));

    // Sort members by role
    const sorted = sortMembersForFormation(memberData, actors);
    orderedMembers = sorted.map(s => s.member);

    // Log the ordering for debugging
    console.log('Party Vision | Formation order:', sorted.map(s => `${s.member.name} (${s.role})`).join(', '));
  }

  for (let i = 0; i < orderedMembers.length; i++) {
    const member = orderedMembers[i];
    const actor = game.actors.get(member.actorId);
    
    if (!actor) {
      console.warn(`Party Vision | Could not find actor ${member.actorId} for party member ${member.name}`);
      continue;
    }
    
    // Apply formation transformation
    const transformed = formationFunc(member.dx, member.dy, i, memberData.length);
    
    // Apply rotation to the transformed position
    const rotated = rotatePosition(transformed.dx, transformed.dy, rotation);
    
    // Calculate final position
    const finalGridX = partyGridX + rotated.x;
    const finalGridY = partyGridY + rotated.y;
    const finalX = finalGridX * gridSize;
    const finalY = finalGridY * gridSize;
    
    // Check for wall collisions
    const tokenWidth = actor.prototypeToken.width;
    const tokenHeight = actor.prototypeToken.height;
    
    let deployX = finalX;
    let deployY = finalY;
    
    if (hasWallCollision(finalX + (tokenWidth * gridSize) / 2, finalY + (tokenHeight * gridSize) / 2, tokenWidth, tokenHeight)) {
      // Find nearest valid position
      const nearbyPos = findNearbyValidPosition(finalX, finalY, tokenWidth, tokenHeight);
      if (nearbyPos) {
        deployX = nearbyPos.x;
        deployY = nearbyPos.y;
        console.log(`Party Vision | Adjusted position for ${member.name} due to wall collision`);
      } else {
        console.warn(`Party Vision | Could not find valid position for ${member.name}, deploying at party location`);
        deployX = partyToken.x;
        deployY = partyToken.y;
      }
    }
    
    // Create token data
    const tokenData = {
      name: actor.name,
      texture: {
        src: actor.prototypeToken.texture.src
      },
      actorId: actor.id,
      x: deployX,
      y: deployY,
      width: tokenWidth,
      height: tokenHeight,
      light: member.originalLight || {}
    };
    
    tokenCreationData.push(tokenData);
  }
  
  // Create all member tokens
  const createdTokens = await canvas.scene.createEmbeddedDocuments("Token", tokenCreationData);
  
  // Delete the party token
  await canvas.scene.deleteEmbeddedDocuments("Token", [partyToken.id]);
  
  // Animate if enabled
  if (animate && createdTokens.length > 0) {
    await new Promise(resolve => setTimeout(resolve, animSpeed + 100));
  }
  
  // Force a canvas refresh to clean up vision
  canvas.perception.update({
    refreshVision: true,
    refreshLighting: true
  }, true);
  
  ui.notifications.info(`Party deployed: ${createdTokens.length} members!`);

  // Select deployed tokens
  const deployedTokens = createdTokens.map(doc => canvas.tokens.get(doc.id)).filter(t => t);
  deployedTokens.forEach((token, index) => {
    token.control({ releaseOthers: index === 0 ? true : false });
  });

  // If requested, show form party dialog with deployed tokens
  if (formNewParty && deployedTokens.length >= 2) {
    // Wait a moment for selection to settle
    await new Promise(resolve => setTimeout(resolve, 200));
    await showFormPartyDialog();
  }
}

/**
 * Calculate rotation delta between two directions
 * @param {string} from - Starting direction
 * @param {string} to - Target direction
 * @returns {number} Rotation in degrees
 */
function calculateRotationDelta(from, to) {
  const directions = {
    north: 0,
    east: 90,
    south: 180,
    west: 270
  };
  
  const fromAngle = directions[from] || 0;
  const toAngle = directions[to] || 0;
  
  let delta = toAngle - fromAngle;
  
  // Normalize to -180 to 180
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  
  return delta;
}

/**
 * Rotate a position by given degrees
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} degrees - Rotation in degrees
 * @returns {Object} Rotated position {x, y}
 */
function rotatePosition(x, y, degrees) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  return {
    x: Math.round((x * cos - y * sin) * 100) / 100,
    y: Math.round((x * sin + y * cos) * 100) / 100
  };
}

/**
 * Check if a position has wall collision
 * @param {number} centerX - Center X pixel coordinate
 * @param {number} centerY - Center Y pixel coordinate
 * @param {number} width - Token width in grid units
 * @param {number} height - Token height in grid units
 * @returns {boolean} True if collision detected
 */
function hasWallCollision(centerX, centerY, width, height) {
  const gridSize = canvas.grid.size;
  const halfWidth = (width * gridSize) / 2;
  const halfHeight = (height * gridSize) / 2;
  
  // Check corners of the token
  const corners = [
    { x: centerX - halfWidth + WALL_COLLISION_TEST_OFFSET, y: centerY - halfHeight + WALL_COLLISION_TEST_OFFSET },
    { x: centerX + halfWidth - WALL_COLLISION_TEST_OFFSET, y: centerY - halfHeight + WALL_COLLISION_TEST_OFFSET },
    { x: centerX - halfWidth + WALL_COLLISION_TEST_OFFSET, y: centerY + halfHeight - WALL_COLLISION_TEST_OFFSET },
    { x: centerX + halfWidth - WALL_COLLISION_TEST_OFFSET, y: centerY + halfHeight - WALL_COLLISION_TEST_OFFSET }
  ];
  
  // Check if any corner is blocked by walls
  for (const corner of corners) {
    const ray = new foundry.canvas.geometry.Ray({ x: centerX, y: centerY }, corner);

    // Check for wall collisions using modern Foundry v13 API
    if (typeof foundry.utils.lineSegmentIntersects === 'function') {
      for (const wall of canvas.walls.placeables) {
        if (wall.document.move === CONST.WALL_MOVEMENT_TYPES.NONE) {
          const wallRay = wall.toRay();
          if (foundry.utils.lineSegmentIntersects(ray.A, ray.B, wallRay.A, wallRay.B)) {
            return true;
          }
        }
      }
    } else {
      // If API is unavailable, assume collision as a safe fallback
      // This prevents tokens from being placed inside walls in older Foundry versions
      console.warn('Party Vision | Wall collision API unavailable, assuming collision for safety');
      return true;
    }
  }

  return false;
}

/**
 * Find a nearby valid position without wall collision
 * @param {number} x - Original X coordinate
 * @param {number} y - Original Y coordinate
 * @param {number} width - Token width in grid units
 * @param {number} height - Token height in grid units
 * @returns {Object|null} Valid position {x, y} or null if none found
 */
function findNearbyValidPosition(x, y, width, height) {
  const gridSize = canvas.grid.size;
  
  // Try spiral search pattern
  for (let radius = 1; radius <= SPIRAL_SEARCH_MAX_RADIUS; radius++) {
    for (let angle = 0; angle < 360; angle += 45) {
      const radians = (angle * Math.PI) / 180;
      const testX = x + Math.cos(radians) * radius * gridSize;
      const testY = y + Math.sin(radians) * radius * gridSize;
      
      const centerX = testX + (width * gridSize) / 2;
      const centerY = testY + (height * gridSize) / 2;
      
      if (!hasWallCollision(centerX, centerY, width, height)) {
        return { x: testX, y: testY };
      }
    }
  }
  
  return null;
}

/**
 * Split and deploy selected party members
 * @param {Token} partyToken - The party token
 * @param {Array<number>} memberIndices - Indices of members to deploy
 * @param {string} formationKey - Formation preset key (optional, defaults to 'custom')
 * @param {string} direction - Deployment direction (optional, defaults to 'north')
 * @param {boolean} formNewParty - Whether to show form party dialog after deployment
 */
async function splitAndDeployMembers(partyToken, memberIndices, formationKey = 'custom', direction = 'north', formNewParty = false) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  
  if (!memberData || memberData.length === 0) {
    ui.notifications.warn("This token has no party data.");
    return;
  }
  
  console.log(`Party Vision | Splitting party - deploying ${memberIndices.length} of ${memberData.length} members`);
  
  // Get formation function
  let formationFunc = null;
  
  if (formationKey === 'saved-custom') {
    const customFormation = partyToken.document.getFlag('party-vision', 'customFormation');
    if (customFormation) {
      formationFunc = (dx, dy, index, total) => {
        const member = memberData[memberIndices[index]];
        const offset = customFormation.offsets.find(o => o.actorId === member.actorId);
        return offset ? { dx: offset.dx, dy: offset.dy } : { dx, dy };
      };
    }
  } else if (formationKey === 'custom') {
    formationFunc = (dx, dy) => ({ dx, dy });
  } else {
    const preset = FORMATION_PRESETS[formationKey];
    if (preset && preset.transform) {
      formationFunc = preset.transform;
    }
  }
  
  if (!formationFunc) {
    formationFunc = (dx, dy) => ({ dx, dy });
  }
  
  // Calculate rotation
  const naturalFacing = partyToken.document.getFlag('party-vision', 'naturalFacing') || 'north';
  const rotation = calculateRotationDelta(naturalFacing, direction);
  
  const gridSize = canvas.grid.size;
  const partyGridX = partyToken.x / gridSize;
  const partyGridY = partyToken.y / gridSize;
  
  const tokenCreationData = [];
  const remainingMembers = [];
  
  // Process each member
  for (let i = 0; i < memberData.length; i++) {
    const member = memberData[i];
    
    if (memberIndices.includes(i)) {
      // Deploy this member
      const actor = game.actors.get(member.actorId);
      
      if (!actor) {
        console.warn(`Party Vision | Could not find actor ${member.actorId}`);
        continue;
      }
      
      // Find this member's index in the selected array for formation calculation
      const selectedIndex = memberIndices.indexOf(i);
      
      // Apply formation transformation
      const transformed = formationFunc(member.dx, member.dy, selectedIndex, memberIndices.length);
      
      // Apply rotation
      const rotated = rotatePosition(transformed.dx, transformed.dy, rotation);
      
      // Calculate position
      const finalGridX = partyGridX + rotated.x;
      const finalGridY = partyGridY + rotated.y;
      const finalX = finalGridX * gridSize;
      const finalY = finalGridY * gridSize;
      
      // Check for wall collisions
      const tokenWidth = actor.prototypeToken.width;
      const tokenHeight = actor.prototypeToken.height;
      
      let deployX = finalX;
      let deployY = finalY;
      
      if (hasWallCollision(finalX + (tokenWidth * gridSize) / 2, finalY + (tokenHeight * gridSize) / 2, tokenWidth, tokenHeight)) {
        const nearbyPos = findNearbyValidPosition(finalX, finalY, tokenWidth, tokenHeight);
        if (nearbyPos) {
          deployX = nearbyPos.x;
          deployY = nearbyPos.y;
        } else {
          deployX = partyToken.x;
          deployY = partyToken.y;
        }
      }
      
      const tokenData = {
        name: actor.name,
        texture: {
          src: actor.prototypeToken.texture.src
        },
        actorId: actor.id,
        x: deployX,
        y: deployY,
        width: tokenWidth,
        height: tokenHeight,
        light: member.originalLight || {}
      };
      
      tokenCreationData.push(tokenData);
    } else {
      // Keep in party
      remainingMembers.push(member);
    }
  }
  
  // Create deployed tokens
  const createdTokens = await canvas.scene.createEmbeddedDocuments("Token", tokenCreationData);
  
  // Check if only 1 member remains - auto-deploy them
  if (remainingMembers.length === 1) {
    console.log('Party Vision | Only 1 member remaining, auto-deploying');
    
    const lastMember = remainingMembers[0];
    const actor = game.actors.get(lastMember.actorId);
    
    if (actor) {
      // Apply formation to last member too
      const transformed = formationFunc(lastMember.dx, lastMember.dy, 0, 1);
      const rotated = rotatePosition(transformed.dx, transformed.dy, rotation);
      
      const finalGridX = partyGridX + rotated.x;
      const finalGridY = partyGridY + rotated.y;
      const finalX = finalGridX * gridSize;
      const finalY = finalGridY * gridSize;
      
      const lastTokenData = {
        name: actor.name,
        texture: {
          src: actor.prototypeToken.texture.src
        },
        actorId: actor.id,
        x: finalX,
        y: finalY,
        width: actor.prototypeToken.width,
        height: actor.prototypeToken.height,
        light: lastMember.originalLight || {}
      };
      
      // Create the last member's token
      const lastCreated = await canvas.scene.createEmbeddedDocuments("Token", [lastTokenData]);
      
      // Delete party token
      await canvas.scene.deleteEmbeddedDocuments("Token", [partyToken.id]);
      
      ui.notifications.info(`All ${createdTokens.length + 1} members deployed. Party disbanded.`);
      
      // Select all deployed tokens including the last one
      const allDeployedTokens = [...createdTokens, ...lastCreated].map(doc => canvas.tokens.get(doc.id)).filter(t => t);
      allDeployedTokens.forEach((token, index) => {
        token.control({ releaseOthers: index === 0 ? true : false });
      });
    } else {
      // Couldn't find last member's actor, just delete party token
      await canvas.scene.deleteEmbeddedDocuments("Token", [partyToken.id]);
      ui.notifications.warn(`Deployed ${createdTokens.length} members. Could not deploy last member.`);
    }
  }
  else if (remainingMembers.length > 1) {
    // Update party token with remaining members
    await partyToken.document.setFlag('party-vision', 'memberData', remainingMembers);
    
    // Update party name if needed
    const partyName = partyToken.document.getFlag('party-vision', 'partyName') || 'Party';
    await partyToken.document.update({
      name: `${partyName} (${remainingMembers.length})`
    });
    
    // Update lighting
    await updatePartyLightingFromActors(partyToken);
    
    ui.notifications.info(`Deployed ${createdTokens.length} members. ${remainingMembers.length} remain in party.`);
  } else {
    // All members deployed - delete party token
    await canvas.scene.deleteEmbeddedDocuments("Token", [partyToken.id]);
    ui.notifications.info(`All ${createdTokens.length} members deployed. Party disbanded.`);
  }
  
  // Force a canvas refresh
  canvas.perception.update({
    refreshVision: true,
    refreshLighting: true
  }, true);

  // Select deployed tokens
  const deployedTokens = createdTokens.map(doc => canvas.tokens.get(doc.id)).filter(t => t);
  deployedTokens.forEach((token, index) => {
    token.control({ releaseOthers: index === 0 ? true : false });
  });

  // If requested, show form party dialog with deployed tokens
  if (formNewParty && deployedTokens.length >= 2) {
    // Wait a moment for selection to settle
    await new Promise(resolve => setTimeout(resolve, 200));
    await showFormPartyDialog();
  }
}

// ==============================================
// LIGHTING SYSTEM
// ==============================================

/**
 * Debounced version of updatePartyLightingFromActors
 * Prevents rapid-fire updates when multiple effects/items change
 * @param {Token} partyToken - The party token to update
 */
function debouncedUpdatePartyLighting(partyToken) {
  const tokenId = partyToken.id;

  // Clear any pending update for this token
  if (pendingLightingUpdates.has(tokenId)) {
    clearTimeout(pendingLightingUpdates.get(tokenId));
  }

  // Schedule new update
  const timeoutId = setTimeout(async () => {
    pendingLightingUpdates.delete(tokenId);
    await updatePartyLightingFromActors(partyToken);
  }, LIGHTING_UPDATE_DEBOUNCE_MS);

  pendingLightingUpdates.set(tokenId, timeoutId);
}

/**
 * Aggregate lights from member ACTORS (not tokens) and apply to party token
 * Use this when members don't have active tokens on scene
 * @param {Token} partyToken - The party token to update
 */
async function updatePartyLightingFromActors(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData) return;

  // TODO: Replace with event-driven approach to eliminate race condition
  // WORKAROUND: Allow time for game system to process item/effect changes naturally
  // We do NOT call actor prepare methods - the system does this automatically
  // 200ms should be enough time for most systems to complete their update hooks
  // This is a known race condition that should be refactored to use proper event listening
  await new Promise(resolve => setTimeout(resolve, 200));

  const lights = [];

  console.log(`Party Vision | ===== Checking lighting for ${memberData.length} party members =====`);

  // Collect light data from member actors
  for (const member of memberData) {
    const actor = game.actors.get(member.actorId);
    if (!actor) continue;

    console.log(`Party Vision | --- Checking ${actor.name} ---`);

    let effectiveLight = null;

    // STRATEGY 1: Check if this actor has any deployed tokens on the scene (not part of a party)
    const deployedTokens = canvas.tokens.placeables.filter(t =>
      t.actor?.id === actor.id &&
      t.id !== partyToken.id &&
      !t.document.getFlag('party-vision', 'memberData') // Not another party token
    );

    if (deployedTokens.length > 0) {
      // Use the first deployed token's light (they should all be the same)
      const token = deployedTokens[0];
      if (token.document.light && (token.document.light.bright > 0 || token.document.light.dim > 0)) {
        effectiveLight = token.document.light;
        console.log(`Party Vision | ${actor.name}: ✓ Strategy 1 (Deployed Token) found light - bright=${effectiveLight.bright}, dim=${effectiveLight.dim}`);
      } else {
        console.log(`Party Vision | ${actor.name}: Strategy 1 (Deployed Token) - token exists but no light`);
      }
    } else {
      console.log(`Party Vision | ${actor.name}: Strategy 1 (Deployed Token) - no deployed tokens found`);
    }

    // STRATEGY 2: Try to get computed token data with effects applied
    if (!effectiveLight) {
      try {
        // Try multiple methods to get effective token data
        let tokenDoc = null;

        // Method A: getTokenDocument (most systems)
        if (typeof actor.getTokenDocument === 'function') {
          tokenDoc = await actor.getTokenDocument();
        }
        // Method B: Create synthetic token (PF2e and other systems)
        else if (typeof actor.getTokenData === 'function') {
          tokenDoc = actor.getTokenData();
        }
        // Method C: Direct prototype access after data prep (fallback)
        else if (actor.prototypeToken) {
          tokenDoc = actor.prototypeToken;
        }

        // Log what we found
        const hasLight = tokenDoc?.light && (tokenDoc.light.bright > 0 || tokenDoc.light.dim > 0);
        console.log(`Party Vision | ${actor.name}: Strategy 2 (Computed Token) - bright=${tokenDoc?.light?.bright || 0}, dim=${tokenDoc?.light?.dim || 0}`);

        if (hasLight) {
          effectiveLight = tokenDoc.light;
          console.log(`Party Vision | ${actor.name}: ✓ Strategy 2 (Computed Token) found meaningful light`);
        } else {
          console.log(`Party Vision | ${actor.name}: Strategy 2 (Computed Token) - no meaningful light found`);
        }
      } catch (e) {
        console.log(`Party Vision | ${actor.name}: Strategy 2 (Computed Token) failed - ${e.message}`);
      }
    }

    // STRATEGY 2.5: Manually apply active effects to prototype token
    if (!effectiveLight) {
      try {
        const effects = actor.effects || [];
        const effectCount = effects.size || effects.length || 0;
        console.log(`Party Vision | ${actor.name}: Strategy 2.5 (Active Effects) - checking ${effectCount} effects`);

        // Start with prototype token light
        let computedLight = foundry.utils.deepClone(actor.prototypeToken?.light || {
          bright: 0, dim: 0, angle: 360, color: null, alpha: 0.5,
          animation: {}, coloration: 1, luminosity: 0.5, attenuation: 0.5,
          contrast: 0, saturation: 0, shadows: 0
        });

        // Apply all active effects that modify light
        let hasEffectLight = false;

        for (const effect of effects) {
          if (!effect.active) continue;

          for (const change of effect.changes || []) {
            const key = change.key || '';

            // Check if this modifies prototypeToken.light OR ATL (Advanced Token Lighting) properties
            if (key.includes('prototypeToken.light') || key.includes('ATL.light') || key.includes('light.')) {
              const parts = key.split('.');
              const lightProp = parts[parts.length - 1]; // e.g., 'bright', 'dim', 'color'
              const value = change.value;

              console.log(`Party Vision | ${actor.name}: Effect "${effect.name}" modifies ${key} = ${value}`);

              // Parse value if it's a string (might be a formula or number string)
              let parsedValue = value;
              if (typeof value === 'string') {
                // Try to parse as number
                const num = Number(value);
                if (!isNaN(num)) {
                  parsedValue = num;
                } else {
                  // Skip formula strings - we can't evaluate them safely
                  console.log(`Party Vision | ${actor.name}: Skipping formula/non-numeric value "${value}"`);
                  continue; // Skip this change
                }
              }

              // Apply the change
              if (lightProp && computedLight) {
                computedLight[lightProp] = parsedValue;
                hasEffectLight = true;
                console.log(`Party Vision | ${actor.name}: Applied ${lightProp} = ${parsedValue}`);
              }
            }
          }
        }

        if (hasEffectLight && (computedLight.bright > 0 || computedLight.dim > 0)) {
          effectiveLight = computedLight;
          console.log(`Party Vision | ${actor.name}: ✓ Strategy 2.5 (Active Effects) found light - bright=${effectiveLight.bright}, dim=${effectiveLight.dim}`);
        } else if (hasEffectLight) {
          console.log(`Party Vision | ${actor.name}: Strategy 2.5 (Active Effects) - effects found but no meaningful light (bright=${computedLight.bright}, dim=${computedLight.dim})`);
        } else {
          console.log(`Party Vision | ${actor.name}: Strategy 2.5 (Active Effects) - no light-modifying effects`);
        }
      } catch (e) {
        console.log(`Party Vision | ${actor.name}: Strategy 2.5 (Active Effects) failed - ${e.message}`);
      }
    }

    // STRATEGY 3: Check for system-specific light-emitting items (PF2e torches, etc.)
    if (!effectiveLight) {
      try {
        const items = actor.items || [];
        const itemCount = items.size || items.length || 0;
        console.log(`Party Vision | ${actor.name}: Strategy 3 (Item Inspection) - scanning ${itemCount} items`);

        for (const item of items) {
          // Check multiple equipped/active states (different systems use different properties)
          const equippedChecks = {
            basic: item.system?.equipped,
            value: item.system?.equipped?.value,
            invested: item.system?.equipped?.invested,
            handsHeld: item.system?.equipped?.handsHeld > 0,
            worn: item.system?.equipped?.carryType === "worn",
            held: item.system?.equipped?.carryType === "held"
          };

          const activationChecks = {
            activated: item.system?.activated,
            active: item.system?.active,
            quantity: (item.system?.quantity || item.system?.quantity?.value) > 0
          };

          const isEquipped = Object.values(equippedChecks).some(v => v);
          const isActivated = Object.values(activationChecks).some(v => v);

          // If item has light properties, log it even if not equipped/activated
          if (item.system?.light) {
            const itemLight = item.system.light;
            const hasLight = (itemLight.bright > 0 || itemLight.dim > 0);

            console.log(`Party Vision | ${actor.name}: Item "${item.name}" - equipped=${isEquipped}, activated=${isActivated}, hasLight=${hasLight}, bright=${itemLight.bright || 0}, dim=${itemLight.dim || 0}`);

            // Use it if equipped/activated AND has meaningful light
            if ((isEquipped || isActivated) && hasLight) {
              effectiveLight = {
                bright: itemLight.bright || 0,
                dim: itemLight.dim || 0,
                angle: itemLight.angle || 360,
                color: itemLight.color || null,
                alpha: itemLight.alpha || 0.5,
                animation: itemLight.animation || {},
                coloration: itemLight.coloration || 1,
                luminosity: itemLight.luminosity || 0.5,
                attenuation: itemLight.attenuation || 0.5,
                contrast: itemLight.contrast || 0,
                saturation: itemLight.saturation || 0,
                shadows: itemLight.shadows || 0
              };
              console.log(`Party Vision | ${actor.name}: ✓ Strategy 3 (Item "${item.name}") found light - bright=${effectiveLight.bright}, dim=${effectiveLight.dim}`);
              break; // Use first light-emitting item found
            }
          }
        }

        if (!effectiveLight) {
          console.log(`Party Vision | ${actor.name}: Strategy 3 (Item Inspection) - no active light-emitting items`);
        }
      } catch (e) {
        console.log(`Party Vision | ${actor.name}: Strategy 3 (Item Inspection) failed - ${e.message}`);
      }
    }

    // STRATEGY 4: Fall back to prototype token (base case)
    if (!effectiveLight) {
      const protoLight = actor.prototypeToken?.light;
      if (protoLight && (protoLight.bright > 0 || protoLight.dim > 0)) {
        effectiveLight = protoLight;
        console.log(`Party Vision | ${actor.name}: ✓ Strategy 4 (Prototype Token) found light - bright=${effectiveLight.bright}, dim=${effectiveLight.dim}`);
      } else {
        console.log(`Party Vision | ${actor.name}: Strategy 4 (Prototype Token) - no meaningful light`);
      }
    }

    // Check if this actor has any meaningful light and add to collection
    if (effectiveLight && (effectiveLight.bright > 0 || effectiveLight.dim > 0)) {
      lights.push({
        actorName: actor.name,
        bright: effectiveLight.bright || 0,
        dim: effectiveLight.dim || 0,
        angle: effectiveLight.angle || 360,
        color: effectiveLight.color,
        alpha: effectiveLight.alpha || 0.5,
        animation: effectiveLight.animation || {},
        coloration: effectiveLight.coloration || 1,
        luminosity: effectiveLight.luminosity || 0.5,
        attenuation: effectiveLight.attenuation || 0.5,
        contrast: effectiveLight.contrast || 0,
        saturation: effectiveLight.saturation || 0,
        shadows: effectiveLight.shadows || 0
      });
      console.log(`Party Vision | ${actor.name}: ✅ ADDED TO LIGHTS ARRAY (bright=${effectiveLight.bright}, dim=${effectiveLight.dim})`);
    } else {
      console.log(`Party Vision | ${actor.name}: ❌ NO LIGHT - not added to array`);
    }
  }

  console.log(`Party Vision | ===== LIGHT COLLECTION COMPLETE: Found ${lights.length} light source(s) =====`);
  if (lights.length > 0) {
    lights.forEach(l => console.log(`Party Vision |   - ${l.actorName}: bright=${l.bright}, dim=${l.dim}`));
  }

  // Aggregate lighting - use brightest
  const lightToApply = aggregateLights(lights);

  // Update party token lighting with error handling
  try {
    await partyToken.document.update({ light: lightToApply });

    if (lightToApply.bright > 0 || lightToApply.dim > 0) {
      console.log(`Party Vision | ✅ Party token lighting updated: bright=${lightToApply.bright}, dim=${lightToApply.dim}`);
    } else {
      console.log(`Party Vision | ✅ Party token lighting cleared (no light sources)`);
    }
  } catch (error) {
    console.error(`Party Vision | ❌ Failed to update party token lighting:`, error);
    ui.notifications.warn("Party Vision: Failed to update party token lighting. See console for details.");
  }
}

/**
 * Aggregate multiple light sources into a single light configuration
 * @param {Array} lights - Array of light configurations
 * @returns {Object} Aggregated light configuration
 */
function aggregateLights(lights) {
  if (lights.length === 0) {
    // No lights - return dark configuration
    console.log(`Party Vision | No lights found, party token will be dark`);
    return {
      bright: 0,
      dim: 0,
      angle: 360,
      color: null,
      alpha: 0.5,
      animation: {},
      coloration: 1,
      luminosity: 0.5,
      attenuation: 0.5,
      contrast: 0,
      saturation: 0,
      shadows: 0
    };
  }

  if (lights.length === 1) {
    // Single light - return as-is
    console.log(`Party Vision | Using ${lights[0].actorName}'s light (only source)`);
    return lights[0];
  }

  // Multiple lights - use the brightest
  let brightestLight = lights[0];
  let maxRange = lights[0].bright + lights[0].dim;

  for (let i = 1; i < lights.length; i++) {
    const range = lights[i].bright + lights[i].dim;
    if (range > maxRange) {
      maxRange = range;
      brightestLight = lights[i];
    }
  }

  console.log(`Party Vision | Multiple lights detected, using ${brightestLight.actorName}'s light (brightest at ${maxRange}ft total)`);

  // Use brightest light's configuration
  return brightestLight;
}

/**
 * Update party lighting (legacy wrapper)
 * @param {Token} partyToken - The party token
 */
async function updatePartyLighting(partyToken) {
  return updatePartyLightingFromActors(partyToken);
}

/**
 * Cycle through light sources on a party token
 * @param {Token} partyToken - The party token
 */
async function cycleLightSource(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) {
    ui.notifications.warn("This token has no party data.");
    return;
  }

  // Collect all members with light sources (including items/effects)
  const lightsources = [];

  for (const member of memberData) {
    const actor = game.actors.get(member.actorId);
    if (!actor) continue;

    let effectiveLight = null;

    // STRATEGY 1: Check if this actor has deployed tokens on the scene
    const deployedTokens = canvas.tokens.placeables.filter(t =>
      t.actor?.id === actor.id &&
      t.id !== partyToken.id &&
      !t.document.getFlag('party-vision', 'memberData')
    );

    if (deployedTokens.length > 0) {
      const token = deployedTokens[0];
      if (token.document.light && (token.document.light.bright > 0 || token.document.light.dim > 0)) {
        effectiveLight = foundry.utils.deepClone(token.document.light);
      }
    }

    // STRATEGY 2: Try to get computed token data with effects applied
    if (!effectiveLight) {
      try {
        let tokenDoc = null;

        if (typeof actor.getTokenDocument === 'function') {
          tokenDoc = await actor.getTokenDocument();
        } else if (typeof actor.getTokenData === 'function') {
          tokenDoc = actor.getTokenData();
        } else if (actor.prototypeToken) {
          tokenDoc = actor.prototypeToken;
        }

        if (tokenDoc?.light && (tokenDoc.light.bright > 0 || tokenDoc.light.dim > 0)) {
          effectiveLight = foundry.utils.deepClone(tokenDoc.light);
        }
      } catch (e) {
        // Silently continue
      }
    }

    // STRATEGY 3: Check for light-emitting items (torches, lanterns, etc.)
    if (!effectiveLight) {
      try {
        const items = actor.items || [];

        for (const item of items) {
          // Check if item is equipped/held
          const equippedChecks = {
            equipped: item.system?.equipped === true,
            worn: item.system?.equipped?.carryType === "worn",
            held: item.system?.equipped?.carryType === "held"
          };

          const activationChecks = {
            activated: item.system?.activated,
            active: item.system?.active,
            quantity: (item.system?.quantity || item.system?.quantity?.value) > 0
          };

          const isEquipped = Object.values(equippedChecks).some(v => v);
          const isActivated = Object.values(activationChecks).some(v => v);

          // If item has light properties and is equipped/activated
          if (item.system?.light) {
            const itemLight = item.system.light;
            const hasLight = (itemLight.bright > 0 || itemLight.dim > 0);

            if ((isEquipped || isActivated) && hasLight) {
              effectiveLight = {
                bright: itemLight.bright || 0,
                dim: itemLight.dim || 0,
                angle: itemLight.angle || 360,
                color: itemLight.color || null,
                alpha: itemLight.alpha || 0.5,
                animation: itemLight.animation || {},
                coloration: itemLight.coloration || 1,
                luminosity: itemLight.luminosity || 0.5,
                attenuation: itemLight.attenuation || 0.5,
                contrast: itemLight.contrast || 0,
                saturation: itemLight.saturation || 0,
                shadows: itemLight.shadows || 0
              };
              console.log(`Party Vision | Found light source from item: ${item.name}`);
              break; // Use first light-emitting item found
            }
          }
        }
      } catch (e) {
        // Silently continue
      }
    }

    // STRATEGY 4: Fall back to original stored light
    if (!effectiveLight && member.originalLight) {
      if (member.originalLight.bright > 0 || member.originalLight.dim > 0) {
        effectiveLight = foundry.utils.deepClone(member.originalLight);
      }
    }

    if (effectiveLight) {
      lightsources.push({
        name: member.name,
        actorId: actor.id,
        light: effectiveLight
      });
      console.log(`Party Vision | Found light source: ${member.name} - bright: ${effectiveLight.bright}, dim: ${effectiveLight.dim}, color: ${effectiveLight.color}`);
    }
  }

  if (lightsources.length === 0) {
    ui.notifications.info("No party members have light sources.");
    return;
  }

  console.log(`Party Vision | Total light sources found: ${lightsources.length}`);

  // Sort light sources by brightness (brightest first)
  lightsources.sort((a, b) => {
    const brightnessA = (a.light.bright || 0) + (a.light.dim || 0) * 0.5;
    const brightnessB = (b.light.bright || 0) + (b.light.dim || 0) * 0.5;
    return brightnessB - brightnessA;
  });

  // Get current light state
  const currentLight = partyToken.document.light;
  const isLightOff = !currentLight || (currentLight.bright === 0 && currentLight.dim === 0);

  console.log(`Party Vision | Current party light - bright: ${currentLight?.bright}, dim: ${currentLight?.dim}, color: ${currentLight?.color}`);

  // Find current light source index using more lenient matching
  let currentIndex = -1;
  if (!isLightOff) {
    for (let i = 0; i < lightsources.length; i++) {
      const source = lightsources[i];

      // Compare key properties with tolerance for minor differences
      const brightMatch = (source.light.bright || 0) === (currentLight.bright || 0);
      const dimMatch = (source.light.dim || 0) === (currentLight.dim || 0);

      // Color comparison - handle null/"" equivalence
      const sourceColor = source.light.color || null;
      const currentColor = currentLight.color || null;
      const colorMatch = sourceColor === currentColor;

      console.log(`Party Vision | Comparing ${source.name}: bright=${brightMatch}, dim=${dimMatch}, color=${colorMatch}`);

      if (brightMatch && dimMatch && colorMatch) {
        currentIndex = i;
        console.log(`Party Vision | Match found at index ${i}: ${source.name}`);
        break;
      }
    }

    if (currentIndex === -1) {
      console.log(`Party Vision | No exact match found, will cycle from beginning`);
    }
  }

  // Cycle logic: brightest -> next brightest -> ... -> dimmest -> off -> brightest
  let newLight;
  let message;

  if (isLightOff) {
    // Currently off, go to brightest
    newLight = lightsources[0].light;
    message = `Party light: ${lightsources[0].name} (brightest)`;
    console.log(`Party Vision | Cycling: Off -> ${lightsources[0].name}`);
  } else if (currentIndex >= 0 && currentIndex < lightsources.length - 1) {
    // Go to next light source
    newLight = lightsources[currentIndex + 1].light;
    message = `Party light: ${lightsources[currentIndex + 1].name}`;
    console.log(`Party Vision | Cycling: ${lightsources[currentIndex].name} -> ${lightsources[currentIndex + 1].name}`);
  } else {
    // Last light source or unknown, turn off
    newLight = {
      bright: 0,
      dim: 0,
      angle: 360,
      alpha: 0.5,
      animation: { type: null }
    };
    message = "Party light: Off";
    console.log(`Party Vision | Cycling: ${currentIndex >= 0 ? lightsources[currentIndex].name : 'Unknown'} -> Off`);
  }

  console.log(`Party Vision | Applying new light: bright=${newLight.bright}, dim=${newLight.dim}`);
  await partyToken.document.update({ light: newLight });
  ui.notifications.info(message);
}

// ==============================================
// FOLLOW-THE-LEADER MODE
// ==============================================

/**
 * Toggle follow-the-leader mode for selected tokens
 */
function toggleFollowLeaderMode() {
  const controlled = canvas.tokens.controlled;
  
  if (followLeaderMode) {
    // Disable follow mode
    followLeaderMode = false;
    leaderToken = null;
    followerOffsets.clear();
    ui.notifications.info("Follow-the-Leader mode disabled.");
  } else {
    // Enable follow mode
    if (controlled.length < 2) {
      ui.notifications.warn("Select at least 2 tokens to enable Follow-the-Leader mode.");
      return;
    }
    
    followLeaderMode = true;
    leaderToken = controlled[0];
    followerOffsets.clear();
    
    // Store grid offsets for each follower
    const gridSize = canvas.grid.size;
    const leaderGridX = leaderToken.x / gridSize;
    const leaderGridY = leaderToken.y / gridSize;
    
    for (let i = 1; i < controlled.length; i++) {
      const follower = controlled[i];
      const followerGridX = follower.x / gridSize;
      const followerGridY = follower.y / gridSize;
      
      followerOffsets.set(follower.id, {
        dx: followerGridX - leaderGridX,
        dy: followerGridY - leaderGridY
      });
    }
    
    ui.notifications.info(`Follow-the-Leader mode enabled. ${leaderToken.name} is the leader.`);
  }
}

// Hook for token updates to maintain formation
Hooks.on('updateToken', (tokenDoc, change, options, userId) => {
  // Handle follow-the-leader mode
  if (followLeaderMode && leaderToken && tokenDoc.id === leaderToken.id && (change.x || change.y)) {
    // Leader moved, update followers
    const gridSize = canvas.grid.size;

    // Validate gridSize to prevent division by zero
    if (!gridSize || gridSize === 0) {
      console.error('Party Vision | Invalid grid size, cannot update follower positions');
      return;
    }

    const leaderGridX = leaderToken.x / gridSize;
    const leaderGridY = leaderToken.y / gridSize;

    for (const [followerId, offset] of followerOffsets.entries()) {
      const follower = canvas.tokens.get(followerId);
      if (!follower) continue;

      const newGridX = leaderGridX + offset.dx;
      const newGridY = leaderGridY + offset.dy;
      const newX = newGridX * gridSize;
      const newY = newGridY * gridSize;

      // Check for wall collisions
      if (!hasWallCollision(newX + follower.w / 2, newY + follower.h / 2, follower.document.width, follower.document.height)) {
        follower.document.update({ x: newX, y: newY }, { animate: false });
      }
    }
  }

  // Handle HP updates for deployed party member tokens (unlinked tokens)
  const hpChanged = change.actorData?.system?.attributes?.hp ||
                     change.actorData?.system?.health ||
                     change.actorData?.system?.hp ||
                     change.delta?.system?.attributes?.hp ||
                     change.delta?.system?.health ||
                     change.delta?.system?.hp;

  if (hpChanged && game.settings.get('party-vision', 'showHealthIndicator')) {
    const token = canvas.tokens.get(tokenDoc.id);
    if (!token) return;

    // Check if this token's actor is in any party
    const actorId = token.actor?.id;
    if (!actorId) return;

    // Find party tokens containing this actor
    canvas.tokens.placeables.forEach(partyToken => {
      const memberData = partyToken.document.getFlag('party-vision', 'memberData');
      if (!memberData) return;

      const hasMember = memberData.some(m => m.actorId === actorId);
      if (hasMember) {
        refreshHealthIndicator(partyToken);
      }
    });
  }
});

// ==============================================
// COMBAT INTEGRATION
// ==============================================

// Intercept attempts to add party tokens to combat
Hooks.on('preCreateCombatant', async (combatant, data, options, userId) => {
  // Get the token being added
  const tokenId = data.tokenId;
  const tokenDoc = canvas.scene.tokens.get(tokenId);

  if (!tokenDoc) return true;

  // Check if this is a party token
  const memberData = tokenDoc.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) return true;

  console.log('Party Vision | Intercepting party token combat addition');

  // Prevent the party token itself from being added
  const partyToken = canvas.tokens.get(tokenId);
  if (partyToken) {
    // Add all member actors instead
    await addPartyToCombat(partyToken);
  }

  // Return false to prevent the party token combatant from being created
  return false;
});

// Auto-deploy when adding party tokens to combat
Hooks.on('createCombatant', async (combatant, options, userId) => {
  if (!game.user.isGM) return;
  if (!game.settings.get('party-vision', 'autoDeployOnCombat')) return;

  const tokenDoc = combatant.token;
  if (!tokenDoc) return;

  const memberData = tokenDoc.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) return;

  const partyToken = canvas.tokens.get(tokenDoc.id);
  if (!partyToken) return;

  // TODO: Replace with combat initialization event to eliminate race condition
  // WORKAROUND: Wait for combat to fully initialize before showing deploy dialog
  // This prevents UI issues when combat tracker hasn't finished setting up
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('Party Vision | Party token added to combat - showing deploy dialog');
  ui.notifications.info(`Added party to combat`);
  
  try {
    await showDeployDialog(partyToken);
  } catch (error) {
    console.error('Party Vision | Auto-deploy failed:', error);
    ui.notifications.warn('Party Vision: Auto-deploy failed, deploy manually');
  }
});

// Auto-form when combat ends
Hooks.on('deleteCombat', async (combat, options, userId) => {
  if (!game.user.isGM) return;
  if (!game.settings.get('party-vision', 'autoFormOnCombatEnd')) return;
  
  // Get all tokens that were in combat
  const combatantTokens = combat.combatants.map(c => canvas.tokens.get(c.tokenId)).filter(t => t);
  
  // Check if we should auto-form
  if (combatantTokens.length >= 2) {
    // Select the tokens
    combatantTokens.forEach(t => t.control({ releaseOthers: false }));

    // Show form dialog
    ui.notifications.info("Combat ended. Form party?");

    // TODO: Replace with canvas ready event to eliminate race condition
    // WORKAROUND: Auto-show form dialog after a delay to allow UI to settle
    // This ensures all combat cleanup is complete before showing the dialog
    setTimeout(() => {
      if (window.PartyVision && window.PartyVision.showFormPartyDialog) {
        window.PartyVision.showFormPartyDialog();
      }
    }, 1000);
  }
});

// ==============================================
// ITEM HOOKS - LIGHTING UPDATES
// ==============================================

/**
 * Watch for item updates (equipped items like torches)
 * This catches when players equip/unequip light-emitting items
 */
Hooks.on('updateItem', async (item, change, options, userId) => {
  // Check if this is an item owned by an actor
  const actor = item.parent;
  if (!actor || actor.documentName !== 'Actor') return;

  // Quick check: is this actor in any party?
  const partyTokens = canvas.tokens.placeables.filter(t => {
    const memberData = t.document.getFlag('party-vision', 'memberData');
    if (!memberData) return false;
    return memberData.some(m => m.actorId === actor.id);
  });

  // If actor isn't in any party, no need to update
  if (partyTokens.length === 0) return;

  console.log(`Party Vision | Item "${item.name}" updated on ${actor.name} (in party), checking lighting...`);

  // Update lighting on each party token
  // The updatePartyLightingFromActors function will read the current light state
  for (const partyToken of partyTokens) {
    debouncedUpdatePartyLighting(partyToken);
  }
});

/**
 * Watch for item creation (e.g., buying/finding a torch)
 */
Hooks.on('createItem', async (item, options, userId) => {
  const actor = item.parent;
  if (!actor || actor.documentName !== 'Actor') return;

  const partyTokens = canvas.tokens.placeables.filter(t => {
    const memberData = t.document.getFlag('party-vision', 'memberData');
    if (!memberData) return false;
    return memberData.some(m => m.actorId === actor.id);
  });

  if (partyTokens.length === 0) return;

  console.log(`Party Vision | Item "${item.name}" created on ${actor.name} (in party), checking lighting...`);

  for (const partyToken of partyTokens) {
    debouncedUpdatePartyLighting(partyToken);
  }
});

/**
 * Watch for item deletion (e.g., torch consumed/removed)
 */
Hooks.on('deleteItem', async (item, options, userId) => {
  const actor = item.parent;
  if (!actor || actor.documentName !== 'Actor') return;

  const partyTokens = canvas.tokens.placeables.filter(t => {
    const memberData = t.document.getFlag('party-vision', 'memberData');
    if (!memberData) return false;
    return memberData.some(m => m.actorId === actor.id);
  });

  if (partyTokens.length === 0) return;

  console.log(`Party Vision | Item "${item.name}" deleted from ${actor.name} (in party), checking lighting...`);

  for (const partyToken of partyTokens) {
    debouncedUpdatePartyLighting(partyToken);
  }
});

// ==============================================
// ACTOR HOOKS - LIGHTING UPDATES
// ==============================================

// Update party lighting when actor light changes
Hooks.on('updateActor', (actor, change, options, userId) => {
  // Check what was changed
  const lightChanged = change.prototypeToken?.light;
  const hpChanged = change.system?.attributes?.hp || change.system?.health || change.system?.hp;

  // If nothing relevant changed, return early
  if (!lightChanged && !hpChanged) return;

  // Find party tokens containing this actor
  canvas.tokens.placeables.forEach(token => {
    const memberData = token.document.getFlag('party-vision', 'memberData');
    if (!memberData) return;

    const hasMember = memberData.some(m => m.actorId === actor.id);
    if (hasMember) {
      // Update lighting if light changed
      if (lightChanged) {
        debouncedUpdatePartyLighting(token);
      }

      // Update health indicator if HP changed
      if (hpChanged && game.settings.get('party-vision', 'showHealthIndicator')) {
        refreshHealthIndicator(token);
      }
    }
  });
});

// Update party lighting when active effect changes
Hooks.on('createActiveEffect', (effect, options, userId) => {
  const actor = effect.parent;
  if (!actor) return;

  // Find party tokens containing this actor
  const partyTokens = canvas.tokens.placeables.filter(t => {
    const memberData = t.document.getFlag('party-vision', 'memberData');
    if (!memberData) return false;
    return memberData.some(m => m.actorId === actor.id);
  });

  if (partyTokens.length === 0) return;

  console.log(`Party Vision | Active Effect "${effect.name}" created on ${actor.name}, updating ${partyTokens.length} party token(s)`);

  // Update lighting on each party token
  // We update for ANY active effect change because effects might indirectly affect lighting
  // (e.g., in PF2e, spell effects modify system data that affects computed token light)
  for (const partyToken of partyTokens) {
    debouncedUpdatePartyLighting(partyToken);
  }
});

Hooks.on('deleteActiveEffect', (effect, options, userId) => {
  const actor = effect.parent;
  if (!actor) return;

  // Find party tokens containing this actor
  const partyTokens = canvas.tokens.placeables.filter(t => {
    const memberData = t.document.getFlag('party-vision', 'memberData');
    if (!memberData) return false;
    return memberData.some(m => m.actorId === actor.id);
  });

  if (partyTokens.length === 0) return;

  console.log(`Party Vision | Active Effect "${effect.name}" deleted from ${actor.name}, updating ${partyTokens.length} party token(s)`);

  // Update lighting on each party token
  for (const partyToken of partyTokens) {
    debouncedUpdatePartyLighting(partyToken);
  }
});

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Determine which direction is "forward" based on the leader's position relative to the group
 * @param {number} dx - X component of vector from group center to leader
 * @param {number} dy - Y component of vector from group center to leader
 * @returns {string} Direction: 'north', 'east', 'south', or 'west'
 */
function determineNaturalFacingFromOffsets(dx, dy) {
  // If leader is isolated (no other members), default to north
  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
    return 'north';
  }
  
  // Determine primary direction based on which component is larger
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  
  if (absX > absY) {
    // Horizontal orientation dominates
    return dx > 0 ? 'east' : 'west';
  } else {
    // Vertical orientation dominates
    return dy > 0 ? 'south' : 'north';
  }
}

// ==============================================
// PLAYER-FRIENDLY HELPER FUNCTIONS
// ==============================================

/**
 * Open all member actor sheets
 * @param {Token} partyToken - The party token
 */
async function openAllMemberSheets(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) {
    ui.notifications.warn('No party members found');
    return;
  }

  console.log('Party Vision | Opening all member sheets');

  let offsetX = 20;
  let offsetY = 20;
  const increment = 30;

  for (const member of memberData) {
    const actor = game.actors.get(member.actorId);
    if (!actor) continue;

    // Check if user has permission to view
    if (!actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)) continue;

    const sheet = actor.sheet;
    await sheet.render(true, { left: offsetX, top: offsetY });

    offsetX += increment;
    offsetY += increment;

    // Reset position if too far off screen
    if (offsetX > window.innerWidth - 400 || offsetY > window.innerHeight - 400) {
      offsetX = 20;
      offsetY = 20;
    }
  }

  ui.notifications.info(`Opened ${memberData.length} character sheet(s)`);
}

/**
 * Toggle combat state for entire party
 * @param {Token} partyToken - The party token
 */
async function togglePartyCombat(partyToken) {
  try {
    const memberData = partyToken.document.getFlag('party-vision', 'memberData');
    if (!memberData || memberData.length === 0) {
      ui.notifications.warn('No party members found');
      return;
    }

    const combat = game.combat;
    if (!combat) {
      ui.notifications.warn('No active combat encounter');
      return;
    }

    // Check if party is already in combat
    const partyInCombat = combat.combatants.some(c =>
      c.tokenId === partyToken.id
    );

    if (partyInCombat) {
      // Remove from combat
      const combatant = combat.combatants.find(c => c.tokenId === partyToken.id);
      if (combatant) {
        await combatant.delete();
        ui.notifications.info('Removed party from combat');
      }
    } else {
      // Add all members to combat
      await addPartyToCombat(partyToken);
    }
  } catch (error) {
    console.error('Party Vision | Error toggling party combat:', error);
    ui.notifications.error(`Failed to toggle party combat: ${error.message}`);
  }
}

/**
 * Add all party members to combat tracker
 * @param {Token} partyToken - The party token
 */
async function addPartyToCombat(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) {
    ui.notifications.warn('No party members found');
    return;
  }

  let combat = game.combat;

  // If no active combat, create one
  if (!combat) {
    try {
      console.log('Party Vision | No active combat, creating new encounter');
      const combatData = {
        scene: canvas.scene.id,
        active: true
      };
      const created = await Combat.create(combatData);
      if (!created) {
        throw new Error('Combat creation returned null');
      }
      combat = created;
      await created.activate();
    } catch (error) {
      console.error('Party Vision | Failed to create combat encounter:', error);
      ui.notifications.error(`Failed to create combat encounter: ${error.message}`);
      return;
    }
  }

  console.log('Party Vision | Adding all party members to combat');

  const combatantsToCreate = [];

  for (const member of memberData) {
    const actor = game.actors.get(member.actorId);
    if (!actor) {
      console.log(`Party Vision | Actor not found for ${member.name}`);
      continue;
    }

    // Check if already in combat
    const existing = combat.combatants.find(c => c.actorId === actor.id);
    if (existing) {
      console.log(`Party Vision | ${actor.name} already in combat, skipping`);
      continue;
    }

    combatantsToCreate.push({
      tokenId: partyToken.id,
      actorId: actor.id,
      sceneId: canvas.scene.id,
      hidden: partyToken.document.hidden
    });

    console.log(`Party Vision | Queuing ${actor.name} for combat`);
  }

  if (combatantsToCreate.length > 0) {
    console.log(`Party Vision | Creating ${combatantsToCreate.length} combatant(s)`);
    const created = await combat.createEmbeddedDocuments('Combatant', combatantsToCreate);
    console.log(`Party Vision | Successfully created combatants:`, created);
    ui.notifications.info(`Added ${combatantsToCreate.length} party member(s) to combat`);

    // Auto-roll initiative if enabled
    if (game.settings.get('party-vision', 'autoRollInitiative')) {
      // Get the actual combatant IDs from created documents
      const combatantIds = created.map(c => c.id);
      await rollPartyInitiative(combat, combatantIds);
    }
  } else {
    ui.notifications.info('All party members are already in combat');
  }
}

/**
 * Roll initiative for all party members
 * @param {Combat} combat - The combat encounter
 * @param {Array} combatantIds - Array of combatant IDs or combatant data objects
 */
async function rollPartyInitiative(combat, combatantIds) {
  console.log('Party Vision | Rolling initiative for party members');

  for (const id of combatantIds) {
    // Handle both combatant IDs (strings) and combatant data objects
    const combatant = typeof id === 'string'
      ? combat.combatants.get(id)
      : combat.combatants.find(c => c.actorId === id.actorId);

    // Check for null/undefined initiative (not 0, which is valid)
    if (combatant && (combatant.initiative === null || combatant.initiative === undefined)) {
      console.log(`Party Vision | Rolling initiative for ${combatant.name}`);
      await combatant.rollInitiative();
    }
  }

  ui.notifications.info('Rolled initiative for party members');
}

/**
 * Show member access panel
 * @param {Token} partyToken - The party token
 */
async function showMemberAccessPanel(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) {
    ui.notifications.warn('No party members found');
    return;
  }

  const members = memberData.map(m => {
    const actor = game.actors.get(m.actorId);
    return {
      ...m,
      actor,
      hp: actor ? getActorHP(actor) : null,
      maxHp: actor ? getActorMaxHP(actor) : null,
      effects: actor ? Array.from(actor.effects).filter(e => !e.disabled) : []
    };
  }).filter(m => m.actor); // Only include valid actors

  const content = `
    <div class="party-member-panel">
      <h3>Party Members</h3>
      <div class="member-list">
        ${members.map((m, i) => `
          <div class="member-item" data-index="${i}">
            <img src="${sanitizeImageURL(m.img)}" alt="${escapeHTML(m.name)}" class="member-portrait">
            <div class="member-info">
              <div class="member-name">${escapeHTML(m.name)}</div>
              <div class="member-hp">HP: ${m.hp}/${m.maxHp}</div>
              ${m.effects.length > 0 ? `
                <div class="member-effects">
                  ${m.effects.map(e => `<span class="effect-icon" title="${escapeHTML(e.name)}"><i class="${sanitizeClassName(e.icon || 'fas fa-circle')}"></i></span>`).join('')}
                </div>
              ` : ''}
            </div>
            <div class="member-actions">
              <button class="open-sheet" data-actor-id="${m.actorId}" title="Open Sheet">
                <i class="fas fa-scroll"></i>
              </button>
              <button class="split-member" data-index="${i}" title="Split from Party">
                <i class="fas fa-user-minus"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const dialog = new Dialog({
    title: 'Party Members',
    content,
    buttons: {
      close: {
        icon: '<i class="fas fa-times"></i>',
        label: 'Close'
      }
    },
    render: (html) => {
      html.find('.open-sheet').on('click', (e) => {
        const actorId = e.currentTarget.dataset.actorId;
        const actor = game.actors.get(actorId);
        if (actor) actor.sheet.render(true);
      });

      html.find('.split-member').on('click', async (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        await splitAndDeployMembers(partyToken, [index], 'custom', 'north', false);
        dialog.close();
      });
    }
  }, {
    width: 400,
    classes: ['party-vision-dialog', 'party-member-panel-dialog']
  });

  dialog.render(true);
}

/**
 * Show quick split dialog
 * @param {Token} partyToken - The party token
 */
async function showQuickSplitDialog(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) {
    ui.notifications.warn('No party members found');
    return;
  }

  const members = memberData.map((m, i) => {
    const actor = game.actors.get(m.actorId);
    return { ...m, actor, index: i };
  }).filter(m => m.actor);

  const content = `
    <div class="quick-split-panel">
      <p>Select a member to split from the party:</p>
      <div class="member-select-list">
        ${members.map(m => `
          <div class="member-select-item" data-index="${m.index}">
            <img src="${sanitizeImageURL(m.img)}" alt="${escapeHTML(m.name)}" class="member-portrait-small">
            <span class="member-name">${escapeHTML(m.name)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const dialog = new Dialog({
    title: 'Split Member from Party',
    content,
    buttons: {
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: 'Cancel'
      }
    },
    render: (html) => {
      html.find('.member-select-item').on('click', async (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        await splitAndDeployMembers(partyToken, [index], 'custom', 'north', false);
        dialog.close();
        ui.notifications.info(`Split ${members[index].name} from party`);
      });
    }
  }, {
    width: 300,
    classes: ['party-vision-dialog', 'quick-split-dialog']
  });

  dialog.render(true);
}

/**
 * Show party status in chat
 */
function showPartyStatus() {
  const partyTokens = canvas.tokens.controlled.filter(t => {
    const memberData = t.document.getFlag('party-vision', 'memberData');
    return memberData && memberData.length > 0;
  });

  if (partyTokens.length === 0) {
    const allPartyTokens = canvas.tokens.placeables.filter(t => {
      const memberData = t.document.getFlag('party-vision', 'memberData');
      return memberData && memberData.length > 0;
    });

    if (allPartyTokens.length === 0) {
      ChatMessage.create({
        content: '<p>No party tokens found on this scene.</p>',
        whisper: [game.user.id]
      });
      return;
    }

    // Use the first party token found
    partyTokens.push(allPartyTokens[0]);
  }

  const partyToken = partyTokens[0];
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');

  const members = memberData.map(m => {
    const actor = game.actors.get(m.actorId);
    return {
      name: m.name,
      hp: actor ? getActorHP(actor) : '?',
      maxHp: actor ? getActorMaxHP(actor) : '?',
      effects: actor ? Array.from(actor.effects).filter(e => !e.disabled).map(e => e.name).join(', ') : 'None'
    };
  });

  const content = `
    <div class="party-status-chat">
      <h3>Party Status: ${partyToken.name}</h3>
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>HP</th>
            <th>Effects</th>
          </tr>
        </thead>
        <tbody>
          ${members.map(m => `
            <tr>
              <td>${m.name}</td>
              <td>${m.hp}/${m.maxHp}</td>
              <td>${m.effects || 'None'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  ChatMessage.create({
    content,
    whisper: [game.user.id]
  });
}

/**
 * Show party members in chat
 */
function showPartyMembers() {
  const partyTokens = canvas.tokens.controlled.filter(t => {
    const memberData = t.document.getFlag('party-vision', 'memberData');
    return memberData && memberData.length > 0;
  });

  if (partyTokens.length === 0) {
    const allPartyTokens = canvas.tokens.placeables.filter(t => {
      const memberData = t.document.getFlag('party-vision', 'memberData');
      return memberData && memberData.length > 0;
    });

    if (allPartyTokens.length === 0) {
      ChatMessage.create({
        content: '<p>No party tokens found on this scene.</p>',
        whisper: [game.user.id]
      });
      return;
    }

    partyTokens.push(allPartyTokens[0]);
  }

  const partyToken = partyTokens[0];
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');

  const content = `
    <div class="party-members-chat">
      <h3>Party Members: ${partyToken.name}</h3>
      <ul>
        ${memberData.map(m => `<li>${m.name}${m.isLeader ? ' (Leader)' : ''}</li>`).join('')}
      </ul>
      <p><strong>Total Members:</strong> ${memberData.length}</p>
    </div>
  `;

  ChatMessage.create({
    content,
    whisper: [game.user.id]
  });
}

/**
 * Show party command help
 */
function showPartyHelp() {
  const content = `
    <div class="party-help-chat">
      <h3>Party Vision Commands</h3>
      <ul>
        <li><strong>/party status</strong> - Show party health and status effects</li>
        <li><strong>/party members</strong> - List all party members</li>
        <li><strong>/party help</strong> - Show this help message</li>
      </ul>
    </div>
  `;

  ChatMessage.create({
    content,
    whisper: [game.user.id]
  });
}

/**
 * Get highest perception value in party (system-agnostic)
 * Returns passive perception for D&D 5e, perception modifier for PF2e
 * @param {Token} partyToken - The party token
 * @returns {number|null} Highest perception value
 */
function getHighestPassivePerception(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) return null;

  let highest = 0;

  for (const member of memberData) {
    const actor = game.actors.get(member.actorId);
    if (!actor) continue;

    const pp = getActorPassivePerception(actor);
    if (pp > highest) highest = pp;
  }

  return highest > 0 ? highest : null;
}

/**
 * Get actor perception value (system-agnostic)
 * For D&D 5e: returns passive perception (10 + modifier)
 * For PF2e: returns perception modifier
 * @param {Actor} actor - The actor
 * @returns {number} Perception value
 */
function getActorPassivePerception(actor) {
  // Input validation
  if (!actor?.system) {
    console.warn('Party Vision | getActorPassivePerception called with invalid actor');
    return 10; // Default perception
  }

  // D&D 5e - has passive perception
  if (actor.system.skills?.prc?.passive) return actor.system.skills.prc.passive;

  // PF2e - use perception modifier
  if (game.system.id === 'pf2e') {
    // Try various PF2e perception paths
    if (actor.system.perception?.totalModifier !== undefined) return actor.system.perception.totalModifier;
    if (actor.system.perception?.mod !== undefined) return actor.system.perception.mod;
    if (actor.system.attributes?.perception?.totalModifier !== undefined) return actor.system.attributes.perception.totalModifier;
    if (actor.system.attributes?.perception?.value !== undefined) return actor.system.attributes.perception.value;
  }

  // Generic passive perception fallback (other systems)
  if (actor.system.perception?.passive) return actor.system.perception.passive;

  // Last resort: calculate passive perception D&D style
  const perceptionBonus = actor.system.skills?.perception?.total || actor.system.skills?.prc?.total || 0;
  return 10 + perceptionBonus;
}

/**
 * Get actor HP (system-agnostic)
 * @param {Actor} actor - The actor
 * @returns {number} Current HP
 */
function getActorHP(actor) {
  // Input validation
  if (!actor?.system) {
    console.warn('Party Vision | getActorHP called with invalid actor');
    return 0;
  }

  if (actor.system.attributes?.hp?.value !== undefined) return actor.system.attributes.hp.value;
  if (actor.system.health?.value !== undefined) return actor.system.health.value;
  if (actor.system.hp?.value !== undefined) return actor.system.hp.value;
  return 0;
}

/**
 * Get actor max HP (system-agnostic)
 * @param {Actor} actor - The actor
 * @returns {number} Max HP
 */
function getActorMaxHP(actor) {
  // Input validation
  if (!actor?.system) {
    console.warn('Party Vision | getActorMaxHP called with invalid actor');
    return 0;
  }

  if (actor.system.attributes?.hp?.max !== undefined) return actor.system.attributes.hp.max;
  if (actor.system.health?.max !== undefined) return actor.system.health.max;
  if (actor.system.hp?.max !== undefined) return actor.system.hp.max;
  return 0;
}

/**
 * Get character role/class for smart formation ordering
 * @param {Actor} actor - The actor
 * @returns {string} Role: 'tank', 'striker', 'support', or 'unknown'
 */
function getCharacterRole(actor) {
  if (!actor || !actor.system) return 'unknown';

  // Detect system
  const systemId = game.system.id;

  // D&D 5e
  if (systemId === 'dnd5e') {
    const classes = actor.items ? Array.from(actor.items).filter(i => i.type === 'class') : [];
    const classNames = classes.map(c => c.name?.toLowerCase() || '').join(' ');

    // Tanks/Defenders (high AC, front line)
    if (classNames.match(/fighter|paladin|barbarian|monk/)) {
      return 'tank';
    }
    // Strikers (melee damage dealers)
    if (classNames.match(/rogue|ranger|blood hunter/)) {
      return 'striker';
    }
    // Support/Casters (stay in back)
    if (classNames.match(/wizard|sorcerer|warlock|bard|cleric|druid|artificer/)) {
      return 'support';
    }
  }

  // Pathfinder 2e
  if (systemId === 'pf2e') {
    const className = actor.class?.name?.toLowerCase() || '';

    // Tanks/Defenders
    if (className.match(/fighter|champion|monk|barbarian/)) {
      return 'tank';
    }
    // Strikers
    if (className.match(/rogue|ranger|swashbuckler|gunslinger|magus|investigator/)) {
      return 'striker';
    }
    // Support/Casters
    if (className.match(/wizard|sorcerer|bard|cleric|druid|witch|oracle|alchemist|summoner/)) {
      return 'support';
    }
  }

  // Fallback: use HP as indicator (high HP = tank, low HP = support)
  const maxHP = getActorMaxHP(actor);
  if (maxHP > 50) return 'tank';
  if (maxHP > 30) return 'striker';
  if (maxHP > 0) return 'support';

  return 'unknown';
}

/**
 * Get role priority for smart formation ordering
 * @param {string} role - The role
 * @returns {number} Priority (lower = front, higher = back)
 */
function getRolePriority(role) {
  const priorities = {
    'leader': 0,  // Leader always first
    'tank': 1,    // Tanks in front
    'striker': 2, // Strikers in middle
    'support': 3, // Support in back
    'unknown': 4  // Unknown in back
  };
  return priorities[role] || 999;
}

/**
 * Sort party members for smart formation ordering
 * @param {Array} memberData - Array of member data objects
 * @param {Array} actors - Array of corresponding Actor objects
 * @returns {Array} Sorted array of {member, actor, role} objects
 */
function sortMembersForFormation(memberData, actors) {
  // Create array with members, actors, and roles
  const membersWithRoles = memberData.map((member, index) => {
    const actor = actors[index];
    let role = getCharacterRole(actor);

    // Leader always gets priority
    if (member.isLeader) {
      role = 'leader';
    }

    return {
      member,
      actor,
      role,
      priority: getRolePriority(role),
      originalIndex: index
    };
  });

  // Sort by priority (lower = front), then by original index for stability
  membersWithRoles.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.originalIndex - b.originalIndex;
  });

  return membersWithRoles;
}

/**
 * Refresh health indicator on party token
 * @param {Token} partyToken - The party token
 */
function refreshHealthIndicator(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) return;

  let totalHP = 0;
  let totalMaxHP = 0;

  for (const member of memberData) {
    const actor = game.actors.get(member.actorId);
    if (!actor) continue;

    totalHP += getActorHP(actor);
    totalMaxHP += getActorMaxHP(actor);
  }

  // Remove existing health bar
  const existingBar = partyToken.children.find(c => c.name === 'partyHealthBar');
  if (existingBar) {
    partyToken.removeChild(existingBar);
  }

  if (totalMaxHP === 0) return;

  // Create health bar graphic
  const barWidth = partyToken.w;
  const barHeight = 8;
  const barY = partyToken.h + 5;

  const healthBar = new PIXI.Graphics();
  healthBar.name = 'partyHealthBar';

  // Background
  healthBar.beginFill(0x000000, 0.5);
  healthBar.drawRect(0, barY, barWidth, barHeight);
  healthBar.endFill();

  // Health fill
  const hpPercent = totalHP / totalMaxHP;
  const fillWidth = barWidth * hpPercent;
  const color = hpPercent > 0.5 ? 0x00ff00 : hpPercent > 0.25 ? 0xffaa00 : 0xff0000;

  healthBar.beginFill(color, 0.8);
  healthBar.drawRect(0, barY, fillWidth, barHeight);
  healthBar.endFill();

  partyToken.addChild(healthBar);
}

/**
 * Refresh status effects on party token
 * @param {Token} partyToken - The party token
 */
function refreshStatusEffects(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) return;

  // Collect all unique effects
  const effectMap = new Map();

  for (const member of memberData) {
    const actor = game.actors.get(member.actorId);
    if (!actor) continue;

    for (const effect of actor.effects) {
      if (effect.disabled) continue;

      if (!effectMap.has(effect.name)) {
        effectMap.set(effect.name, {
          name: effect.name,
          icon: effect.icon,
          count: 0
        });
      }

      effectMap.get(effect.name).count++;
    }
  }

  // Remove existing effect indicators
  const existingEffects = partyToken.children.filter(c => c.name === 'partyEffectIcon');
  existingEffects.forEach(e => partyToken.removeChild(e));

  // Add new effect indicators (max 5)
  const effects = Array.from(effectMap.values()).slice(0, 5);
  const iconSize = 20;
  const iconSpacing = 22;
  const startX = 5;
  const startY = 5;

  effects.forEach((effect, i) => {
    // Sanitize icon URL to prevent loading malicious resources
    const iconURL = sanitizeImageURL(effect.icon || 'icons/svg/aura.svg');
    try {
      const sprite = PIXI.Sprite.from(iconURL);
      sprite.name = 'partyEffectIcon';
      sprite.width = iconSize;
      sprite.height = iconSize;
      sprite.x = startX + (i * iconSpacing);
      sprite.y = startY;
      sprite.alpha = 0.9;

      partyToken.addChild(sprite);
    } catch (error) {
      console.warn(`Party Vision | Failed to load effect icon: ${iconURL}`, error);
    }
  });
}

// ==============================================
// PUBLIC API EXPORTS
// ==============================================

// Export for use by macros and other modules
window.PartyVision = {
  // Core functions
  showFormPartyDialog,
  formParty,
  showDeployDialog,
  deployParty,
  splitAndDeployMembers,

  // Lighting functions
  updatePartyLighting,
  updatePartyLightingFromActors,
  debouncedUpdatePartyLighting,
  aggregateLights,
  cycleLightSource,

  // Follow-the-leader
  toggleFollowLeaderMode,

  // Formations
  FORMATION_PRESETS,

  // Player-Friendly Features
  openAllMemberSheets,
  togglePartyCombat,
  addPartyToCombat,
  rollPartyInitiative,
  showMemberAccessPanel,
  showQuickSplitDialog,
  showPartyStatus,
  showPartyMembers,
  showPartyHelp,
  getHighestPassivePerception,
  refreshHealthIndicator,
  refreshStatusEffects,

  // Smart Formation Ordering
  getCharacterRole,
  getRolePriority,
  sortMembersForFormation,

  // Movement
  getDefaultMovementType,
  calculateMovementCapabilities,

  // Utility
  refreshAllPartyLighting: async function() {
    const partyTokens = canvas.tokens.placeables.filter(t => {
      const memberData = t.document.getFlag('party-vision', 'memberData');
      return memberData && memberData.length > 0;
    });

    if (partyTokens.length === 0) {
      ui.notifications.info("No party tokens found on scene");
      return;
    }

    console.log(`Party Vision | Manually refreshing ${partyTokens.length} party token(s)`);

    for (const partyToken of partyTokens) {
      await updatePartyLightingFromActors(partyToken);
    }

    ui.notifications.info(`Refreshed lighting for ${partyTokens.length} party token(s)`);
  }
};

console.log('Party Vision | Module fully loaded and exported to window.PartyVision');
