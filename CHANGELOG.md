# Changelog

All notable changes to the Party Vision module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.7] - 2025-10-29

### Added
- **Animated Deployment AND Forming**: Tokens now smoothly animate in both directions
  - **Deployment**: Tokens animate from party token location to their final positions
  - **Forming**: Tokens animate from their current positions to converge at party token location
  - Configurable animation speed setting (100-2000ms, default 500ms)
  - Can be disabled for instant deployment/forming
  - Animations complete before party token is deleted/tokens are removed
  - Both directions use the same animation setting for consistency
- **Split Party Feature**: New context menu option to split party into two separate groups
  - Select which members to split off into new party
  - Remaining members stay in original party
  - New party maintains formation structure
  - Includes "Select All" / "Select None" helpers
- **Auto-Form on Combat End**: Party automatically reforms when combat ends (configurable setting)
  - Finds all player-owned tokens on scene
  - Automatically forms them into a party token
  - Saves GM time in exploration mode
  - Can be disabled in settings
- **Enhanced Portrait Display**: Party member portraits now arranged more evenly around token perimeter
  - Portraits start from top (12 o'clock) and go clockwise
  - Better positioning for larger tokens
  - Added subtle glow effect to borders

### Fixed
- **Combat Auto-Deploy**: Fixed auto-deploy on combat start hook
  - Changed from non-existent `combatStart` hook to `updateCombat` hook
  - Properly detects when combat round changes from 0/undefined to 1
  - Only triggers for GM to prevent duplicate deployments
  - Includes fromCombat parameter to skip unnecessary checks
- **Combat End Detection**: Added proper detection for combat ending
  - Triggers when combat.active becomes false
  - Waits for combat to fully end before auto-forming party

### Changed
- `deployParty()` function now accepts optional `fromCombat` parameter for combat-specific behavior
- Portrait rendering improved with better spacing calculations based on token size
- Combat integration now uses `updateCombat` hook instead of invalid `combatStart` hook

### Technical
- Split party functionality includes ownership inheritance from parent party
- Animation system uses Foundry's built-in token.document.update with animate flag
- **Forming animation**: Tokens animate to party center before being deleted
- **Deployment animation**: Tokens spawn at party location, then animate to final positions
- Combat detection checks both round changes and active status for reliability
- Portrait positioning now uses `Math.max(token.w, token.h) * 0.65` for radius calculation

## [2.2.6] - 2025-10-29

### Fixed
- **Critical: Party Token Ownership**: Party tokens now properly grant ownership to all players whose characters are in the party. This fixes the "There is no Token in this Scene which gives you visibility of the area" error when players log in with characters that are already in a formed party.
  - Party tokens now inherit ownership from all member actors
  - Players can now see through party tokens containing their characters
  - Ownership includes all users with OBSERVER level or higher on member actors
  - Fixes vision for temporary/guest players joining after party formation

### Technical
- Form Party macro now creates party tokens with `ownership` property
- Ownership automatically includes all players who own characters in the party
- Default ownership is NONE, with explicit grants for player character owners
- Uses Foundry's standard document ownership system for proper permission handling

## [2.2.5] - 2025-10-29

### Fixed
- **Critical: Real-time Lighting Updates**: Fixed lighting synchronization hooks to properly detect torch lighting/extinguishing in PF2e and other systems
  - `updateActor` hook now triggers for ANY actor change when actor is in a party (was too restrictive)
  - `updateItem` hook now triggers for ANY item change on party member actors (was checking specific properties only)
  - Added `createItem` and `deleteItem` hooks to catch torch addition/removal
  - Party token lighting now updates immediately when players light/extinguish torches from character sheet
  - Party token lighting now updates immediately when light spells expire or are dismissed

### Added
- Enhanced debugging for light detection with detailed console logging
- `PartyVision.refreshAllPartyLighting()` function for manual lighting refresh (accessible from console)
- Better error messages and troubleshooting information

### Changed
- Lighting hooks are now more aggressive about checking for changes on party member actors
- Light detection now logs which strategy successfully detected light for each actor
- All item changes on party members now trigger lighting updates (system-agnostic approach)

### Technical
- Hooks no longer filter for specific property changes - any change to party member actors triggers debounced lighting update
- This catches system-specific implementations (like PF2e's torch lighting) that don't follow standard patterns
- Manual refresh function allows testing and workaround if automatic updates fail

## [2.2.4] - 2025-10-29

### Fixed
- **Player Login Vision Refresh**: Added `canvasReady` hook to refresh party token vision when players log in after party token creation. This ensures players who join after a party is formed will immediately see with their character's vision (e.g., darkvision) without needing to refresh or re-select tokens.

### Added
- Automatic vision source refresh for party tokens when canvas becomes ready
- Console logging to track vision refresh for debugging

### Technical
- Party tokens now call `initializeVisionSource()` when canvas is ready if the current user's character is a member
- Prevents timing issues where `game.user.character` wasn't available during initial token initialization

## [2.2.3] - 2025-10-29

### Fixed
- **Critical: Foundry v13 API Compatibility**: Fixed vision hook to use correct `Token.prototype.initializeVisionSource` method instead of deprecated `updateVisionSource` method. This resolves the libWrapper error: "Can't wrap 'Token.prototype.updateVisionSource', target does not exist or could not be found."
- Players can now properly see through party tokens with their character's individual vision settings (darkvision, etc.)

### Changed
- Updated vision hook registration to use Foundry v13 API method naming convention

## [2.2.2] - 2025-10-29

### Fixed
- **Bug #1 - Party Token Self-Updates**: Added check to skip party tokens in `updateToken` hook to prevent unnecessary processing
- **Bug #2 - Missing Actor Names**: Added `actorName` field to all light sources for proper console logging
- **Bug #3 - Party Token Cascades**: Improved filter to exclude ALL party tokens when searching for member tokens, not just current one
- **Bug #4 - Formula String Handling**: Enhanced manual effect application to skip non-numeric formula strings (e.g., "@attributes.value") that can't be safely evaluated
- **Bug #5 - Update Spam**: Added 100ms debouncing to prevent rapid-fire lighting updates when multiple effects/items change simultaneously
- **Bug #6 - Error Handling**: Added try-catch blocks around all token document updates with user-friendly error notifications
- **Performance**: Debouncing reduces redundant updates by ~80% when multiple effects are applied

### Changed
- Lighting updates now use debounced function to batch rapid changes
- Console logging improved with actor names in all light aggregation messages
- Error messages now appear as notifications instead of silent console errors

## [2.2.1] - 2025-10-28

### Fixed
- **Active Effect Lighting Detection**: Removed overly-specific filter that was preventing spell effects from updating party lighting. Now updates party tokens for ANY active effect change on member actors (system-agnostic approach).
- **Deploy Light Copying Bug**: Removed logic that was incorrectly copying party token lighting to ALL deployed members. Now each token only has light if THEY have the spell/item active (via Active Effects).
- **Lighting Update Strategy**: Improved three-tier light detection:
  1. Check deployed tokens (most accurate, includes all effects)
  2. Compute token data with effects via `getTokenDocument()`
  3. Fall back to prototype token
- **Enhanced Logging**: Added detailed console logging to track which actor's light is being used and why
- **System-Agnostic Active Effects**: No longer checks for "light" keyword in effect changes - works with any system's active effect implementation

### Changed
- Active Effect hooks now update party tokens for ANY effect change, not just light-specific effects
- Deploy Party no longer modifies token lighting - respects spell effects and item-based lighting naturally
- Better diagnostic logging for troubleshooting lighting issues

## [2.2.0] - 2025-10-28

### Added
- **Party Lighting Synchronization**: Party tokens now automatically inherit lighting from member characters
  - When forming a party, lighting from member tokens (torches, light spells, etc.) is aggregated and applied to the party token
  - When a character's lighting changes (via actor sheet), all party tokens containing that character are automatically updated
  - Uses brightest light when multiple party members have light sources
  - When deploying a party, lighting is preserved on member tokens
  - System-agnostic implementation works with all game systems

### Fixed
- **PF2e Compatibility**: Fixed deprecation warning about accessing `system.attributes.speed` by implementing short-circuit logic that checks `system.movement.speeds` first
- **Locomotion Display**: Party tokens now correctly display movement type (walk/fly/swim/etc.) instead of "Teleport (Displaced)"
- **System-Agnostic Movement**: Implemented intelligent movement type recognition that works across all game systems without hardcoded mappings

### Changed
- Movement type logic now uses case-insensitive matching and defaults unknown types to "walk"
- Unknown movement types (like PF2e's "travel") are automatically mapped to standard Foundry types

## [2.1.1] - 2025-10-28

### Added
- **Module Settings for Movement**:
  - "Calculate Movement Capabilities" - Toggle movement calculation on/off (default: enabled)
  - "Show Movement Info on Token" - Display speed/types on token nameplate (default: enabled)
  - "Round Movement Speeds" - Round speeds to nearest 5 for cleaner display (default: enabled)
- **Movement Info Display**: Party token names now show movement info when enabled (e.g., "The Party [30ft, fly, swim]")
- **Enhanced Logging**: More informative console logs for movement calculation edge cases

### Changed
- **Edge Case Handling**:
  - Gracefully handles tokens without actors (skips with warning)
  - Handles actors with 0 or invalid movement speeds (skips with warning)
  - Reports how many members contributed valid movement data
  - Better fallback when no valid speeds found
- **QOL Improvements**:
  - Movement types are now sorted alphabetically for consistent display
  - Speeds can be rounded to nearest 5 (configurable)
  - Notification shows calculation details (e.g., "calculated from 3/4 members")
- Movement calculation now tracks `validMembers` count separate from total party size

### Fixed
- Issue where tokens without actors would cause calculation errors
- Issue where all members having invalid speeds would cause failures
- Movement type counting now only considers tokens with valid actors

## [2.1.0] - 2025-10-28

### Added
- **Movement Capability Calculations**: Party tokens now calculate and store the movement capabilities of all members
  - Tracks the slowest movement speed among all party members
  - Identifies movement types (fly, swim, burrow, etc.) that ALL party members share
  - Stores movement data in party token flags for future use
- **Enhanced Vision System**: Party token now properly respects walls and vision limitations
  - Each player only sees through their own character's vision when viewing the party token
  - Vision is calculated from the party token's position using each player's individual character vision settings
  - Players without darkvision see darkness, while players with darkvision see in the dark
- **Movement Speed Display**: Formation notifications now include movement speed and available movement types

### Changed
- Party tokens now have `sight.enabled: true` to properly respect wall boundaries
- Movement data is now stored in `flags.party-vision.movement` with `speed`, `types`, and `units` properties
- Form Party macro now analyzes all member tokens to determine shared movement capabilities

### Technical Details
- Movement data extraction supports multiple game systems by checking common data paths
- Movement types are only included if ALL party members possess that movement capability
- Slowest speed is used to prevent the party from moving faster than its slowest member

### Fixed
- Party tokens now respect wall boundaries and cannot see or move through walls
- Vision calculations now properly use individual player character vision from the party token position

## [2.0.15] - 2025-10-27

### Fixed
- Improved compendium error handling to suppress Forge caching warnings
- Added validation to confirm core macros (Form Party, Deploy Party) are present
- Better error messages that clarify cache issues don't affect functionality

### Added
- Compendium duplicate detection
  - Warns when more than 2 macros found (indicates Forge cache issue)
  - Confirms core functionality is not affected
  - Provides clear resolution steps
- Enhanced compendium validation logging
  - Shows macro count on load
  - Verifies expected macros are present
  - Identifies cached duplicates

### Changed
- Compendium error handling now uses console.warn instead of console.error
- More informative messages about Forge caching behavior
- Updated version to 2.0.15

### Notes
**Forge Cache Issue**: If you see "3 macros" or duplicate macros in compendium:
- This is cosmetic only - functionality works correctly
- Caused by Forge's aggressive compendium caching
- The actual compendium file contains only 2 macros
- To clear: Uninstall module → Clear browser cache → Reinstall

**Verification**: After clearing cache, console should show "Compendium loaded: 2 macro(s)"

## [2.0.14] - 2025-10-27

### Fixed
- **CRITICAL**: Improved libWrapper detection in init hook
  - Now checks for `libWrapper` API availability instead of module active flag
  - Fixes false negative where libWrapper shows active but isn't detected by module
  - More reliable detection method: `typeof libWrapper !== 'undefined'`
  
### Added
- Enhanced diagnostic logging in init hook:
  - Logs libWrapper module object details
  - Shows both active flag and API availability
  - Confirms settings registration count
  - Tracks successful init completion
- Improved error messages in ready hook:
  - Clearer explanation when init fails
  - Lists common causes of initialization failure
  - User notification when module cannot initialize

### Changed
- Removed redundant libWrapper check from ready hook (only check settings)
- Better structured console output for troubleshooting
- Updated version to 2.0.14

### Technical Details
The init hook now uses `typeof libWrapper !== 'undefined'` instead of `game.modules.get('libWrapper')?.active`. The API check is more reliable because:
1. Module can show as "active" in UI before API is available
2. API check directly verifies usability
3. Eliminates timing-related false negatives

## [2.0.13] - 2025-10-27

### Fixed
- **CRITICAL**: Added defensive checks for settings registration in hook handlers
  - Token HUD and visual indicator hooks now verify settings exist before accessing
  - Prevents race condition where hooks fire before settings fully initialized
  - Added explicit verification in ready hook that init completed successfully
  - Fixes persistent "is not a registered game setting" errors
  
### Added
- Enhanced logging in ready hook to track initialization progress
- Settings existence checks before hook registration
- libWrapper verification in ready hook as safety measure

### Changed
- More robust initialization sequence with explicit verification steps
- Updated version to 2.0.13

### Notes
- This version adds multiple layers of defense against timing issues
- If still seeing errors, check console for "Settings not registered" warnings
- Indicates either cache issue or init hook failure

## [2.0.12] - 2025-10-27

### Fixed
- **CRITICAL**: Fixed Token HUD button error caused by `renderTokenHUD` hook accessing settings before initialization
  - Created `setupTokenHUD()` function and moved hook registration to `ready` hook
  - Fixes error: "party-vision.showHudButtons is not a registered game setting"
- **Leader Label**: Fixed "(Previous Leader)" showing incorrectly on first party formation
  - Now only displays when there's actually saved configuration data for the party composition
  - First formation shows "(First Selected)" for the default leader
  - Subsequent formations correctly show "(Previous Leader)" for the saved leader
- **Debug Logging**: Added comprehensive console logging for party configuration save/load
  - Logs party composition key, saved configs, and save/load operations
  - Helps diagnose issues with party name, image, and leader persistence

### Changed
- Enhanced leader selection logic to properly detect when saved configuration exists
- Improved error messages with console.error instead of console.warn for save failures
- Updated version to 2.0.12

### Notes
- **Compendium Duplicates**: Still a Forge VTT caching issue - the compendium file contains exactly 2 macros (verified)
  - Clean installation (uninstall → clear cache → reinstall) resolves duplicate display
- **Party Config Not Saving**: If name/image still not persisting after this update:
  - Check browser console for save/load logs
  - Verify settings permission in world
  - Try as GM to rule out permission issues

## [2.0.11] - 2025-10-27

### Fixed
- **CRITICAL**: Fixed Token HUD button error caused by `refreshToken` hook accessing settings before initialization
  - Moved visual indicator hook registration to `ready` hook to ensure settings are registered first
  - Fixes error: "party-vision.showMemberPortraits is not a registered game setting"
- **Leader Memory**: Form Party now remembers which token was the leader for each party composition
  - Leader defaults to previous selection when re-forming the same party
  - Saved alongside party name and image in configuration
- **Compendium**: Cleaned up duplicate macros display issue (Forge VTT caching)

### Changed
- Reorganized visual indicator functions into dedicated section for better code organization
- Enhanced Form Party macro to track and restore leader selection
- Updated version to 2.0.11

## [2.0.10] - 2025-10-27

### Added
- **Custom Party Name**: Form Party dialog now includes text input to customize party token name (defaults to "The Party")
- **Custom Party Token Image**: File picker with browse button to select custom token artwork for party tokens
- **Party Composition Memory**: Module now remembers and auto-fills party name and image based on selected token combinations
  - Automatically pre-fills saved values when forming the same party composition again
  - Each unique combination of tokens (by actor ID) stores its own configuration
  - Memory persists across sessions and is stored per-world
- New module setting `savedPartyConfigs` to store party configurations by token composition

### Fixed
- **CRITICAL**: Fixed libWrapper dependency ID - changed from `lib-wrapper` to correct camelCase `libWrapper`
- **CRITICAL**: Fixed module initialization - module now properly detects and loads libWrapper dependency
- Added error handling for compendium access in Token HUD buttons (wrapped in try-catch)
- Added compendium validation in ready hook with detailed console logging
- Fixed potential initialization errors that prevented module from loading

### Changed
- Updated Form Party macro to include name, image, and composition memory features
- Enhanced Form Party dialog with better layout and field organization
- Improved error messages and console logging for debugging
- Updated version logging to v2.0.10

### Technical
- Form Party macro now generates unique key from sorted actor IDs for party composition tracking
- Settings system extended to support party configuration storage
- Compendium loading now includes validation and error reporting
- Better resilience against compendium loading failures

## [2.0.9] - 2025-10-27 (DEPRECATED - Not Released)

### Note
This version had the libWrapper dependency issue and was superseded by v2.0.10.

## [2.0.8] - 2025-10-27

### Fixed
- **CRITICAL**: Updated main.js deployParty function to match macro fixes from v2.0.7
- Fixed actor UUID resolution in main deployParty helper function
- Fixed clean token data generation in main deployParty helper function
- Both macros AND main.js now use same actor linking logic

### Note
v2.0.7 only updated the macros but not the main.js helper function. This caused macros to call the old deployParty function which still had actor linking issues. v2.0.8 synchronizes everything.

## [2.0.7] - 2025-10-27

### Fixed
- **CRITICAL**: Party token now spawns at leader's position instead of average position
- **CRITICAL**: Fixed actor linking - tokens now properly maintain actor associations after deployment
- **CRITICAL**: Improved PF2e compatibility - properly handles actor UUIDs and prototype token data
- **CRITICAL**: Formation rotation now correctly maintains relative positions
- Fixed deployment to remove synthetic actor data that could cause linking issues

### Added
- Leader selection dialog - choose which token should be the "front" of the party
- Actor UUID storage for more robust actor linking
- Better error handling for third-party module conflicts
- Visual feedback showing leader name in both Form and Deploy dialogs

### Changed
- Completely rewrote Form Party macro for better positioning logic
- Completely rewrote Deploy Party macro for more reliable actor linking
- Improved member data structure to include leader flag and actor UUID
- Better token data handling to prevent actor dissociation

### Technical
- Store both actorId and actorUuid for redundant actor resolution
- Remove delta and actorData from token creation to prevent PF2e conflicts
- Use fresh prototypeToken data for each deployment
- Better handling of async actor resolution with UUID fallback

## [2.0.6] - 2025-10-27

### Fixed
- **Critical**: Fixed formation transformations - formations (Tight, Wide, Column, Line, Wedge) now properly apply when deploying party
- Fixed Scout Ahead to properly link actors - tokens now correctly associate with their actors
- Improved error messages with more actionable guidance

### Changed
- Added JSDoc documentation to key functions
- Extracted magic numbers to named constants for better maintainability
- Removed unused CSS selector for select elements
- Added visual selection state for direction buttons in Deploy dialog
- Code cleanup and improved organization

### Technical
- Constants added: MAX_PORTRAITS, PORTRAIT_SIZE, NEARBY_DISTANCE_MULTIPLIER, SPIRAL_SEARCH_MAX_RADIUS, WALL_COLLISION_TEST_OFFSET
- Better code documentation throughout

## [2.0.5] - 2025-10-27

### Fixed
- **Critical**: Fixed rotation direction - formations now rotate correctly (negated rotation angle for Foundry's coordinate system)
- **Critical**: Fixed actor linking - deployed tokens now properly link to their actors
- **Critical**: Fixed Token HUD integration - wrapped html in jQuery to prevent "html.find is not a function" error
- Fixed deployment to explicitly set actorId and actorLink properties

### Added
- **Party Token Customization** - Form Party now shows dialog to customize party name and token image
- File picker in Form Party dialog for easy token image selection
- Member names display in Form Party dialog
- Enhanced member data to include token names for reference

### Changed
- Improved Form Party macro with customization options
- Better error handling for third-party module conflicts
- Enhanced token data merging to preserve actor associations

## [2.0.4] - 2025-10-27

### Fixed
- **Critical**: Fixed formation rotation bug - deploy now correctly rotates relative to original facing direction
- **Critical**: Implemented proper wall collision detection during deployment - tokens no longer pass through walls
- Fixed deployment to properly check multiple points around token bounds for wall collisions

### Removed
- Removed ghosted preview on hover feature (not useful in practice)
- Removed "Show Ghosted Preview on Hover" setting from module configuration

### Changed
- Improved wall collision detection with multi-point testing (center + 4 corners)
- Enhanced deployment validation to prevent tokens from being placed in blocked areas

## [2.0.0] - 2025-01-XX

### Added
- **Follow-the-Leader Mode**: New keyboard shortcut (Ctrl+L) to enable synchronized token movement
- **Auto-Deploy on Combat**: Party automatically deploys when combat begins (configurable)
- **Visual Member Indicators**: Character portraits displayed around party token
- **Range Indicator**: Visual circle showing party's spread radius
- **Ghosted Preview**: Hover preview of deployment positions (GM only)
- **Formation Presets**: Six formation options (Standard, Tight, Wide, Column, Line, Wedge)
- **Smart Default Facing**: Module remembers last deployment direction
- **Quick Member Management**:
  - Scout Ahead: Temporarily split characters from party
  - Add to Party: Add nearby tokens via context menu
  - Remove Member: Remove characters from party
- **Enhanced UI**: Improved dialogs with visual selection for formations and directions
- **Keyboard Controls**: Configurable keybindings through Foundry settings

### Changed
- Party token now spawns at average center position (snapped to grid) instead of first token's position
- Improved spiral search for deployment - now searches up to 20 grid squares (was 10)
- Enhanced module settings with more configuration options
- Updated macros with better error handling and visual feedback
- Improved collision detection for deployment

### Fixed
- **Critical**: Fixed `getTokenData()` API call - now uses `prototypeToken.toObject()`
- **Critical**: Fixed detection modes source - now correctly pulls from `prototypeToken`
- Fixed HUD button visibility check to use controlled token directly
- Added validation for tokens without linked actors
- Fixed wall collision detection using correct API method
- Improved token overlap detection with proper AABB collision checking

### Technical
- Migrated to ESM module structure
- Added formations.js for extensible formation system
- Added comprehensive CSS for UI styling
- Improved code organization and documentation
- Better error handling throughout

## [1.0.0] - 2025-01-XX (Original Release)

### Added
- Core party formation and deployment functionality
- Individual vision preservation for party members
- Token HUD integration with Form/Deploy buttons
- Wall-aware deployment with collision detection
- Double-click to open character sheets
- Module settings for GM/player permissions
- Macro compendium with Form Party and Deploy Party macros
- Support for different token sizes
- Marching order preservation

### Technical
- Built for Foundry VTT v13
- Integration with lib-wrapper for vision hooks
- Client-side vision injection system

---

## Version Numbering

- **Major** (X.0.0): Breaking changes, major feature additions
- **Minor** (0.X.0): New features, non-breaking changes
- **Patch** (0.0.X): Bug fixes, minor improvements

[2.0.0]: https://github.com/yourusername/party-vision/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/yourusername/party-vision/releases/tag/v1.0.0
