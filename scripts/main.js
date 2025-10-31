// ==============================================
// PARTY VISION MODULE - MAIN SCRIPT
// Version 2.4.5 - Comprehensive Fix Release
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
  console.log('Party Vision | Initializing Enhanced Module v2.4.5');
  
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
      formButton.on('click', async () => {
        // Call function directly (no macro dependency)
        if (window.PartyVision && window.PartyVision.showFormPartyDialog) {
          window.PartyVision.showFormPartyDialog();
        } else {
          ui.notifications.error("Party Vision: Form Party function not available. Module may not be fully loaded.");
          console.error("Party Vision: showFormPartyDialog not found on window.PartyVision");
        }
        app.clear();
      });
      col.append(formButton);
    }
    
    // Show DEPLOY PARTY button (single party token selected)
    // FIX: Check controlled token directly instead of data object
    else if (controlled.length === 1 && 
             controlled[0]?.document.getFlag('party-vision', 'memberData')) {
      const deployButton = $(`
        <div class="control-icon party-vision-deploy" title="Deploy Party (Right-click to cycle light source)">
          <i class="fas fa-users-slash"></i>
        </div>
      `);
      deployButton.on('click', async () => {
        // Call function directly (no macro dependency)
        const partyToken = controlled[0];
        if (window.PartyVision && window.PartyVision.showDeployDialog) {
          await window.PartyVision.showDeployDialog(partyToken);
        } else {
          ui.notifications.error("Party Vision: Deploy Party function not available. Module may not be fully loaded.");
          console.error("Party Vision: showDeployDialog not found on window.PartyVision");
        }
        app.clear();
      });
      
      // RIGHT-CLICK to cycle light sources
      deployButton.on('contextmenu', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await cycleLightSource(controlled[0]);
        app.clear();
      });
      
      col.append(deployButton);
    }
    
    // === MOVEMENT TYPE FILTERING FOR PARTY TOKENS ===
    // Filter movement selector options to only show common movement types
    const token = controlled[0];
    if (token && controlled.length === 1) {
      const memberData = token.document.getFlag('party-vision', 'memberData');
      const movementData = token.document.getFlag('party-vision', 'movement');
      
      if (memberData && movementData && movementData.types) {
        // Find the movement selector in the HUD
        setTimeout(() => {
          const $movementSelect = $html.find('select[name="movement"]');
          if ($movementSelect.length > 0) {
            const commonTypes = movementData.types || [];
            console.log('Party Vision | Filtering movement types to:', commonTypes);
            
            // Get all options
            const $options = $movementSelect.find('option');
            $options.each(function() {
              const $option = $(this);
              const optionValue = $option.val().toLowerCase();
              const optionText = $option.text().toLowerCase();
              
              // Check if this movement type is in common types
              const isCommon = commonTypes.some(commonType => 
                optionValue.includes(commonType.toLowerCase()) ||
                optionText.includes(commonType.toLowerCase())
              );
              
              // Hide options that aren't common to all party members
              if (!isCommon && optionValue !== '') {
                $option.hide();
              }
            });
          }
        }, 50);
      }
    }
  });
});

// ==============================================
// CANVAS READY HOOK - VISUAL INDICATORS
// ==============================================

Hooks.on('canvasReady', () => {
  console.log('Party Vision | Canvas ready, setting up visual indicators');
  
  // Draw visual indicators for all party tokens
  Hooks.on('refreshToken', (token) => {
    const memberData = token.document.getFlag('party-vision', 'memberData');
    if (!memberData || memberData.length === 0) return;
    
    drawPartyIndicators(token, memberData);
  });
  
  // Initial draw for existing party tokens
  if (canvas.tokens) {
    canvas.tokens.placeables.forEach(token => {
      const memberData = token.document.getFlag('party-vision', 'memberData');
      if (memberData && memberData.length > 0) {
        drawPartyIndicators(token, memberData);
      }
    });
  }
});

// ==============================================
// VISUAL INDICATORS
// ==============================================

/**
 * Draw visual indicators for a party token (portraits and range circle)
 * @param {Token} token - The party token
 * @param {Array} memberData - Array of member data
 */
function drawPartyIndicators(token, memberData) {
  if (!token || !memberData) return;
  
  // Clear existing indicators
  if (token.partyVisionIndicators) {
    token.partyVisionIndicators.forEach(indicator => indicator.destroy());
  }
  token.partyVisionIndicators = [];
  
  const showPortraits = game.settings.get('party-vision', 'showMemberPortraits');
  const showRange = game.settings.get('party-vision', 'showRangeIndicator');
  
  // Draw member portraits
  if (showPortraits && memberData.length > 0) {
    const portraits = drawMemberPortraits(token, memberData);
    token.partyVisionIndicators.push(...portraits);
  }
  
  // Draw range indicator
  if (showRange) {
    const rangeIndicator = drawRangeIndicator(token, memberData);
    if (rangeIndicator) {
      token.partyVisionIndicators.push(rangeIndicator);
    }
  }
}

