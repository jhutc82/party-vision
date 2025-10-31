// ==============================================
// PARTY VISION MODULE - MAIN SCRIPT
// Version 2.4.8 - Enhanced Party Management
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

// ==============================================
// INITIALIZATION
// ==============================================

Hooks.once('init', () => {
  console.log('Party Vision | Initializing Enhanced Module v2.4.8');
  
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

  console.log('Party Vision | Settings registered successfully');
  
  // --- CHECK DEPENDENCIES ---
  
  // Check for libWrapper
  if (typeof libWrapper !== 'function') {
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
          <div class="control-icon party-vision-deploy" title="Deploy Party">
            <i class="fas fa-chevron-circle-right"></i>
          </div>
        `);
        
        deployButton.on('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showDeployDialog(token);
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
        <img src="${actor.img}" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 12px; border: 2px solid #555;">
        <div style="flex: 1;">
          <div style="font-weight: bold; color: #ddd;">${actor.name}</div>
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
    return `<option value="${key}">${preset.name}</option>`;
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
      </style>
      <div class="form-party-dialog">
        <div class="section">
          <label for="party-name">
            <i class="fas fa-tag"></i> Party Name
          </label>
          <input type="text" id="party-name" name="partyName" value="${defaultName}" placeholder="Enter party name">
          <div class="info-text">This name will be saved and reused when you form a party with these same members.</div>
        </div>
        
        <div class="section">
          <label>
            <i class="fas fa-image"></i> Party Token Image
          </label>
          <div class="image-picker-container">
            <div class="image-preview">
              <img id="party-image-preview" src="${defaultImage}" alt="Party Token">
            </div>
            <div class="image-input-group">
              <input type="text" id="party-image" name="partyImage" value="${defaultImage}" placeholder="Token image path">
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
        
        <div class="section">
          <label for="formation-preset">
            <i class="fas fa-chess-board"></i> Formation Preset
          </label>
          <select id="formation-preset" name="formation">
            ${formationOptions}
          </select>
          <div class="info-text">Choose how the party will be arranged when deployed.</div>
        </div>
      </div>
    `,
    buttons: {
      form: {
        label: '<i class="fas fa-users"></i> Form Party',
        callback: async (html) => {
          const leaderIndex = parseInt(html.find('input[name="leader"]:checked').val());
          const formationKey = html.find('#formation-preset').val();
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
      // Select last used formation
      html.find('#formation-preset').val(lastPreset);
      
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
  
  // Apply formation preset if not 'current'
  let positionedTokens = tokens;
  if (formationKey !== 'current') {
    const preset = FORMATION_PRESETS[formationKey];
    if (preset && preset.positions) {
      // Apply preset positions
      positionedTokens = await applyFormationPreset(tokens, leaderIndex, preset);
    }
  }
  
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
    
    // Store original lighting
    const originalLight = {
      bright: token.document.light.bright || 0,
      dim: token.document.light.dim || 0,
      angle: token.document.light.angle || 360,
      color: token.document.light.color || null,
      alpha: token.document.light.alpha || 0.5,
      animation: token.document.light.animation || {}
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
    sight: {
      enabled: true,
      range: 0,
      angle: 360,
      visionMode: "basic"
    },
    detectionModes: [],
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
}

/**
 * Apply a formation preset to tokens
 * @param {Array<Token>} tokens - Tokens to position
 * @param {number} leaderIndex - Index of the leader
 * @param {Object} preset - Formation preset data
 * @returns {Array<Token>} Tokens (unchanged, as this is preview only)
 */
async function applyFormationPreset(tokens, leaderIndex, preset) {
  // For now, return tokens as-is since formation is applied during deployment
  // In future versions, this could move tokens before forming
  return tokens;
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
 * Calculate movement capabilities for party (slowest member)
 * @param {Array<Token>} tokens - Party member tokens
 * @returns {Object} Movement data
 */
function calculateMovementCapabilities(tokens) {
  let minSpeed = Infinity;
  const commonTypes = new Set();
  let firstMember = true;
  
  tokens.forEach(token => {
    const actor = token.actor;
    if (!actor) return;
    
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
      Object.keys(actor.system.movement.speeds).forEach(type => {
        const speedData = actor.system.movement.speeds[type];
        if (speedData && (speedData.total > 0 || speedData.value > 0)) {
          types.push(type);
        }
      });
    }
    // Fallback to older path
    else if (actor.system.attributes?.movement) {
      Object.keys(actor.system.attributes.movement).forEach(type => {
        if (actor.system.attributes.movement[type] > 0) {
          types.push(type);
        }
      });
    }
    
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
  
  return {
    speed: minSpeed === Infinity ? 30 : minSpeed,
    types: Array.from(commonTypes)
  };
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
      <div class="member-checkbox" style="display: flex; align-items: center; padding: 8px; margin: 4px 0; background: rgba(0,0,0,0.2); border-radius: 4px;">
        <input type="checkbox" id="member-${index}" value="${index}" checked style="margin-right: 12px; transform: scale(1.3);">
        <img src="${member.img}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 10px; border: 2px solid ${member.isLeader ? '#00ff88' : '#555'};">
        <label for="member-${index}" style="flex: 1; color: #ddd; cursor: pointer;">
          ${member.name}${member.isLeader ? ' <i class="fas fa-star" style="color: #00ff88;"></i>' : ''}
        </label>
      </div>
    `;
  }).join('');
  
  // Formation presets dropdown
  let formationOptions = Object.keys(FORMATION_PRESETS).map(key => {
    const preset = FORMATION_PRESETS[key];
    return `<option value="${key}">${preset.name} - ${preset.description}</option>`;
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
          padding: 15px;
          font-family: "Signika", sans-serif;
        }
        .deploy-party-dialog h3 {
          margin: 15px 0 12px 0;
          color: #ddd;
          font-size: 1.1em;
          border-bottom: 2px solid #ff8800;
          padding-bottom: 8px;
        }
        .deploy-party-dialog h3:first-child {
          margin-top: 0;
        }
        .deploy-party-dialog .section {
          margin: 15px 0;
        }
        .deploy-party-dialog label {
          display: block;
          color: #ddd;
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .deploy-party-dialog select {
          width: 100%;
          padding: 8px;
          background: rgba(0,0,0,0.4);
          border: 1px solid #555;
          color: #ddd;
          border-radius: 4px;
          font-size: 14px;
          min-height: 36px;
        }
        .deploy-party-dialog select option {
          background: #fff;
          color: #000;
          padding: 8px;
        }
        .deploy-party-dialog .info-text {
          font-size: 0.85em;
          color: #aaa;
          margin: 8px 0;
          font-style: italic;
        }
        .deploy-party-dialog .direction-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          max-width: 240px;
          margin: 15px auto;
        }
        .deploy-party-dialog .direction-btn {
          aspect-ratio: 1;
          border: 2px solid #555;
          background: rgba(0,0,0,0.4);
          border-radius: 8px;
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
          font-size: 28px;
          color: #ddd;
        }
        .deploy-party-dialog .member-list {
          max-height: 300px;
          overflow-y: auto;
        }
        .deploy-party-dialog .quick-select {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        .deploy-party-dialog .quick-select button {
          padding: 6px 12px;
          background: rgba(0,0,0,0.4);
          border: 1px solid #555;
          color: #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
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
 */
async function deployParty(partyToken, formationKey, direction) {
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
  
  for (let i = 0; i < memberData.length; i++) {
    const member = memberData[i];
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
    const ray = new Ray({ x: centerX, y: centerY }, corner);
    
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
 */
async function splitAndDeployMembers(partyToken, memberIndices, formationKey = 'custom', direction = 'north') {
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
}

// ==============================================
// LIGHTING SYSTEM
// ==============================================

/**
 * Update party token lighting from member actors
 * @param {Token} partyToken - The party token
 */
async function updatePartyLightingFromActors(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) return;
  
  // Clear any pending update for this token
  if (pendingLightingUpdates.has(partyToken.id)) {
    clearTimeout(pendingLightingUpdates.get(partyToken.id));
  }
  
  // Schedule the update with debouncing
  const timeoutId = setTimeout(async () => {
    console.log(`Party Vision | Updating lighting for party token from ${memberData.length} actors`);
    
    // Collect all light sources from members
    const lightSources = [];
    
    for (const member of memberData) {
      const actor = game.actors.get(member.actorId);
      if (!actor) continue;
      
      // Try multiple detection strategies for lighting
      let light = null;
      
      // Strategy 1: Check actor prototype token
      if (actor.prototypeToken?.light) {
        light = foundry.utils.deepClone(actor.prototypeToken.light);
      }
      
      // Strategy 2: Check for active effects that modify light
      if (actor.effects) {
        for (const effect of actor.effects) {
          if (!effect.disabled) {
            for (const change of effect.changes) {
              if (change.key.includes('light') || change.key.includes('ATL')) {
                // Found a lighting effect
                light = light || {};
                // Parse the change value
                if (change.key.includes('bright')) light.bright = parseFloat(change.value) || 0;
                if (change.key.includes('dim')) light.dim = parseFloat(change.value) || 0;
                if (change.key.includes('color')) light.color = change.value;
              }
            }
          }
        }
      }
      
      // Strategy 3: Check stored original light from member data
      if (!light || (light.bright === 0 && light.dim === 0)) {
        if (member.originalLight && (member.originalLight.bright > 0 || member.originalLight.dim > 0)) {
          light = foundry.utils.deepClone(member.originalLight);
        }
      }
      
      if (light && (light.bright > 0 || light.dim > 0)) {
        lightSources.push({
          name: member.name,
          light: light
        });
      }
    }
    
    console.log(`Party Vision | Found ${lightSources.length} active light sources`);
    
    // Determine the best lighting configuration
    let finalLight = {
      bright: 0,
      dim: 0,
      angle: 360,
      color: null,
      alpha: 0.5,
      animation: {}
    };
    
    if (lightSources.length > 0) {
      // Use the brightest light source
      const brightestSource = lightSources.reduce((prev, current) => {
        const prevTotal = prev.light.bright + prev.light.dim;
        const currentTotal = current.light.bright + current.light.dim;
        return currentTotal > prevTotal ? current : prev;
      });
      
      finalLight = brightestSource.light;
      console.log(`Party Vision | Using light from ${brightestSource.name}: bright=${finalLight.bright}, dim=${finalLight.dim}`);
    }
    
    // Update the party token's light
    await partyToken.document.update({
      light: finalLight
    });
    
    // Clear the pending update
    pendingLightingUpdates.delete(partyToken.id);
  }, LIGHTING_UPDATE_DEBOUNCE_MS);
  
  pendingLightingUpdates.set(partyToken.id, timeoutId);
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
  
  // Collect all members with light sources
  const lightsources = [];
  
  for (const member of memberData) {
    const actor = game.actors.get(member.actorId);
    if (!actor) continue;
    
    let light = null;
    
    if (actor.prototypeToken?.light) {
      light = actor.prototypeToken.light;
    }
    
    if (light && (light.bright > 0 || light.dim > 0)) {
      lightsources.push({
        name: member.name,
        light: foundry.utils.deepClone(light)
      });
    }
  }
  
  if (lightsources.length === 0) {
    ui.notifications.info("No party members have light sources.");
    return;
  }
  
  // Get current light source index
  const currentLight = partyToken.document.light;
  let currentIndex = -1;
  
  for (let i = 0; i < lightsources.length; i++) {
    const source = lightsources[i];
    if (source.light.bright === currentLight.bright && source.light.dim === currentLight.dim) {
      currentIndex = i;
      break;
    }
  }
  
  // Cycle to next light source
  const nextIndex = (currentIndex + 1) % lightsources.length;
  const nextSource = lightsources[nextIndex];
  
  await partyToken.document.update({
    light: nextSource.light
  });
  
  ui.notifications.info(`Party light source: ${nextSource.name}`);
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
  if (!followLeaderMode || !leaderToken) return;
  if (tokenDoc.id !== leaderToken.id) return;
  if (!change.x && !change.y) return;
  
  // Leader moved, update followers
  const gridSize = canvas.grid.size;
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
});

// ==============================================
// COMBAT INTEGRATION
// ==============================================

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
  
  // CRITICAL FIX: Wait for combat to fully initialize
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
    
    // Auto-show form dialog after a delay
    setTimeout(() => {
      if (window.PartyVision && window.PartyVision.showFormPartyDialog) {
        window.PartyVision.showFormPartyDialog();
      }
    }, 1000);
  }
});

// ==============================================
// ACTOR HOOKS - LIGHTING UPDATES
// ==============================================

// Update party lighting when actor light changes
Hooks.on('updateActor', (actor, change, options, userId) => {
  // Check if light was changed
  if (!change.prototypeToken?.light) return;
  
  // Find party tokens containing this actor
  canvas.tokens.placeables.forEach(token => {
    const memberData = token.document.getFlag('party-vision', 'memberData');
    if (!memberData) return;
    
    const hasMember = memberData.some(m => m.actorId === actor.id);
    if (hasMember) {
      updatePartyLighting(token);
    }
  });
});

// Update party lighting when active effect changes
Hooks.on('createActiveEffect', (effect, options, userId) => {
  const actor = effect.parent;
  if (!actor) return;
  
  // Check if effect modifies light
  const modifiesLight = effect.changes.some(c => 
    c.key.includes('light') || c.key.includes('ATL')
  );
  
  if (!modifiesLight) return;
  
  // Find party tokens containing this actor
  canvas.tokens.placeables.forEach(token => {
    const memberData = token.document.getFlag('party-vision', 'memberData');
    if (!memberData) return;
    
    const hasMember = memberData.some(m => m.actorId === actor.id);
    if (hasMember) {
      updatePartyLighting(token);
    }
  });
});

Hooks.on('deleteActiveEffect', (effect, options, userId) => {
  const actor = effect.parent;
  if (!actor) return;
  
  // Check if effect modified light
  const modifiedLight = effect.changes.some(c => 
    c.key.includes('light') || c.key.includes('ATL')
  );
  
  if (!modifiedLight) return;
  
  // Find party tokens containing this actor
  canvas.tokens.placeables.forEach(token => {
    const memberData = token.document.getFlag('party-vision', 'memberData');
    if (!memberData) return;
    
    const hasMember = memberData.some(m => m.actorId === actor.id);
    if (hasMember) {
      updatePartyLighting(token);
    }
  });
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
// PUBLIC API EXPORTS
// ==============================================

// Export for use by macros and other modules
window.PartyVision = {
  // Core functions
  showFormPartyDialog,
  formParty,
  showDeployDialog,
  deployParty,
  showSplitPartyDialog,
  splitAndDeployMembers,
  
  // Lighting functions
  updatePartyLighting,
  updatePartyLightingFromActors,
  cycleLightSource,
  
  // Follow-the-leader
  toggleFollowLeaderMode,
  
  // Formations
  FORMATION_PRESETS,
  
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
