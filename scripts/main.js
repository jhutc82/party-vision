// ==============================================
// PARTY VISION MODULE - MAIN SCRIPT
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
  console.log('Party Vision | Initializing Enhanced Module v2.2.12');
  
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
    hint: "Display a circle showing the party's spread radius.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('party-vision', 'savedFormations', {
    name: "Custom Formations",
    hint: "Your saved custom formations (use the UI to manage these).",
    scope: 'world',
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register('party-vision', 'savedPartyConfigs', {
    name: "Saved Party Configurations",
    hint: "Remembers party names and images for specific token combinations.",
    scope: 'world',
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register('party-vision', 'calculateMovement', {
    name: "Calculate Movement Capabilities",
    hint: "Automatically calculate party movement speed and types based on members. Disable if this causes issues with your game system.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('party-vision', 'showMovementInfo', {
    name: "Show Movement Info on Token",
    hint: "Display movement speed and types on the party token nameplate.",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register('party-vision', 'roundMovementSpeed', {
    name: "Round Movement Speeds",
    hint: "Round calculated speeds to nearest 5 for cleaner display (e.g., 32 becomes 30).",
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  // --- REGISTER KEYBINDINGS (MUST BE IN INIT HOOK) ---
  game.keybindings.register('party-vision', 'toggleFollowLeader', {
    name: "Toggle Follow-the-Leader Mode",
    hint: "Enable/disable follow-the-leader movement for selected tokens.",
    editable: [{ key: "KeyL", modifiers: ["Control"] }],
    onDown: () => {
      toggleFollowLeaderMode();
      return true;
    }
  });

  // --- CHECK FOR LIBWRAPPER DEPENDENCY ---
  console.log('Party Vision | Checking for libWrapper...');
  const libWrapperModule = game.modules.get('lib-wrapper');
  console.log('Party Vision | libWrapper module object:', libWrapperModule);
  console.log('Party Vision | libWrapper active?:', libWrapperModule?.active);
  
  // Check if libWrapper API is available (more reliable than checking active flag)
  const hasLibWrapper = typeof libWrapper !== 'undefined';
  console.log('Party Vision | libWrapper API available?:', hasLibWrapper);
  
  if (!hasLibWrapper) {
    console.error('Party Vision | libWrapper API not found!');
    ui.notifications.error("Party Vision requires 'libWrapper' module to be active!");
    console.error('Party Vision | Make sure libWrapper is:');
    console.error('  1. Installed');
    console.error('  2. Activated in module settings'); 
    console.error('  3. Loaded BEFORE Party Vision');
    console.error('Party Vision | Settings have been registered, but hooks will not work without libWrapper');
    return;
  }
  
  console.log('Party Vision | libWrapper detected, registering hooks...');

  // --- REGISTER VISION HOOK (FIX: Use v13 method name initializeVisionSource) ---
  
  libWrapper.register('party-vision', 'Token.prototype.initializeVisionSource', function(wrapped, ...args) {
    const partyToken = this;
    const memberData = partyToken.document.getFlag("party-vision", "memberData");
    
    if (!memberData) return wrapped(...args);
    
    const userActor = game.user.character;
    const isMember = memberData.some(m => m.actorId === userActor?.id);
    
    if (!userActor || !isMember) return wrapped(...args);
    
    const actorVision = userActor.prototypeToken;
    
    // Store original vision data
    const originalData = {
      visionMode: partyToken.document.visionMode,
      dimSight: partyToken.document.dimSight,
      brightSight: partyToken.document.brightSight,
      sightAngle: partyToken.document.sightAngle,
      visionAttenuation: partyToken.document.visionAttenuation,
      detectionModes: partyToken.document.detectionModes
    };
    
    // Apply user's character vision
    partyToken.document.visionMode = actorVision.visionMode;
    partyToken.document.dimSight = actorVision.dimSight;
    partyToken.document.brightSight = actorVision.brightSight;
    partyToken.document.sightAngle = actorVision.sightAngle;
    partyToken.document.visionAttenuation = actorVision.visionAttenuation;
    partyToken.document.detectionModes = actorVision.detectionModes; // FIX: from prototypeToken
    
    const result = wrapped(...args);
    
    // Restore original data
    partyToken.document.visionMode = originalData.visionMode;
    partyToken.document.dimSight = originalData.dimSight;
    partyToken.document.brightSight = originalData.brightSight;
    partyToken.document.sightAngle = originalData.sightAngle;
    partyToken.document.visionAttenuation = originalData.visionAttenuation;
    partyToken.document.detectionModes = originalData.detectionModes;
    
    return result;
  }, 'WRAPPER');
  
  // NOTE: Token.prototype._onDoubleLeft was removed in Foundry v13
  // Double-click functionality removed for now - players can still right-click → Open Actor Sheet
  
  console.log('Party Vision | Init hook completed successfully');
  console.log('Party Vision | Settings registered: 6');
  console.log('Party Vision | Keybindings registered: 1');
  console.log('Party Vision | libWrapper hooks registered: 1'); // Updated count
});

// ==============================================
// READY HOOK - Post-initialization setup
// ==============================================

Hooks.once('ready', async () => {
  console.log('Party Vision | Module Ready');
  
  // Verify that init hook completed successfully by checking if settings were registered
  if (!game.settings.settings.has('party-vision.showHudButtons')) {
    console.error('Party Vision | Settings not registered!');
    console.error('Party Vision | This means the init hook failed. Common causes:');
    console.error('  1. libWrapper module not loaded before Party Vision');
    console.error('  2. Init hook error that prevented settings registration');
    console.error('  3. Module load order issue');
    console.error('Party Vision | Check console for errors during init phase');
    ui.notifications.error('Party Vision: Initialization failed - check console for details');
    return;
  }
  
  console.log('Party Vision | Settings verified successfully');
  
  // Validate compendium on load
  try {
    const pack = game.packs.get("party-vision.macros");
    if (pack) {
      console.log('Party Vision | Compendium found:', pack.metadata.label);
      
      // Try to load documents - may have cached duplicates from Forge
      const docs = await pack.getDocuments();
      console.log(`Party Vision | Compendium loaded: ${docs.length} macro(s)`);
      
      // Validate we have the expected macros
      const expectedMacros = ['Form Party', 'Deploy Party'];
      const foundMacros = docs.map(d => d.name);
      const hasAllExpected = expectedMacros.every(name => foundMacros.includes(name));
      
      if (hasAllExpected) {
        console.log('Party Vision | Core macros verified: Form Party, Deploy Party');
      } else {
        console.warn('Party Vision | Expected macros not found:', expectedMacros);
        console.warn('Party Vision | Found macros:', foundMacros);
      }
      
      // Check for duplicates (Forge caching issue)
      if (docs.length > 2) {
        console.warn('Party Vision | Detected extra macros in compendium (likely Forge cache)');
        console.warn('Party Vision | Expected: 2 macros, Found:', docs.length);
        console.warn('Party Vision | This is cosmetic - functionality not affected');
        console.warn('Party Vision | To fix: Uninstall module → Clear browser cache → Reinstall');
      }
    } else {
      console.warn('Party Vision | Compendium not found: party-vision.macros');
    }
  } catch (e) {
    // Suppress Foundry's "Error detected in module" warning for compendium issues
    console.warn('Party Vision | Compendium load warning (likely cached duplicates):', e.message);
    console.warn('Party Vision | This is a known Forge caching issue and does not affect functionality');
  }
  
  // Register hooks after settings are ready
  console.log('Party Vision | Registering visual indicators...');
  setupVisualIndicators();
  console.log('Party Vision | Registering Token HUD integration...');
  setupTokenHUD();
  console.log('Party Vision | Initialization complete');
});

// ==============================================
// CANVAS READY HOOK - Refresh vision for existing party tokens
// ==============================================

Hooks.on('canvasReady', () => {
  // This hook ensures that party token vision is refreshed when:
  // 1. A player logs in and the canvas loads
  // 2. The scene changes
  // 3. The canvas is re-rendered
  
  // Only refresh if the user has a character assigned
  if (!game.user.character) {
    console.log('Party Vision | Canvas ready but no character assigned to user');
    return;
  }
  
  console.log('Party Vision | Canvas ready - refreshing vision for party tokens');
  
  // Find all party tokens on the current scene
  const partyTokens = canvas.tokens.placeables.filter(token => {
    const memberData = token.document.getFlag('party-vision', 'memberData');
    return memberData && memberData.length > 0;
  });
  
  if (partyTokens.length === 0) {
    console.log('Party Vision | No party tokens found on scene');
    return;
  }
  
  console.log(`Party Vision | Found ${partyTokens.length} party token(s), checking if user is a member`);
  
  // Refresh vision sources for party tokens that include this user's character
  for (const partyToken of partyTokens) {
    const memberData = partyToken.document.getFlag('party-vision', 'memberData');
    const userActorId = game.user.character.id;
    const isMember = memberData.some(m => m.actorId === userActorId);
    
    if (isMember) {
      console.log(`Party Vision | User's character is in party token "${partyToken.name}" - refreshing vision`);
      
      // Force re-initialization of vision source
      // This will trigger our libWrapper hook with the correct user character
      partyToken.initializeVisionSource({ deleted: false });
    }
  }
});

// ==============================================
// TOKEN HUD SETUP
// ==============================================

function setupTokenHUD() {
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
        // Try to find macro in compendium first, otherwise try user macros
        let macro = null;
        try {
          const pack = game.packs.get("party-vision.macros");
          if (pack) {
            const docs = await pack.getDocuments();
            macro = docs.find(m => m.name === "Form Party");
          }
        } catch (e) {
          console.warn("Party Vision: Error loading compendium", e);
        }
        
        // Fallback: check user macros
        if (!macro) {
          macro = game.macros.find(m => m.name === "Form Party");
        }
        
        if (macro) {
          macro.execute();
        } else {
          ui.notifications.warn("Form Party macro not found. Please create it manually or run the form party code directly.");
          console.warn("Party Vision: Form Party macro not found in compendium or user macros");
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
        <div class="control-icon party-vision-deploy" title="Deploy Party">
          <i class="fas fa-users-slash"></i>
        </div>
      `);
      deployButton.on('click', async () => {
        // Try to find macro in compendium first, otherwise try user macros
        let macro = null;
        try {
          const pack = game.packs.get("party-vision.macros");
          if (pack) {
            const docs = await pack.getDocuments();
            macro = docs.find(m => m.name === "Deploy Party");
          }
        } catch (e) {
          console.warn("Party Vision: Error loading compendium", e);
        }
        
        // Fallback: check user macros
        if (!macro) {
          macro = game.macros.find(m => m.name === "Deploy Party");
        }
        
        if (macro) {
          macro.execute();
        } else {
          ui.notifications.warn("Deploy Party macro not found. Please create it manually or run the deploy party code directly.");
          console.warn("Party Vision: Deploy Party macro not found in compendium or user macros");
        }
        app.clear();
      });
      col.append(deployButton);
    }
  });
}

// ==============================================
// VISUAL INDICATORS SETUP
// ==============================================

function setupVisualIndicators() {
  Hooks.on('refreshToken', (token) => {
    const memberData = token.document.getFlag('party-vision', 'memberData');
    if (!memberData) return;
    
    // Safety check: ensure settings are registered before accessing
    try {
      if (!game.settings.settings.has('party-vision.showMemberPortraits')) {
        return;
      }
    } catch (e) {
      return;
    }
    
    // Remove existing overlays
    token.children.forEach(child => {
      if (child.name === 'party-vision-overlay') {
        child.destroy();
      }
    });
    
    if (game.settings.get('party-vision', 'showMemberPortraits')) {
      renderMemberPortraits(token, memberData);
    }
    
    if (game.settings.get('party-vision', 'showRangeIndicator')) {
      renderRangeIndicator(token, memberData);
    }
  });
}

// ==============================================
// CONTEXT MENU FOR PARTY TOKENS
// ==============================================

Hooks.on('getTokenContextOptions', (html, contextOptions) => {
  const token = canvas.tokens.get(html.data('token-id'));
  if (!token) return;
  
  const memberData = token.document.getFlag('party-vision', 'memberData');
  
  // Add options for party tokens
  if (memberData && (game.user.isGM || game.settings.get('party-vision', 'allowPlayerActions'))) {
    
    contextOptions.push({
      name: "Scout Ahead",
      icon: '<i class="fas fa-running"></i>',
      condition: () => memberData && memberData.length > 0,
      callback: () => scoutAheadDialog(token)
    });
    
    contextOptions.push({
      name: "Remove Member",
      icon: '<i class="fas fa-user-minus"></i>',
      condition: () => memberData && memberData.length > 1,
      callback: () => removeMemberDialog(token)
    });
    
    contextOptions.push({
      name: "Split Party",
      icon: '<i class="fas fa-users-cog"></i>',
      condition: () => memberData && memberData.length > 1,
      callback: () => splitPartyDialog(token)
    });
  }
  
  // Add "Add to Party" for regular tokens near party tokens
  if (!memberData) {
    const nearbyPartyToken = canvas.tokens.placeables.find(t => {
      const dist = Math.hypot(t.x - token.x, t.y - token.y);
      return t.document.getFlag('party-vision', 'memberData') && dist < canvas.grid.size * NEARBY_DISTANCE_MULTIPLIER;
    });
    
    if (nearbyPartyToken) {
      contextOptions.push({
        name: "Add to Nearby Party",
        icon: '<i class="fas fa-user-plus"></i>',
        condition: () => token.actor,
        callback: () => addToParty(token, nearbyPartyToken)
      });
    }
  }
});

// ==============================================
// VISUAL INDICATORS - Member Portraits & Range Indicator
// ==============================================

function renderMemberPortraits(token, memberData) {
  const container = new PIXI.Container();
  container.name = 'party-vision-overlay';
  
  const members = memberData.slice(0, MAX_PORTRAITS); // Max portraits
  
  members.forEach((member, index) => {
    const actor = game.actors.get(member.actorId);
    if (!actor) return;
    
    // Evenly space portraits around the token perimeter
    // Start from top (12 o'clock) and go clockwise
    const angle = (index / members.length) * Math.PI * 2 - Math.PI / 2; // Start at top
    const radius = Math.max(token.w, token.h) * 0.65; // Position just outside token edge
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    const sprite = PIXI.Sprite.from(actor.img);
    sprite.width = PORTRAIT_SIZE;
    sprite.height = PORTRAIT_SIZE;
    sprite.anchor.set(0.5);
    sprite.x = token.w / 2 + x;
    sprite.y = token.h / 2 + y;
    
    // Add circular mask
    const mask = new PIXI.Graphics();
    mask.beginFill(0xFFFFFF);
    mask.drawCircle(sprite.x, sprite.y, PORTRAIT_SIZE / 2);
    mask.endFill();
    container.addChild(mask);
    sprite.mask = mask;
    
    // Add border with slight glow effect
    const border = new PIXI.Graphics();
    border.lineStyle(2, 0xFFFFFF, 0.9);
    border.drawCircle(sprite.x, sprite.y, PORTRAIT_SIZE / 2);
    border.lineStyle(1, 0x00AAFF, 0.5);
    border.drawCircle(sprite.x, sprite.y, PORTRAIT_SIZE / 2 + 1);
    
    container.addChild(sprite);
    container.addChild(border);
  });
  
  token.addChild(container);
}

function renderRangeIndicator(token, memberData) {
  const container = token.children.find(c => c.name === 'party-vision-overlay') 
    || new PIXI.Container();
  
  if (!token.children.includes(container)) {
    container.name = 'party-vision-overlay';
    token.addChild(container);
  }
  
  // Calculate max spread from member data
  let maxDist = 0;
  memberData.forEach(member => {
    const dist = Math.sqrt(member.dx ** 2 + member.dy ** 2);
    if (dist > maxDist) maxDist = dist;
  });
  
  const radiusInPixels = (maxDist + 2) * canvas.grid.size;
  
  const circle = new PIXI.Graphics();
  circle.lineStyle(2, 0x4444FF, 0.3);
  circle.drawCircle(token.w / 2, token.h / 2, radiusInPixels);
  
  container.addChild(circle);
}

// ==============================================
// COMBAT INTEGRATION - Auto-Deploy and Auto-Form
// ==============================================

// Auto-deploy on combat start
Hooks.on('updateCombat', async (combat, updateData, options, userId) => {
  // Only trigger for the GM
  if (!game.user.isGM) return;
  
  // Check if combat is starting (round changes from undefined/0 to 1)
  const isStarting = updateData.round === 1 && combat.previous.round !== 1;
  const isEnding = combat.round > 0 && updateData.active === false;
  
  if (isStarting && game.settings.get('party-vision', 'autoDeployOnCombat')) {
    console.log('Party Vision | Combat starting - auto-deploying party tokens');
    
    // Find party tokens on the current scene
    const partyTokens = canvas.tokens.placeables.filter(t => 
      t.document.getFlag('party-vision', 'memberData')
    );
    
    if (partyTokens.length === 0) return;
    
    ui.notifications.info(`Auto-deploying ${partyTokens.length} party token(s) for combat...`);
    
    for (const partyToken of partyTokens) {
      const lastFacing = partyToken.document.getFlag('party-vision', 'lastFacing') || (-Math.PI / 2);
      await deployParty(partyToken, lastFacing, true); // Pass true for combat mode
    }
  }
  
  if (isEnding && game.settings.get('party-vision', 'autoFormOnCombatEnd')) {
    console.log('Party Vision | Combat ending - auto-forming party');
    
    // Wait a moment for combat to fully end
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find all tokens that could be party members (player-owned tokens)
    const playerTokens = canvas.tokens.placeables.filter(t => {
      if (!t.actor) return false;
      if (t.document.getFlag('party-vision', 'memberData')) return false; // Skip existing party tokens
      
      // Check if any player owns this actor
      const owners = Object.entries(t.actor.ownership || {})
        .filter(([userId, level]) => level >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)
        .map(([userId]) => userId);
      
      return owners.some(userId => {
        const user = game.users.get(userId);
        return user && !user.isGM;
      });
    });
    
    if (playerTokens.length > 0) {
      ui.notifications.info(`Auto-forming party from ${playerTokens.length} tokens...`);
      
      // Select the tokens programmatically
      canvas.tokens.releaseAll();
      playerTokens.forEach(t => t.control({ releaseOthers: false }));
      
      // Call the Form Party function
      const formPartyMacro = (await game.packs.get("party-vision.macros").getDocuments())
        .find(m => m.name === "Form Party");
      
      if (formPartyMacro) {
        await formPartyMacro.execute();
      }
    }
  }
});

// ==============================================
// FOLLOW-THE-LEADER MODE
// ==============================================

// ==============================================
// MEMBER MANAGEMENT FUNCTIONS
// ==============================================

async function scoutAheadDialog(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  
  const options = memberData.map(m => {
    const actor = game.actors.get(m.actorId);
    return `<option value="${m.actorId}">${actor?.name || 'Unknown'}</option>`;
  }).join('');
  
  new Dialog({
    title: "Scout Ahead",
    content: `
      <p>Choose a character to scout ahead:</p>
      <select id="scout-select" style="width: 100%;">
        ${options}
      </select>
    `,
    buttons: {
      scout: {
        label: "Scout",
        callback: async (html) => {
          const actorId = html.find('#scout-select').val();
          await scoutAhead(partyToken, actorId);
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "scout"
  }).render(true);
}

async function scoutAhead(partyToken, actorId) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  const member = memberData.find(m => m.actorId === actorId);
  
  if (!member) return;
  
  const actor = game.actors.get(actorId);
  const tokenData = actor.prototypeToken.toObject();
  
  // Spawn token at party location
  const newTokenData = foundry.utils.mergeObject(tokenData, {
    x: partyToken.x,
    y: partyToken.y,
    actorId: actor.id,  // Explicitly set actor ID
    actorLink: actor.prototypeToken.actorLink  // Preserve actor link setting
  });
  
  await canvas.scene.createEmbeddedDocuments("Token", [newTokenData]);
  ui.notifications.info(`${actor.name} scouts ahead!`);
}

async function removeMemberDialog(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  
  const options = memberData.map(m => {
    const actor = game.actors.get(m.actorId);
    return `<option value="${m.actorId}">${actor?.name || 'Unknown'}</option>`;
  }).join('');
  
  new Dialog({
    title: "Remove Member from Party",
    content: `
      <p>Choose a character to remove:</p>
      <select id="remove-select" style="width: 100%;">
        ${options}
      </select>
    `,
    buttons: {
      remove: {
        label: "Remove",
        callback: async (html) => {
          const actorId = html.find('#remove-select').val();
          await removeMember(partyToken, actorId);
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "remove"
  }).render(true);
}

async function removeMember(partyToken, actorId) {
  let memberData = partyToken.document.getFlag('party-vision', 'memberData');
  memberData = memberData.filter(m => m.actorId !== actorId);
  
  if (memberData.length === 0) {
    ui.notifications.warn("Cannot remove last member. Use Deploy Party instead.");
    return;
  }
  
  await partyToken.document.setFlag('party-vision', 'memberData', memberData);
  ui.notifications.info("Member removed from party.");
  partyToken.refresh();
}

async function splitPartyDialog(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  
  if (memberData.length < 2) {
    ui.notifications.warn("Need at least 2 members to split the party.");
    return;
  }
  
  const checkboxes = memberData.map((m, index) => {
    const actor = game.actors.get(m.actorId);
    return `
      <div style="padding: 5px 0;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" class="split-member" value="${index}" style="margin-right: 10px;">
          <span>${actor?.name || 'Unknown'}</span>
        </label>
      </div>
    `;
  }).join('');
  
  new Dialog({
    title: "Split Party",
    content: `
      <div style="padding: 10px;">
        <p><strong>Select members to split into a new party:</strong></p>
        <p style="font-size: 0.9em; color: #999; margin-bottom: 15px;">
          Selected members will form a new party token.
          Remaining members will stay in the current party.
        </p>
        <div style="max-height: 300px; overflow-y: auto; border: 1px solid #444; padding: 10px; border-radius: 3px;">
          ${checkboxes}
        </div>
      </div>
    `,
    buttons: {
      split: {
        label: "Split Party",
        callback: async (html) => {
          const selected = [];
          html.find('.split-member:checked').each(function() {
            selected.push(parseInt($(this).val()));
          });
          
          if (selected.length === 0) {
            ui.notifications.warn("Please select at least one member to split off.");
            return;
          }
          
          if (selected.length === memberData.length) {
            ui.notifications.warn("Cannot split all members. Leave at least one in the original party.");
            return;
          }
          
          await splitParty(partyToken, selected);
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "split",
    render: (html) => {
      // Add "Select All" / "Select None" helpers
      html.find('.dialog-content').prepend(`
        <div style="margin-bottom: 10px; padding: 5px; background: rgba(0,0,0,0.2); border-radius: 3px;">
          <button type="button" id="select-all" style="margin-right: 5px;">Select All</button>
          <button type="button" id="select-none">Select None</button>
        </div>
      `);
      
      html.find('#select-all').on('click', () => {
        html.find('.split-member').prop('checked', true);
      });
      
      html.find('#select-none').on('click', () => {
        html.find('.split-member').prop('checked', false);
      });
    }
  }).render(true);
}

async function splitParty(partyToken, selectedIndices) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  
  // Split members into two groups
  const splitMembers = [];
  const remainingMembers = [];
  
  memberData.forEach((member, index) => {
    if (selectedIndices.includes(index)) {
      splitMembers.push(member);
    } else {
      remainingMembers.push(member);
    }
  });
  
  if (remainingMembers.length === 0 || splitMembers.length === 0) {
    ui.notifications.error("Invalid split - each party needs at least one member.");
    return;
  }
  
  // Calculate center of split members (relative to current party token)
  let splitCenterX = 0;
  let splitCenterY = 0;
  splitMembers.forEach(m => {
    splitCenterX += m.dx;
    splitCenterY += m.dy;
  });
  splitCenterX /= splitMembers.length;
  splitCenterY /= splitMembers.length;
  
  // Recalculate positions relative to new center
  const recenteredSplitMembers = splitMembers.map(m => ({
    ...m,
    dx: Math.round(m.dx - splitCenterX),
    dy: Math.round(m.dy - splitCenterY)
  }));
  
  // Create new party token for split group
  const gridSize = canvas.grid.size;
  const offset = gridSize * 2; // Offset new party by 2 grid squares
  
  // Get max dimensions from split members
  let maxWidth = 1;
  let maxHeight = 1;
  for (const member of splitMembers) {
    const actor = game.actors.get(member.actorId);
    if (actor?.prototypeToken) {
      if (actor.prototypeToken.width > maxWidth) maxWidth = actor.prototypeToken.width;
      if (actor.prototypeToken.height > maxHeight) maxHeight = actor.prototypeToken.height;
    }
  }
  
  const newPartyData = {
    name: "Split Party",
    x: partyToken.x + offset,
    y: partyToken.y + offset,
    texture: { src: "icons/svg/users.svg" },
    width: maxWidth,
    height: maxHeight,
    sight: {
      enabled: true,
      range: 0,
      angle: 360,
      visionMode: "basic"
    },
    displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
    actorLink: false,
    disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
    ring: {
      enabled: false
    },
    ownership: {
      default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      ...Object.fromEntries(
        recenteredSplitMembers
          .map(m => game.actors.get(m.actorId))
          .filter(a => a)
          .flatMap(a => 
            Object.entries(a.ownership || {})
              .filter(([userId, level]) => level >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)
          )
      )
    },
    flags: {
      "party-vision": {
        "memberData": recenteredSplitMembers,
        "naturalFacing": partyToken.document.getFlag('party-vision', 'naturalFacing') || (-Math.PI / 2)
      }
    }
  };
  
  // Create new party token
  await canvas.scene.createEmbeddedDocuments("Token", [newPartyData]);
  
  // Update original party with remaining members
  await partyToken.document.setFlag('party-vision', 'memberData', remainingMembers);
  
  ui.notifications.info(`Party split! ${splitMembers.length} members in new party, ${remainingMembers.length} remaining.`);
  partyToken.refresh();
}

async function addToParty(token, partyToken) {
  if (!token.actor) {
    ui.notifications.warn("Token has no linked actor.");
    return;
  }
  
  let memberData = partyToken.document.getFlag('party-vision', 'memberData');
  
  // Check if already in party
  if (memberData.some(m => m.actorId === token.actor.id)) {
    ui.notifications.warn("Character is already in the party.");
    return;
  }
  
  // Calculate relative position
  const gridSize = canvas.grid.size;
  const deltaX = token.center.x - partyToken.center.x;
  const deltaY = token.center.y - partyToken.center.y;
  const gridX = Math.round(deltaX / gridSize);
  const gridY = Math.round(deltaY / gridSize);
  
  memberData.push({
    actorId: token.actor.id,
    dx: gridX,
    dy: gridY
  });
  
  await partyToken.document.setFlag('party-vision', 'memberData', memberData);
  await canvas.scene.deleteEmbeddedDocuments("Token", [token.id]);
  
  ui.notifications.info(`${token.actor.name} joined the party!`);
  partyToken.refresh();
}

// ==============================================
// FOLLOW-THE-LEADER MODE
// ==============================================

function toggleFollowLeaderMode() {
  const controlled = canvas.tokens.controlled;
  
  if (controlled.length < 2) {
    ui.notifications.warn("Select at least 2 tokens to enable Follow-the-Leader mode.");
    return;
  }
  
  followLeaderMode = !followLeaderMode;
  
  if (followLeaderMode) {
    leaderToken = controlled[0];
    followerOffsets.clear();
    
    // Store relative positions
    controlled.slice(1).forEach(follower => {
      followerOffsets.set(follower.id, {
        dx: follower.x - leaderToken.x,
        dy: follower.y - leaderToken.y
      });
    });
    
    ui.notifications.info(`Follow-the-Leader mode enabled. ${leaderToken.name} is the leader.`);
  } else {
    leaderToken = null;
    followerOffsets.clear();
    ui.notifications.info("Follow-the-Leader mode disabled.");
  }
}

Hooks.on('updateToken', async (tokenDoc, change, options, userId) => {
  if (!followLeaderMode) return;
  if (!leaderToken || tokenDoc.id !== leaderToken.id) return;
  if (!('x' in change || 'y' in change)) return;
  
  // Move followers
  const updates = [];
  for (const [followerId, offset] of followerOffsets.entries()) {
    updates.push({
      _id: followerId,
      x: leaderToken.x + offset.dx,
      y: leaderToken.y + offset.dy
    });
  }
  
  if (updates.length > 0) {
    await canvas.scene.updateEmbeddedDocuments("Token", updates);
  }
});

// ==============================================
// PARTY LIGHTING SYNCHRONIZATION
// ==============================================

/**
 * Watch for lighting changes on tokens and update party tokens accordingly
 */
Hooks.on('updateToken', async (tokenDoc, change, options, userId) => {
  // Only process if light properties changed
  if (!change.light) return;
  
  // Skip if this IS a party token (prevent self-referential updates)
  if (tokenDoc.getFlag('party-vision', 'memberData')) return;
  
  // Get the actor ID of the updated token
  const actorId = tokenDoc.actorId;
  if (!actorId) return;
  
  // Find all party tokens that contain this actor
  const partyTokens = canvas.tokens.placeables.filter(t => {
    const memberData = t.document.getFlag('party-vision', 'memberData');
    if (!memberData) return false;
    return memberData.some(m => m.actorId === actorId);
  });
  
  // Update lighting on each party token
  for (const partyToken of partyTokens) {
    await updatePartyLighting(partyToken);
  }
});

/**
 * Watch for actor prototype token changes (e.g., when player updates their character's light in actor sheet)
 */
Hooks.on('updateActor', async (actor, change, options, userId) => {
  // CRITICAL FIX: In PF2e, lighting a torch doesn't always directly modify prototypeToken.light
  // It might modify items, effects, or system data. So we need to check if this actor is in any party
  // and update lighting regardless of what changed.
  
  // Quick check: is this actor in any party?
  const partyTokens = canvas.tokens.placeables.filter(t => {
    const memberData = t.document.getFlag('party-vision', 'memberData');
    if (!memberData) return false;
    return memberData.some(m => m.actorId === actor.id);
  });
  
  // If actor isn't in any party, no need to update
  if (partyTokens.length === 0) return;
  
  console.log(`Party Vision | Actor ${actor.name} updated (in ${partyTokens.length} party token(s)), checking lighting...`);
  
  // Update lighting on each party token
  // The updatePartyLightingFromActors function will read the current light state
  for (const partyToken of partyTokens) {
    debouncedUpdatePartyLighting(partyToken);
  }
});

/**
 * Watch for Active Effects (like spell effects) that modify lighting
 * This catches PF2e Light spell and similar effects
 */
Hooks.on('createActiveEffect', async (effect, options, userId) => {
  await handleActiveEffectChange(effect);
});

Hooks.on('updateActiveEffect', async (effect, change, options, userId) => {
  await handleActiveEffectChange(effect);
});

Hooks.on('deleteActiveEffect', async (effect, options, userId) => {
  await handleActiveEffectChange(effect);
});

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

/**
 * Handle Active Effect changes that might affect lighting
 * @param {ActiveEffect} effect - The active effect that changed
 */
async function handleActiveEffectChange(effect) {
  // Get the actor this effect belongs to
  const actor = effect.parent;
  if (!actor || actor.documentName !== 'Actor') return;
  
  // Find all party tokens that contain this actor
  const partyTokens = canvas.tokens.placeables.filter(t => {
    const memberData = t.document.getFlag('party-vision', 'memberData');
    if (!memberData) return false;
    return memberData.some(m => m.actorId === actor.id);
  });
  
  if (partyTokens.length === 0) return;
  
  console.log(`Party Vision | Active Effect "${effect.name}" changed on ${actor.name}, updating ${partyTokens.length} party token(s)`);
  
  // Update lighting on each party token
  // We update for ANY active effect change because effects might indirectly affect lighting
  // (e.g., in PF2e, spell effects modify system data that affects computed token light)
  for (const partyToken of partyTokens) {
    debouncedUpdatePartyLighting(partyToken);
  }
}

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
  
  // CRITICAL FIX: Add small delay to ensure actor/effect data is fully processed
  // This handles the case where lighting changes trigger hooks before the actor's
  // derived data (including light calculations) has been updated
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const lights = [];
  
  console.log(`Party Vision | Checking lighting for ${memberData.length} party members`);
  
  // Collect light data from member actors
  for (const member of memberData) {
    const actor = game.actors.get(member.actorId);
    if (!actor) continue;
    
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
        console.log(`Party Vision | ${actor.name}: Using deployed token light (bright=${effectiveLight.bright}, dim=${effectiveLight.dim})`);
      }
    }
    
    // STRATEGY 2: Try to get computed token data with effects applied
    if (!effectiveLight) {
      try {
        // CRITICAL FIX: Force full actor data preparation before reading light data
        // This ensures all active effects and item states are properly applied
        if (actor.prepareData) {
          actor.prepareData();
        }
        
        // For v13+ also prepare embedded documents (items, effects)
        if (actor.prepareEmbeddedDocuments) {
          actor.prepareEmbeddedDocuments();
        }
        
        // Additional preparation for systems that compute derived data
        if (actor.prepareDerivedData) {
          actor.prepareDerivedData();
        }
        
        // Try multiple methods to get effective token data
        let tokenDoc = null;
        
        // Method A: getTokenDocument (most systems)
        if (typeof actor.getTokenDocument === 'function') {
          tokenDoc = await actor.getTokenDocument();
          console.log(`Party Vision | ${actor.name}: getTokenDocument() returned:`, {
            hasLight: !!tokenDoc?.light,
            bright: tokenDoc?.light?.bright,
            dim: tokenDoc?.light?.dim
          });
        }
        // Method B: Create synthetic token (PF2e and other systems)
        else if (typeof actor.getTokenData === 'function') {
          tokenDoc = actor.getTokenData();
          console.log(`Party Vision | ${actor.name}: getTokenData() returned:`, {
            hasLight: !!tokenDoc?.light,
            bright: tokenDoc?.light?.bright,
            dim: tokenDoc?.light?.dim
          });
        }
        // Method C: Direct prototype access after data prep (fallback)
        else if (actor.prototypeToken) {
          tokenDoc = actor.prototypeToken;
          console.log(`Party Vision | ${actor.name}: Using prototypeToken directly:`, {
            hasLight: !!tokenDoc?.light,
            bright: tokenDoc?.light?.bright,
            dim: tokenDoc?.light?.dim
          });
        }
        
        if (tokenDoc?.light && (tokenDoc.light.bright > 0 || tokenDoc.light.dim > 0)) {
          effectiveLight = tokenDoc.light;
          console.log(`Party Vision | ${actor.name}: ✓ Using computed token data (bright=${effectiveLight.bright}, dim=${effectiveLight.dim})`);
        }
      } catch (e) {
        console.log(`Party Vision | ${actor.name}: getTokenDocument failed:`, e.message);
      }
    }
    
    // STRATEGY 2.5: Manually apply active effects to prototype token
    if (!effectiveLight) {
      try {
        // Start with prototype token light
        let computedLight = foundry.utils.deepClone(actor.prototypeToken?.light || {
          bright: 0, dim: 0, angle: 360, color: null, alpha: 0.5,
          animation: {}, coloration: 1, luminosity: 0.5, attenuation: 0.5,
          contrast: 0, saturation: 0, shadows: 0
        });
        
        // Apply all active effects that modify light
        const effects = actor.effects || [];
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
              
              console.log(`Party Vision | ${actor.name}: Applying effect "${effect.name}" - ${lightProp} = ${value}`);
              
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
              }
            }
          }
        }
        
        if (hasEffectLight && (computedLight.bright > 0 || computedLight.dim > 0)) {
          effectiveLight = computedLight;
          console.log(`Party Vision | ${actor.name}: ✓ Using prototype + manual effect application (bright=${effectiveLight.bright}, dim=${effectiveLight.dim})`);
        }
      } catch (e) {
        console.log(`Party Vision | ${actor.name}: Manual effect application failed:`, e.message);
      }
    }
    
    // STRATEGY 3: Check for system-specific light-emitting items (PF2e torches, etc.)
    if (!effectiveLight) {
      try {
        // Look for equipped items that emit light
        const items = actor.items || [];
        for (const item of items) {
          // Check if item is equipped and has light data
          const isEquipped = item.system?.equipped || item.system?.equipped?.value || 
                           item.system?.equipped?.invested || item.system?.equipped?.handsHeld > 0;
          
          if (isEquipped && item.system?.light) {
            const itemLight = item.system.light;
            if (itemLight.bright > 0 || itemLight.dim > 0) {
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
              console.log(`Party Vision | ${actor.name}: ✓ Found equipped light-emitting item "${item.name}" (bright=${effectiveLight.bright}, dim=${effectiveLight.dim})`);
              break; // Use first light-emitting item found
            }
          }
        }
      } catch (e) {
        console.log(`Party Vision | ${actor.name}: Item light check failed:`, e.message);
      }
    }
    
    // STRATEGY 4: Fall back to prototype token (base case)
    if (!effectiveLight) {
      effectiveLight = actor.prototypeToken?.light;
      if (effectiveLight && (effectiveLight.bright > 0 || effectiveLight.dim > 0)) {
        console.log(`Party Vision | ${actor.name}: Using prototype token light (bright=${effectiveLight.bright}, dim=${effectiveLight.dim})`);
      }
    }
    
    // Check if this actor has any meaningful light
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
    } else {
      console.log(`Party Vision | ${actor.name}: No light detected`);
    }
  }
  
  // Aggregate lighting
  const aggregatedLight = aggregateLights(lights);
  
  // Update party token lighting with error handling
  try {
    await partyToken.document.update({ light: aggregatedLight });
    
    if (aggregatedLight.bright > 0 || aggregatedLight.dim > 0) {
      console.log(`Party Vision | ✅ Party token lighting updated: bright=${aggregatedLight.bright}, dim=${aggregatedLight.dim}`);
    } else {
      console.log(`Party Vision | ✅ Party token lighting cleared (no light sources)`);
    }
  } catch (error) {
    console.error(`Party Vision | ❌ Failed to update party token lighting:`, error);
    ui.notifications.warn("Party Vision: Failed to update party token lighting. See console for details.");
  }
}

/**
 * Aggregate lights from all member tokens and apply to party token
 * @param {Token} partyToken - The party token to update
 */
async function updatePartyLighting(partyToken) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  if (!memberData) return;
  
  const lights = [];
  
  // Collect light data from all members
  for (const member of memberData) {
    const actor = game.actors.get(member.actorId);
    if (!actor) continue;
    
    // Check for active tokens of this actor on the scene
    // Exclude ALL party tokens, not just the current one
    const memberTokens = canvas.tokens.placeables.filter(t => 
      t.actor?.id === member.actorId && 
      !t.document.getFlag('party-vision', 'memberData') // Exclude ALL party tokens
    );
    
    // If member has active tokens, use their light
    for (const token of memberTokens) {
      if (token.document.light && (token.document.light.bright > 0 || token.document.light.dim > 0)) {
        lights.push({
          actorName: actor.name, // Add actorName for logging
          bright: token.document.light.bright || 0,
          dim: token.document.light.dim || 0,
          angle: token.document.light.angle || 360,
          color: token.document.light.color,
          alpha: token.document.light.alpha || 0.5,
          animation: token.document.light.animation || {},
          coloration: token.document.light.coloration || 1,
          luminosity: token.document.light.luminosity || 0.5,
          attenuation: token.document.light.attenuation || 0.5,
          contrast: token.document.light.contrast || 0,
          saturation: token.document.light.saturation || 0,
          shadows: token.document.light.shadows || 0
        });
      }
    }
  }
  
  // Aggregate lighting
  const aggregatedLight = aggregateLights(lights);
  
  // Update party token lighting with error handling
  try {
    await partyToken.document.update({ light: aggregatedLight });
    console.log(`Party Vision | Updated party token lighting: bright=${aggregatedLight.bright}, dim=${aggregatedLight.dim}`);
  } catch (error) {
    console.error(`Party Vision | ❌ Failed to update party token lighting:`, error);
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
  // Could be enhanced to blend colors, etc., but this is a good start
  return brightestLight;
}

// ==============================================
// HELPER: DEPLOY PARTY FUNCTION
// ==============================================

/**
 * Deploys the party token, spawning individual member tokens
 * @param {Token} partyToken - The party token to deploy
 * @param {number} radians - Direction to face (in radians)
 * @param {boolean} fromCombat - Whether deployment is triggered by combat (skips some checks)
 * @returns {Promise<void>}
 */
async function deployParty(partyToken, radians, fromCombat = false) {
  const memberData = partyToken.document.getFlag('party-vision', 'memberData');
  const gridSize = canvas.grid.size;
  const assignedGridSpots = new Set();
  
  // Get the original facing direction (default is North = -π/2)
  const lastFacing = partyToken.document.getFlag('party-vision', 'lastFacing') || (-Math.PI / 2);
  
  // Calculate the rotation needed: target direction - original direction
  // Negate to get correct clockwise rotation in Foundry's coordinate system
  const rotationAngle = -(radians - lastFacing);
  
  const cos = Math.cos(rotationAngle);
  const sin = Math.sin(rotationAngle);
  const newTokensData = [];
  const finalPositions = []; // Store final positions for animation
  
  // Sort by distance from center
  const sortedMembers = [...memberData].sort((a, b) => 
    (Math.abs(a.dx) + Math.abs(a.dy)) - (Math.abs(b.dx) + Math.abs(b.dy))
  );
  
  for (const member of sortedMembers) {
    // Get actor - try UUID first, then ID for robust resolution
    let actor;
    if (member.actorUuid) {
      try {
        actor = await fromUuid(member.actorUuid);
      } catch (e) {
        console.warn(`Party Vision: Could not resolve actor UUID ${member.actorUuid}`, e);
      }
    }
    
    if (!actor) {
      actor = game.actors.get(member.actorId);
    }
    
    if (!actor) {
      console.warn(`Party Vision: Actor not found for member ${member.name || member.actorId}`);
      continue;
    }
    
    const dx = member.dx;
    const dy = member.dy;
    const rotatedX = Math.round(dx * cos - dy * sin);
    const rotatedY = Math.round(dx * sin + dy * cos);
    
    const partyGridX = partyToken.x / gridSize;
    const partyGridY = partyToken.y / gridSize;
    const idealGridX = Math.round(partyGridX + rotatedX);
    const idealGridY = Math.round(partyGridY + rotatedY);
    
    // Get fresh token data from actor's prototype
    const protoToken = actor.prototypeToken;
    const tokenData = protoToken.toObject();
    
    const validSpot = findValidSpot(idealGridX, idealGridY, tokenData, assignedGridSpots);
    assignedGridSpots.add(`${validSpot.x},${validSpot.y}`);
    
    const finalX = validSpot.x * gridSize;
    const finalY = validSpot.y * gridSize;
    
    // Check if animation is enabled
    const shouldAnimate = game.settings.get('party-vision', 'animateDeployment');
    
    // CRITICAL: Create clean token data for proper actor linking
    const newToken = {
      ...tokenData,
      x: shouldAnimate ? partyToken.x : finalX,  // Start at party location if animating
      y: shouldAnimate ? partyToken.y : finalY,
      actorId: actor.id,
      actorLink: protoToken.actorLink,
      // Ensure actor data is preserved
      name: protoToken.name || actor.name,
      img: protoToken.texture?.src || actor.img
    };
    
    // CRITICAL: Remove synthetic actor data that can break PF2e linking
    delete newToken.actorData;
    delete newToken.delta;
    
    newTokensData.push(newToken);
    
    // Store final position for animation
    if (shouldAnimate) {
      finalPositions.push({ x: finalX, y: finalY });
    }
  }
  
  // Create tokens
  const createdTokens = await canvas.scene.createEmbeddedDocuments("Token", newTokensData);
  
  // Animate if enabled
  if (game.settings.get('party-vision', 'animateDeployment')) {
    const animationSpeed = game.settings.get('party-vision', 'deploymentAnimationSpeed');
    const animations = [];
    
    for (let i = 0; i < createdTokens.length; i++) {
      const tokenDoc = createdTokens[i];
      const token = canvas.tokens.get(tokenDoc.id);
      const finalPos = finalPositions[i];
      
      if (token && finalPos) {
        // Animate token to final position
        animations.push(
          token.document.update({ x: finalPos.x, y: finalPos.y }, { animate: true, animation: { duration: animationSpeed } })
        );
      }
    }
    
    // Wait for all animations to complete
    await Promise.all(animations);
    
    // Small delay to ensure animations are visible
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Delete party token
  await canvas.scene.deleteEmbeddedDocuments("Token", [partyToken.id]);
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
  
  console.warn(`Party Vision | No valid spot found near (${idealX}, ${idealY})`);
  return { x: idealX, y: idealY };
}

/**
 * Checks if a grid position is valid for token placement
 * @param {number} gridX - Grid X coordinate to check
 * @param {number} gridY - Grid Y coordinate to check
 * @param {Object} tokenData - Token data object
 * @param {Set} assignedSpots - Set of already assigned grid positions
 * @returns {boolean} True if the spot is valid
 */
function isSpotValid(gridX, gridY, tokenData, assignedSpots) {
  const gridSize = canvas.grid.size;
  const finalX = gridX * gridSize;
  const finalY = gridY * gridSize;
  
  if (assignedSpots.has(`${gridX},${gridY}`)) return false;
  
  const tokenWidth = tokenData.width * gridSize;
  const tokenHeight = tokenData.height * gridSize;
  const centerX = finalX + (tokenWidth / 2);
  const centerY = finalY + (tokenHeight / 2);
  
  // Check for wall collisions using v13 API
  // Test multiple points around the token to ensure it doesn't pass through walls
  const testPoints = [
    { x: centerX, y: centerY },                                                         // Center
    { x: finalX + WALL_COLLISION_TEST_OFFSET, y: finalY + WALL_COLLISION_TEST_OFFSET },                     // Top-left corner
    { x: finalX + tokenWidth - WALL_COLLISION_TEST_OFFSET, y: finalY + WALL_COLLISION_TEST_OFFSET },        // Top-right corner
    { x: finalX + WALL_COLLISION_TEST_OFFSET, y: finalY + tokenHeight - WALL_COLLISION_TEST_OFFSET },       // Bottom-left corner
    { x: finalX + tokenWidth - WALL_COLLISION_TEST_OFFSET, y: finalY + tokenHeight - WALL_COLLISION_TEST_OFFSET } // Bottom-right corner
  ];
  
  for (const point of testPoints) {
    // Check if any point collides with a movement-blocking wall
    const collision = canvas.walls.checkCollision(
      new Ray({ x: point.x - 1, y: point.y - 1 }, { x: point.x + 1, y: point.y + 1 }),
      { type: "move", mode: "any" }
    );
    
    if (collision) {
      return false; // Wall blocks this position
    }
  }
  
  // Check for existing token overlaps
  for (const token of canvas.tokens.placeables) {
    const tokenRect = {
      x: token.x, 
      y: token.y,
      width: token.document.width * gridSize, 
      height: token.document.height * gridSize
    };
    const newRect = {
      x: finalX, 
      y: finalY,
      width: tokenWidth, 
      height: tokenHeight
    };
    
    if (tokenRect.x < newRect.x + newRect.width &&
        tokenRect.x + tokenRect.width > newRect.x &&
        tokenRect.y < newRect.y + newRect.height &&
        tokenRect.y + tokenRect.height > newRect.y) {
      return false;
    }
  }
  
  return true;
}

// Export for use by macros
window.PartyVision = {
  deployParty,
  updatePartyLighting,
  updatePartyLightingFromActors,
  FORMATION_PRESETS,
  
  /**
   * Manually refresh lighting for all party tokens on the scene
   * Useful for debugging or if automatic updates aren't working
   */
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