/**
 * Draw member portrait icons around the party token
 * @param {Token} token - The party token
 * @param {Array} memberData - Array of member data
 * @returns {Array} Array of PIXI graphics objects
 */
function drawMemberPortraits(token, memberData) {
  const portraits = [];
  const numMembers = Math.min(memberData.length, MAX_PORTRAITS);
  
  for (let i = 0; i < numMembers; i++) {
    const member = memberData[i];
    const actor = game.actors.get(member.actorId);
    if (!actor) continue;
    
    const portrait = new PIXI.Sprite(PIXI.Texture.from(actor.img));
    portrait.width = PORTRAIT_SIZE;
    portrait.height = PORTRAIT_SIZE;
    portrait.anchor.set(0.5);
    
    // Position portraits in a circle around the token
    const angle = (i / numMembers) * Math.PI * 2;
    const radius = token.w * 0.6;
    portrait.position.set(
      token.center.x + Math.cos(angle) * radius,
      token.center.y + Math.sin(angle) * radius
    );
    
    // Add border for leader
    if (member.isLeader) {
      const border = new PIXI.Graphics();
      border.lineStyle(3, 0x00ff88, 1);
      border.drawCircle(0, 0, PORTRAIT_SIZE / 2 + 2);
      border.position.set(portrait.position.x, portrait.position.y);
      canvas.tokens.addChild(border);
      portraits.push(border);
    }
    
    canvas.tokens.addChild(portrait);
    portraits.push(portrait);
  }
  
  return portraits;
}

/**
 * Draw range indicator circle showing party spread
 * @param {Token} token - The party token
 * @param {Array} memberData - Array of member data
 * @returns {PIXI.Graphics} Range indicator graphic
 */
function drawRangeIndicator(token, memberData) {
  // Calculate max distance from center
  let maxDistance = 0;
  memberData.forEach(member => {
    const distance = Math.sqrt(member.dx * member.dx + member.dy * member.dy);
    maxDistance = Math.max(maxDistance, distance);
  });
  
  if (maxDistance === 0) return null;
  
  const gridSize = canvas.grid.size;
  const radiusPixels = maxDistance * gridSize * 1.2; // 20% buffer
  
  const circle = new PIXI.Graphics();
  circle.lineStyle(2, 0x00ff88, 0.5);
  circle.drawCircle(token.center.x, token.center.y, radiusPixels);
  
  canvas.tokens.addChild(circle);
  return circle;
}

// ==============================================
// FORM PARTY SYSTEM
// ==============================================

/**
 * Show the Form Party dialog for selected tokens
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
  
  // Build member list HTML
  const memberListHTML = validTokens.map((token, index) => {
    const actor = token.actor;
    return `
      <div class="party-member" style="display: flex; align-items: center; padding: 8px; margin: 4px 0; background: rgba(0,0,0,0.2); border-radius: 4px;">
        <img src="${actor.img}" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 12px; border: 2px solid #555;">
        <div style="flex: 1;">
          <div style="font-weight: bold; color: #ddd;">${actor.name}</div>
          <div style="font-size: 0.85em; color: #aaa;">
            ${actor.system.attributes?.movement?.walk || actor.system.attributes?.speed?.value || 'Unknown'} movement
          </div>
        </div>
        <input type="radio" name="leader" value="${index}" ${index === 0 ? 'checked' : ''} 
               style="margin-left: 12px; transform: scale(1.2);" title="Set as leader">
      </div>
    `;
  }).join('');
  
  // Formation presets dropdown
  const formationOptions = Object.keys(FORMATION_PRESETS).map(key => {
    const preset = FORMATION_PRESETS[key];
    return `<option value="${key}">${preset.name}</option>`;
  }).join('');
  
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
          color: #ccc;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .form-party-dialog select {
          width: 100%;
          padding: 8px;
          background: rgba(0,0,0,0.4);
          border: 1px solid #555;
          color: #ddd;
          border-radius: 4px;
        }
        .form-party-dialog .info-text {
          font-size: 0.85em;
          color: #aaa;
          margin: 8px 0;
          font-style: italic;
        }
      </style>
      <div class="form-party-dialog">
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
          
          // Save last used formation
          await game.settings.set('party-vision', 'lastFormationPreset', formationKey);
          
          // Form the party
          await formParty(validTokens, leaderIndex, formationKey);
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
    }
  }, {
    width: 500,
    classes: ["dialog", "party-vision-dialog"]
  }).render(true);
}

/**
 * Form a party from selected tokens
 * @param {Array<Token>} tokens - Tokens to form into party
 * @param {number} leaderIndex - Index of the leader token
 * @param {string} formationKey - Formation preset key
 */
