// ==============================================
// PARTY VISION MODULE - MAIN SCRIPT
// ==============================================

import { FORMATION_PRESETS } from './formations.js';

// Global state for follow-the-leader mode
let followLeaderMode = false;
let leaderToken = null;
let followerOffsets = new Map();

// ==============================================
// INITIALIZATION
// ==============================================

Hooks.once('init', () => {
  console.log('Party Vision | Initializing Enhanced Module v2.0');

  // Check for libWrapper dependency
  if (!game.modules.get('lib-wrapper')?.active) {
    ui.notifications.error("Party Vision requires 'lib-wrapper' module to be active!");
    return;
  }

  // --- REGISTER MODULE SETTINGS ---
  
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

  // --- REGISTER VISION HOOK (FIX: detectionModes from prototypeToken) ---
  
  libWrapper.register('party-vision', 'Token.prototype.updateVisionSource', function(wrapped, ...args) {
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

  // --- REGISTER DOUBLE-CLICK HOOK ---
  
  libWrapper.register('party-vision', 'Token.prototype._onDoubleLeft', function(wrapped, event) {
    const partyToken = this;
    const memberData = partyToken.document.getFlag("party-vision", "memberData");
    
    if (!memberData) return wrapped(event);
    if (game.user.isGM) return wrapped(event);
    
    // Open sheets for owned characters
    const actorsToOpen = [];
    for (const member of memberData) {
      const actor = game.actors.get(member.actorId);
      if (actor && actor.isOwner) actorsToOpen.push(actor);
    }
    
    for (const actor of actorsToOpen) {
      actor.sheet.render(true);
    }
  }, 'MIXED');
});

// ==============================================
// READY HOOK - Post-initialization setup
// ==============================================

Hooks.once('ready', () => {
  console.log('Party Vision | Module Ready');
});

// ==============================================
// TOKEN HUD INTEGRATION
// ==============================================

Hooks.on('renderTokenHUD', (app, html, data) => {
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
      const pack = game.packs.get("party-vision.macros");
      if (pack) {
        const docs = await pack.getDocuments();
        macro = docs.find(m => m.name === "Form Party");
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
      const pack = game.packs.get("party-vision.macros");
      if (pack) {
        const docs = await pack.getDocuments();
        macro = docs.find(m => m.name === "Deploy Party");
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
  }
  
  // Add "Add to Party" for regular tokens near party tokens
  if (!memberData) {
    const nearbyPartyToken = canvas.tokens.placeables.find(t => {
      const dist = Math.hypot(t.x - token.x, t.y - token.y);
      return t.document.getFlag('party-vision', 'memberData') && dist < canvas.grid.size * 3;
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
// VISUAL INDICATORS
// ==============================================

Hooks.on('refreshToken', (token) => {
  const memberData = token.document.getFlag('party-vision', 'memberData');
  if (!memberData) return;
  
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

function renderMemberPortraits(token, memberData) {
  const container = new PIXI.Container();
  container.name = 'party-vision-overlay';
  
  const portraitSize = 32;
  const spacing = 36;
  const members = memberData.slice(0, 8); // Max 8 portraits
  
  members.forEach((member, index) => {
    const actor = game.actors.get(member.actorId);
    if (!actor) return;
    
    const angle = (index / members.length) * Math.PI * 2;
    const radius = token.w * 0.6;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    const sprite = PIXI.Sprite.from(actor.img);
    sprite.width = portraitSize;
    sprite.height = portraitSize;
    sprite.anchor.set(0.5);
    sprite.x = token.w / 2 + x;
    sprite.y = token.h / 2 + y;
    
    // Add circular mask
    const mask = new PIXI.Graphics();
    mask.beginFill(0xFFFFFF);
    mask.drawCircle(sprite.x, sprite.y, portraitSize / 2);
    mask.endFill();
    container.addChild(mask);
    sprite.mask = mask;
    
    // Add border
    const border = new PIXI.Graphics();
    border.lineStyle(2, 0xFFFFFF, 0.8);
    border.drawCircle(sprite.x, sprite.y, portraitSize / 2);
    
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
// GHOSTED PREVIEW ON HOVER
// ==============================================

// ==============================================
// AUTO-DEPLOY ON COMBAT START
// ==============================================

Hooks.on('combatStart', async (combat, updateData) => {
  if (!game.settings.get('party-vision', 'autoDeployOnCombat')) return;
  if (!game.user.isGM) return;
  
  // Find party tokens on the current scene
  const partyTokens = canvas.tokens.placeables.filter(t => 
    t.document.getFlag('party-vision', 'memberData')
  );
  
  if (partyTokens.length === 0) return;
  
  ui.notifications.info(`Auto-deploying ${partyTokens.length} party token(s) for combat...`);
  
  for (const partyToken of partyTokens) {
    const lastFacing = partyToken.document.getFlag('party-vision', 'lastFacing') || (-Math.PI / 2);
    await deployParty(partyToken, lastFacing);
  }
});

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
    y: partyToken.y
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
// HELPER: DEPLOY PARTY FUNCTION
// ==============================================

async function deployParty(partyToken, radians) {
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
  
  // Sort by distance from center
  memberData.sort((a, b) => (Math.abs(a.dx) + Math.abs(a.dy)) - (Math.abs(b.dx) + Math.abs(b.dy)));
  
  for (const member of memberData) {
    const actor = game.actors.get(member.actorId);
    if (!actor) continue;
    
    const dx = member.dx;
    const dy = member.dy;
    const rotatedX = Math.round(dx * cos - dy * sin);
    const rotatedY = Math.round(dx * sin + dy * cos);
    
    const partyGridX = partyToken.x / gridSize;
    const partyGridY = partyToken.y / gridSize;
    const idealGridX = Math.round(partyGridX + rotatedX);
    const idealGridY = Math.round(partyGridY + rotatedY);
    
    const tokenData = actor.prototypeToken.toObject();
    const validSpot = findValidSpot(idealGridX, idealGridY, tokenData, assignedGridSpots);
    assignedGridSpots.add(`${validSpot.x},${validSpot.y}`);
    
    const finalX = validSpot.x * gridSize;
    const finalY = validSpot.y * gridSize;
    
    newTokensData.push(foundry.utils.mergeObject(tokenData, {
      x: finalX,
      y: finalY,
      actorId: actor.id,  // Explicitly set actor ID
      actorLink: actor.prototypeToken.actorLink  // Preserve actor link setting
    }));
  }
  
  await canvas.scene.createEmbeddedDocuments("Token", newTokensData);
  await canvas.scene.deleteEmbeddedDocuments("Token", [partyToken.id]);
}

function findValidSpot(idealX, idealY, tokenData, assignedSpots) {
  if (isSpotValid(idealX, idealY, tokenData, assignedSpots)) {
    return { x: idealX, y: idealY };
  }
  
  // Spiral search
  for (let r = 1; r < 20; r++) {
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
    { x: centerX, y: centerY },                           // Center
    { x: finalX + 5, y: finalY + 5 },                     // Top-left corner
    { x: finalX + tokenWidth - 5, y: finalY + 5 },        // Top-right corner
    { x: finalX + 5, y: finalY + tokenHeight - 5 },       // Bottom-left corner
    { x: finalX + tokenWidth - 5, y: finalY + tokenHeight - 5 } // Bottom-right corner
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
  FORMATION_PRESETS
};