async function formParty(tokens, leaderIndex, formationKey) {
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
  
  console.log(`Party Vision | Forming party with ${tokens.length} members, leader: ${leaderActor.name}`);
  
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
    name: `Party (${leaderActor.name})`,
    img: leaderActor.img,
    x: leaderToken.x,
    y: leaderToken.y,
    width: maxWidth,
    height: maxHeight,
    displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
    displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
    flags: {
      'party-vision': {
        memberData: memberData,
        naturalFacing: naturalFacing,
        movement: movementData,
        formedAt: Date.now()
      }
    }
  };
  
  // Create the party token
  const created = await canvas.scene.createEmbeddedDocuments("Token", [partyTokenData]);
  const partyToken = canvas.tokens.get(created[0].id);
  
  // Update party lighting from members
  await updatePartyLightingFromActors(partyToken);
  
  // Delete original tokens
  const tokenIds = tokens.map(t => t.id);
  await canvas.scene.deleteEmbeddedDocuments("Token", tokenIds);
  
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
    if (actor.system.attributes?.movement?.walk !== undefined) {
      speed = actor.system.attributes.movement.walk;
    } else if (actor.system.attributes?.speed?.value !== undefined) {
      speed = actor.system.attributes.speed.value;
    } else if (actor.system.movement?.walk !== undefined) {
      speed = actor.system.movement.walk;
    }
    
    minSpeed = Math.min(minSpeed, speed);
    
    // Track movement types
    const types = [];
    if (actor.system.attributes?.movement) {
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
 * Show the Deploy Party dialog
 * @param {Token} partyToken - The party token to deploy
 */
async function showDeployDialog(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData) {
    ui.notifications.warn("This is not a valid Party Token.");
    return;
  }

  // Find the leader
  const leaderData = memberData.find(m => m.isLeader) || memberData[0];
  
  const lastDirection = game.settings.get('party-vision', 'lastDeployDirection');

  // Show deployment dialog with direction options
  new Dialog({
    title: `Deploy Party (Leader: ${leaderData.name})`,
    content: `
      <style>
        .deploy-dialog {
          padding: 20px;
          font-family: "Signika", sans-serif;
        }
        .deploy-dialog h3 {
          margin: 0 0 15px 0;
          color: #222;
          font-size: 1.1em;
          border-bottom: 2px solid #00ff88;
          padding-bottom: 10px;
        }
        .deploy-dialog .info-text {
          font-size: 0.9em;
          color: #444;
          margin: 10px 0 15px 0;
          line-height: 1.4;
        }
        .direction-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 20px auto;
          max-width: 240px;
        }
        .direction-btn {
          padding: 20px;
          border: 2px solid #555;
          border-radius: 8px;
          cursor: pointer;
          text-align: center;
          background: rgba(0, 0, 0, 0.4);
          transition: all 0.2s ease;
        }
        .direction-btn:not(.empty):hover {
          border-color: #0088ff;
          background: rgba(0, 136, 255, 0.2);
          transform: scale(1.05);
        }
        .direction-btn.selected {
          border-color: #00ff88 !important;
          background: rgba(0, 255, 136, 0.2) !important;
          box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
        }
        .direction-btn i {
          font-size: 28px;
          color: #333;
        }
        .direction-btn.empty {
          visibility: hidden;
        }
      </style>
      <div class="deploy-dialog">
        <h3>Leader: ${leaderData.name}</h3>
        <p class="info-text">
          Choose the direction your party will face when deployed. The formation will maintain its shape while orienting in the selected direction.
        </p>
        <div class="direction-grid">
          <div class="direction-btn empty"></div>
          <div class="direction-btn" data-direction="north" title="Deploy Facing North">
            <i class="fas fa-arrow-up"></i>
          </div>
          <div class="direction-btn empty"></div>
          <div class="direction-btn" data-direction="west" title="Deploy Facing West">
            <i class="fas fa-arrow-left"></i>
          </div>
          <div class="direction-btn empty"></div>
          <div class="direction-btn" data-direction="east" title="Deploy Facing East">
            <i class="fas fa-arrow-right"></i>
          </div>
          <div class="direction-btn empty"></div>
          <div class="direction-btn" data-direction="south" title="Deploy Facing South">
            <i class="fas fa-arrow-down"></i>
          </div>
          <div class="direction-btn empty"></div>
        </div>
      </div>
    `,
    buttons: {
      split: {
        label: '<i class="fas fa-users-slash"></i> Split Party',
        callback: async () => {
          await showSplitPartyDialog(partyToken);
        }
      },
      deploy: {
        label: '<i class="fas fa-play"></i> Deploy All',
        callback: async (html) => {
          const selectedDirection = html.find('.direction-btn.selected').data('direction') || 'north';
          
          // Save last used direction
          await game.settings.set('party-vision', 'lastDeployDirection', selectedDirection);
          
          // Deploy with direction string instead of radians
          await deployParty(partyToken, selectedDirection, false);
        }
      },
      cancel: { 
        label: '<i class="fas fa-times"></i> Cancel',
        callback: () => {}
      }
    },
    default: "deploy",
    render: (html) => {
      html.find('.direction-btn:not(.empty)').on('click', function() {
        html.find('.direction-btn').removeClass('selected');
        $(this).addClass('selected');
      });
      
      // Select last used direction by default
      html.find(`.direction-btn[data-direction="${lastDirection}"]`).addClass('selected');
    }
  }, {
    width: 400,
    classes: ["dialog", "party-vision-dialog"]
  }).render(true);
}

/**
 * Deploy party tokens with FIXED rotation logic that rotates around the leader
 * @param {Token} partyToken - The party token to deploy
 * @param {string} targetDirection - Direction to face ('north', 'east', 'south', 'west')
 * @param {boolean} fromCombat - Whether deployment is from combat
 */
async function deployParty(partyToken, targetDirection, fromCombat = false) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData) {
    ui.notifications.warn("This is not a valid Party Token.");
    return;
  }

  const gridSize = canvas.grid.size;
  const assignedGridSpots = new Set();
  
  // Get the formation's natural facing (how it was originally formed)
  const naturalFacing = partyToken.document.getFlag('party-vision', 'naturalFacing') || 'north';
  
  console.log(`Party Vision | Deploying formation: natural facing=${naturalFacing}, target=${targetDirection}`);
  
  // Calculate how many 90-degree rotation steps we need
  const rotationSteps = calculateRotationSteps(naturalFacing, targetDirection);
  console.log(`Party Vision | Rotation steps (90° CW each): ${rotationSteps}`);
  
  // Find the leader
  const leaderData = memberData.find(m => m.isLeader) || memberData[0];
  
  // Party token CENTER is where we'll place the leader
  // This ensures the formation rotates AROUND the leader
  const partyTokenWidth = partyToken.document.width;
  const partyTokenHeight = partyToken.document.height;
  const partyCenterX = partyToken.x + (partyTokenWidth * gridSize / 2);
  const partyCenterY = partyToken.y + (partyTokenHeight * gridSize / 2);
  
  const newTokensData = [];
  const finalPositions = [];
  const shouldAnimate = game.settings.get('party-vision', 'animateDeployment');
  
  // Sort members by distance from center (place closer ones first for better overlap handling)
  const sortedMembers = [...memberData].sort((a, b) => 
    (Math.abs(a.dx) + Math.abs(a.dy)) - (Math.abs(b.dx) + Math.abs(b.dy))
  );
  
  for (const member of sortedMembers) {
    // Get actor
    let actor;
    if (member.actorUuid) {
      try {
        actor = await fromUuid(member.actorUuid);
      } catch (e) {
        console.warn(`Party Vision | Could not resolve actor UUID ${member.actorUuid}`, e);
      }
    }
    
    if (!actor) {
      actor = game.actors.get(member.actorId);
    }
    
    if (!actor) {
      console.warn(`Party Vision | Actor not found for member ${member.name || member.actorId}`);
      continue;
    }
    
    // Get token data
    const protoToken = actor.prototypeToken;
    const tokenData = protoToken.toObject();
    
    // CRITICAL FIX: Apply rotation to the member's offset FROM the leader
    // This rotates the formation AROUND the leader as the center point
    const rotatedOffset = rotateOffset(member.dx, member.dy, rotationSteps);
    
    console.log(`${member.name}: original offset (${member.dx.toFixed(1)}, ${member.dy.toFixed(1)}) → rotated (${rotatedOffset.dx.toFixed(1)}, ${rotatedOffset.dy.toFixed(1)})`);
    
    // Calculate member's center position in world coordinates
    // Start from party center (where leader will be) and add rotated offset
    const memberCenterX = partyCenterX + (rotatedOffset.dx * gridSize);
    const memberCenterY = partyCenterY + (rotatedOffset.dy * gridSize);
    
    // Convert from center to top-left corner for token placement
    const tokenWidthGrids = tokenData.width;
    const tokenHeightGrids = tokenData.height;
    const idealGridX = Math.round((memberCenterX / gridSize) - (tokenWidthGrids / 2));
    const idealGridY = Math.round((memberCenterY / gridSize) - (tokenHeightGrids / 2));
    
    // Find valid spot (handles wall collisions and overlaps)
    const validSpot = findValidSpot(idealGridX, idealGridY, tokenData, assignedGridSpots);
    assignedGridSpots.add(`${validSpot.x},${validSpot.y}`);
    
    const finalX = validSpot.x * gridSize;
    const finalY = validSpot.y * gridSize;
    
    // Create token data
    const newToken = {
      ...tokenData,
      x: shouldAnimate ? partyToken.x : finalX,
      y: shouldAnimate ? partyToken.y : finalY,
      actorId: actor.id,
      actorLink: protoToken.actorLink,
      name: protoToken.name || actor.name,
      img: protoToken.texture?.src || actor.img
    };
    
    // Restore original token lighting if stored
    if (member.originalLight && (member.originalLight.bright > 0 || member.originalLight.dim > 0)) {
      console.log(`Party Vision | Restoring lighting for ${member.name}: bright=${member.originalLight.bright}, dim=${member.originalLight.dim}`);
      newToken.light = member.originalLight;
    }
    
    // Remove synthetic data that can break actor linking
    delete newToken.actorData;
    delete newToken.delta;
    
    newTokensData.push(newToken);
    
    if (shouldAnimate) {
      finalPositions.push({ x: finalX, y: finalY });
    }
  }
  
  // Create all tokens
  const createdTokens = await canvas.scene.createEmbeddedDocuments("Token", newTokensData);
  
  // Animate if enabled
  if (shouldAnimate) {
    const animationSpeed = game.settings.get('party-vision', 'deploymentAnimationSpeed');
    const animations = [];
    
    for (let i = 0; i < createdTokens.length; i++) {
      const tokenDoc = createdTokens[i];
      const token = canvas.tokens.get(tokenDoc.id);
      const finalPos = finalPositions[i];
      
      if (token && finalPos) {
        animations.push(
          token.document.update({ x: finalPos.x, y: finalPos.y }, { 
            animate: true, 
            animation: { duration: animationSpeed } 
          })
        );
      }
    }
    
    await Promise.all(animations);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Delete party token
  await canvas.scene.deleteEmbeddedDocuments("Token", [partyToken.id]);
  
  ui.notifications.info(`Party deployed: ${newTokensData.length} members facing ${targetDirection}!`);
}

/**
 * CRITICAL FIX: Rotate an offset by a number of 90-degree steps
 * This is the correct way to rotate formations around the leader
 * @param {number} dx - X offset in grid units
 * @param {number} dy - Y offset in grid units  
 * @param {number} steps - Number of 90-degree clockwise rotations (0-3)
 * @returns {{dx: number, dy: number}} Rotated offset
 */
function rotateOffset(dx, dy, steps) {
  let newDx = dx;
  let newDy = dy;
  
  // Each step is a 90-degree clockwise rotation: (x, y) → (-y, x)
  for (let i = 0; i < steps; i++) {
    const temp = newDx;
    newDx = -newDy;
    newDy = temp;
  }
  
  return { dx: newDx, dy: newDy };
}

/**
 * Calculate number of 90-degree clockwise rotation steps needed
 * @param {string} fromDirection - Starting direction ('north', 'east', 'south', 'west')
 * @param {string} toDirection - Target direction
 * @returns {number} Number of 90-degree clockwise steps (0-3)
 */
function calculateRotationSteps(fromDirection, toDirection) {
  const directions = ['north', 'east', 'south', 'west'];
  const fromIndex = directions.indexOf(fromDirection);
  const toIndex = directions.indexOf(toDirection);
  
  if (fromIndex === -1 || toIndex === -1) {
    console.warn(`Party Vision | Unknown direction: from=${fromDirection}, to=${toDirection}`);
    return 0;
  }
  
  // Calculate how many 90° clockwise rotations to get from 'from' to 'to'
  return (toIndex - fromIndex + 4) % 4;
}

/**
 * Finds a valid unoccupied spot for token placement using spiral search
 * @param {number} idealX - Ideal grid X coordinate
 * @param {number} idealY - Ideal grid Y coordinate
 * @param {Object} tokenData - Token data object
 * @param {Set} assignedSpots - Set of already assigned grid positions
 * @returns {{x: number, y: number}} Valid grid coordinates
 */
function findValidSpot(idealX, idealY, tokenData, assignedSpots) {
  if (isSpotValid(idealX, idealY, tokenData, assignedSpots)) {
    return { x: idealX, y: idealY };
  }
  
  // Spiral search
  for (let r = 1; r < SPIRAL_SEARCH_MAX_RADIUS; r++) {
    for (let x = idealX - r; x <= idealX + r; x++) {
      for (let y = idealY - r; y <= idealY + r; y++) {
        if (Math.abs(x - idealX) !== r && Math.abs(y - idealY) !== r) continue;
        if (isSpotValid(x, y, tokenData, assignedSpots)) {
          return { x, y };
        }
      }
    }
  }
  
  // Fallback to ideal position if no valid spot found
  console.warn('Party Vision | Could not find valid spot, using ideal position');
  return { x: idealX, y: idealY };
}

/**
 * Check if a grid position is valid for token placement
 * @param {number} gridX - Grid X coordinate
 * @param {number} gridY - Grid Y coordinate
 * @param {Object} tokenData - Token data
 * @param {Set} assignedSpots - Already assigned positions
 * @returns {boolean} True if valid
 */
function isSpotValid(gridX, gridY, tokenData, assignedSpots) {
  const gridSize = canvas.grid.size;
  const tokenWidth = tokenData.width || 1;
  const tokenHeight = tokenData.height || 1;
  
  // Check if already assigned
  if (assignedSpots.has(`${gridX},${gridY}`)) {
    return false;
  }
  
  // Check walls (use center point of token)
  const centerX = (gridX + tokenWidth / 2) * gridSize;
  const centerY = (gridY + tokenHeight / 2) * gridSize;
  
  if (hasWallCollision(centerX, centerY, tokenWidth, tokenHeight)) {
    return false;
  }
  
  // Check overlap with existing tokens
  const finalX = gridX * gridSize;
  const finalY = gridY * gridSize;
  
  const tokenRect = {
    x: finalX,
    y: finalY,
    width: tokenWidth * gridSize,
    height: tokenHeight * gridSize
  };
  
  for (const token of canvas.tokens.placeables) {
    const otherRect = {
      x: token.x,
      y: token.y,
      width: token.w,
      height: token.h
    };
    
    if (rectanglesOverlap(tokenRect, otherRect)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if rectangles overlap
 */
function rectanglesOverlap(rect1, rect2) {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
}

/**
 * Check for wall collisions at a position
 * @param {number} centerX - Center X in pixels
 * @param {number} centerY - Center Y in pixels
 * @param {number} widthGrids - Token width in grid units
 * @param {number} heightGrids - Token height in grid units
 * @returns {boolean} True if collision detected
 */
function hasWallCollision(centerX, centerY, widthGrids, heightGrids) {
  if (!canvas.walls) return false;
  
  const gridSize = canvas.grid.size;
  const halfWidth = (widthGrids * gridSize) / 2;
  const halfHeight = (heightGrids * gridSize) / 2;
  
  // Check corners of the token
  const corners = [
    { x: centerX - halfWidth + WALL_COLLISION_TEST_OFFSET, y: centerY - halfHeight + WALL_COLLISION_TEST_OFFSET },
    { x: centerX + halfWidth - WALL_COLLISION_TEST_OFFSET, y: centerY - halfHeight + WALL_COLLISION_TEST_OFFSET },
    { x: centerX - halfWidth + WALL_COLLISION_TEST_OFFSET, y: centerY + halfHeight - WALL_COLLISION_TEST_OFFSET },
    { x: centerX + halfWidth - WALL_COLLISION_TEST_OFFSET, y: centerY + halfHeight - WALL_COLLISION_TEST_OFFSET }
  ];
  
  for (const corner of corners) {
    const walls = canvas.walls.checkCollision(
      new Ray({ x: centerX, y: centerY }, corner),
      { type: 'move', mode: 'any' }
    );
    
    if (walls) {
      return true;
    }
  }
  
  return false;
}

// ==============================================
// SPLIT PARTY SYSTEM
// ==============================================

/**
 * Shows the split party dialog to select which members to deploy or create a new party
 * @param {Token} partyToken - The party token to split
 * @returns {Promise<void>}
 */
async function showSplitPartyDialog(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData || memberData.length === 0) {
    ui.notifications.warn("This is not a valid Party Token.");
    return;
  }

  // If only one member, just deploy normally
  if (memberData.length === 1) {
    await deployParty(partyToken, 'north', false);
    return;
  }

  // Build member selection checkboxes
  const memberCheckboxes = memberData.map((member, index) => {
    const isLeader = member.isLeader ? ' <span style="color: #00ff88;">(Leader)</span>' : '';
    return `
      <div class="member-checkbox" style="padding: 8px; margin: 4px 0; background: rgba(0,0,0,0.2); border-radius: 4px;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" name="member-${index}" checked style="margin-right: 12px; transform: scale(1.2);">
          <img src="${member.img}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 10px; border: 2px solid ${member.isLeader ? '#00ff88' : '#555'};">
          <span style="color: #ddd;">${member.name}${isLeader}</span>
        </label>
      </div>
    `;
  }).join('');

  new Dialog({
    title: "Split Party",
    content: `
      <style>
        .split-dialog {
          padding: 15px;
          font-family: "Signika", sans-serif;
        }
        .split-dialog h3 {
          margin: 0 0 12px 0;
          color: #ddd;
          font-size: 1.1em;
          border-bottom: 2px solid #00ff88;
          padding-bottom: 8px;
        }
        .split-dialog .info-text {
          font-size: 0.85em;
          color: #aaa;
          margin: 8px 0 12px 0;
          font-style: italic;
        }
      </style>
      <div class="split-dialog">
        <h3>Select Members to Deploy</h3>
        <p class="info-text">
          <i class="fas fa-info-circle"></i> Choose which members to separate. Unchecked members will form a new party.
        </p>
        ${memberCheckboxes}
      </div>
    `,
    buttons: {
      deploy: {
        label: '<i class="fas fa-user-minus"></i> Deploy Selected',
        callback: async (html) => {
          const selected = [];
          const remaining = [];
          
          memberData.forEach((member, index) => {
            if (html.find(`input[name="member-${index}"]`).is(':checked')) {
              selected.push(member);
            } else {
              remaining.push(member);
            }
          });
          
          await splitAndDeployMembers(partyToken, selected, remaining);
        }
      },
      cancel: {
        label: '<i class="fas fa-times"></i> Cancel',
        callback: () => {}
      }
    },
    default: "deploy"
  }, {
    width: 400,
    classes: ["dialog", "party-vision-dialog"]
  }).render(true);
}

/**
 * Split party and deploy selected members
 * @param {Token} partyToken - The party token
 * @param {Array} selectedMembers - Members to deploy
 * @param {Array} remainingMembers - Members to keep in party
 */
async function splitAndDeployMembers(partyToken, selectedMembers, remainingMembers) {
  if (selectedMembers.length === 0) {
    ui.notifications.warn("No members selected to deploy.");
    return;
  }
  
  const gridSize = canvas.grid.size;
  const partyCenterX = partyToken.x + (partyToken.document.width * gridSize / 2);
  const partyCenterY = partyToken.y + (partyToken.document.height * gridSize / 2);
  
  // Deploy selected members
  const newTokensData = [];
  for (const member of selectedMembers) {
    let actor;
    if (member.actorUuid) {
      try {
        actor = await fromUuid(member.actorUuid);
      } catch (e) {
        console.warn(`Party Vision | Could not resolve UUID ${member.actorUuid}`);
      }
    }
    
    if (!actor) {
      actor = game.actors.get(member.actorId);
    }
    
    if (!actor) {
      console.warn(`Party Vision | Actor not found for ${member.name}`);
      continue;
    }
    
    const protoToken = actor.prototypeToken;
    const tokenData = protoToken.toObject();
    
    // Place at party center
    const newToken = {
      ...tokenData,
      x: partyCenterX - (tokenData.width * gridSize / 2),
      y: partyCenterY - (tokenData.height * gridSize / 2),
      actorId: actor.id,
      actorLink: protoToken.actorLink,
      name: protoToken.name || actor.name,
      img: protoToken.texture?.src || actor.img
    };
    
    // Restore lighting
    if (member.originalLight) {
      newToken.light = member.originalLight;
    }
    
    delete newToken.actorData;
    delete newToken.delta;
    
    newTokensData.push(newToken);
  }
  
  await canvas.scene.createEmbeddedDocuments("Token", newTokensData);
  
  // Handle remaining members
  if (remainingMembers.length > 0) {
    // Update party token with remaining members
    await partyToken.document.setFlag('party-vision', 'memberData', remainingMembers);
    await updatePartyLightingFromActors(partyToken);
    ui.notifications.info(`Deployed ${selectedMembers.length} members. ${remainingMembers.length} remain in party.`);
  } else {
    // No members left, delete party token
    await canvas.scene.deleteEmbeddedDocuments("Token", [partyToken.id]);
    ui.notifications.info(`Deployed all ${selectedMembers.length} members.`);
  }
}

// ==============================================
// LIGHTING SYNCHRONIZATION
// ==============================================

/**
 * Update party token lighting based on member actors
 * @param {Token} partyToken - The party token
 */
async function updatePartyLightingFromActors(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData) return;
  
  let brightestLight = { bright: 0, dim: 0, color: null, alpha: 0.5, angle: 360, animation: {} };
  
  for (const member of memberData) {
    let actor;
    try {
      actor = await fromUuid(member.actorUuid);
    } catch (e) {
      actor = game.actors.get(member.actorId);
    }
    
    if (!actor) continue;
    
    // Get actor's light settings (check multiple possible locations)
    let actorLight = null;
    
    // Try prototype token light
    if (actor.prototypeToken?.light) {
      actorLight = actor.prototypeToken.light;
    }
    
    // Try active effects for light
    if (!actorLight || (actorLight.bright === 0 && actorLight.dim === 0)) {
      const lightEffect = actor.effects.find(e => 
        e.changes.some(c => c.key === 'light.bright' || c.key === 'ATL.light.bright')
      );
      
      if (lightEffect) {
        actorLight = {
          bright: lightEffect.changes.find(c => c.key === 'light.bright' || c.key === 'ATL.light.bright')?.value || 0,
          dim: lightEffect.changes.find(c => c.key === 'light.dim' || c.key === 'ATL.light.dim')?.value || 0,
          color: lightEffect.changes.find(c => c.key === 'light.color' || c.key === 'ATL.light.color')?.value || null,
          alpha: lightEffect.changes.find(c => c.key === 'light.alpha' || c.key === 'ATL.light.alpha')?.value || 0.5,
          angle: 360,
          animation: {}
        };
      }
    }
    
    if (!actorLight) continue;
    
    // Compare total light radius
    const currentRadius = actorLight.bright + actorLight.dim;
    const bestRadius = brightestLight.bright + brightestLight.dim;
    
    if (currentRadius > bestRadius) {
      brightestLight = {
        bright: actorLight.bright || 0,
        dim: actorLight.dim || 0,
        color: actorLight.color || null,
        alpha: actorLight.alpha || 0.5,
        angle: actorLight.angle || 360,
        animation: actorLight.animation || {}
      };
    }
  }
  
  // Update party token lighting
  await partyToken.document.update({ light: brightestLight });
}

/**
 * Update party lighting (debounced)
 * @param {Token} partyToken - The party token
 */
function updatePartyLighting(partyToken) {
  // Cancel pending update
  if (pendingLightingUpdates.has(partyToken.id)) {
    clearTimeout(pendingLightingUpdates.get(partyToken.id));
  }
  
  // Schedule new update
  const timeoutId = setTimeout(async () => {
    await updatePartyLightingFromActors(partyToken);
    pendingLightingUpdates.delete(partyToken.id);
  }, LIGHTING_UPDATE_DEBOUNCE_MS);
  
  pendingLightingUpdates.set(partyToken.id, timeoutId);
}

/**
 * Cycle through available light sources in the party
 * @param {Token} partyToken - The party token
 */
async function cycleLightSource(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData) return;
  
  // Get all members with light sources
  const membersWithLight = [];
  for (const member of memberData) {
    let actor;
    try {
      actor = await fromUuid(member.actorUuid);
    } catch (e) {
      actor = game.actors.get(member.actorId);
    }
    
    if (!actor) continue;
    
    let hasLight = false;
    let lightData = null;
    
    // Check prototype token
    if (actor.prototypeToken?.light?.bright > 0 || actor.prototypeToken?.light?.dim > 0) {
      hasLight = true;
      lightData = actor.prototypeToken.light;
    }
    
    // Check active effects
    if (!hasLight) {
      const lightEffect = actor.effects.find(e => 
        e.changes.some(c => c.key === 'light.bright' || c.key === 'ATL.light.bright')
      );
      
      if (lightEffect) {
        hasLight = true;
        lightData = {
          bright: lightEffect.changes.find(c => c.key === 'light.bright' || c.key === 'ATL.light.bright')?.value || 0,
          dim: lightEffect.changes.find(c => c.key === 'light.dim' || c.key === 'ATL.light.dim')?.value || 0
        };
      }
    }
    
    if (hasLight) {
      membersWithLight.push({
        name: actor.name,
        light: lightData
      });
    }
  }
  
  if (membersWithLight.length === 0) {
    ui.notifications.info("No party members have light sources.");
    return;
  }
  
  // Find current light source
  const currentLight = partyToken.document.light;
  let currentIndex = membersWithLight.findIndex(m => 
    m.light.bright === currentLight.bright && m.light.dim === currentLight.dim
  );
  
  // Cycle to next
  currentIndex = (currentIndex + 1) % membersWithLight.length;
  const newSource = membersWithLight[currentIndex];
  
  await partyToken.document.update({ light: newSource.light });
  ui.notifications.info(`Switched to ${newSource.name}'s light source`);
}

// ==============================================
// FOLLOW-THE-LEADER MODE
// ==============================================

/**
 * Toggle follow-the-leader mode
 */
function toggleFollowLeaderMode() {
  const controlled = canvas.tokens.controlled;
  
  if (controlled.length < 2) {
    ui.notifications.warn("Select at least 2 tokens to enable Follow-the-Leader mode.");
    return;
  }
  
  if (followLeaderMode) {
    // Disable mode
    followLeaderMode = false;
    leaderToken = null;
    followerOffsets.clear();
    ui.notifications.info("Follow-the-Leader mode disabled.");
  } else {
    // Enable mode
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
