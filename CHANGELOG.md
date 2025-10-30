# Changelog

All notable changes to the Party Vision module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.4] - 2025-10-30

### Changed
- **Formation Naming**: Renamed "Standard" formation to "Custom" formation
  - More accurately reflects that this formation preserves your custom token positioning
  - Updated in formation presets, Form Party macro, and settings hints
  - Affects formation dropdown in Form Party dialog

### Improved
- **Auto-Deploy on Combat**: Now shows direction selection dialog instead of silent deployment
  - When combat starts with Auto-Deploy enabled, a dialog appears to choose facing direction
  - Select North, South, East, or West before deploying party members
  - Provides better control over tactical positioning at combat start
  - North is pre-selected as default direction
  - Dialog matches the manual Deploy Party interface

### Technical Details
- Added `showDeployDialog()` helper function to display direction selection
- Updated `updateCombat` hook to call `showDeployDialog()` instead of direct deployment
- Formation preset key changed from `standard` to `custom` throughout codebase
- Direction selection uses same radians conversion as manual deploy

## [2.3.3] - 2025-10-30

### Added
- **Token HUD Movement Type Filtering**: Party tokens now only show movement types that ALL party members share
  - If all characters can fly, fly appears as an option
  - If only some can fly, fly is excluded from party token movement options
  - Prevents invalid movement by restricting to common capabilities
  - Integrates with existing movement calculation system
  - Properly filters Teleport, Travel, Stride, Leap, Climb, Swim, Fly options

- **Combat Tracker Integration**: Party tokens can now add all members to combat with one click
  - Click the combat toggle button in Token HUD on a party token
  - All party members are automatically added to the combat tracker
  - Prevents duplicates if members are already in combat
  - Works seamlessly with Foundry v13 combat system

### Improved
- **Form Party Dialog Width**: Dialog is now wider and more responsive
  - Increased from 400px minimum to 550px minimum width
  - Added maximum width of 700px with responsive sizing
  - Dropdown text now fits properly without truncation
  - Image file path input is much larger (minimum 250px)
  - Better handling of long character names in dropdowns

- **Last Formation Memory**: Formation dropdown now properly remembers last selection
  - If you used "Standard" (custom) formation, it shows as default next time
  - If you used a preset (Line, Column, etc.), that preset is default next time
  - Adds "(Last Used)" indicator to the previously selected formation
  - No longer creates duplicate "Last Used" option in dropdown
  - Works for both custom/standard and preset formations

### Fixed
- **Formation Dropdown Logic**: Corrected how last formation is displayed
  - Removed confusing "Last Used: Standard" separate option
  - Now properly selects and marks the last formation in the main list
  - Standard formation correctly shown as last used when appropriate

### Technical Details
- Added `libWrapper` hook for `TokenHUD.prototype._getLocomotionTypes` to filter movement options
- Added `libWrapper` hook for `Token.prototype._onToggleCombat` to handle party combat addition
- Updated libWrapper hook count from 1 to 3 in initialization logging
- CSS updates for responsive dialog width and better input sizing
- Formation options logic simplified and corrected in Form Party macro
- Movement type filtering uses party's calculated common movement types from flags

## [2.3.2] - 2025-10-30

### Added
- **Image Preview**: Party Token Image now shows live preview of selected icon
  - 64x64 preview thumbnail displays current image
  - Updates automatically when typing path or using Browse button
  - Shows "No preview" placeholder if path is empty
  - Shows "Invalid image" if image fails to load
  - Preview positioned next to input field for easy reference

### Improved
- **Dropdown Height**: Increased dropdown minimum height to prevent text truncation
  - Changed from 36px to 42px minimum height
  - Added proper line-height (1.5) for better text display
  - Increased padding to 10px 12px for more comfortable appearance
  - Dropdown options now have consistent padding and line-height
  - Text like "Valeros (Previous Leader)" now displays completely
  
- **Input Field Consistency**: All inputs now share consistent sizing
  - 42px minimum height across text inputs, selects, and buttons
  - Better vertical alignment in layouts
  - More professional, polished appearance

- **Browse Button Sizing**: Button now matches input field height exactly
  - Increased padding from 8px 16px to 10px 20px
  - Better visual balance with taller inputs

### Fixed
- **Dropdown Text Cutoff**: Long option text (like "Valeros (Previous Leader)") no longer truncates
- **Image Input Field**: Now properly sized to match other inputs
- **Vertical Alignment**: All form controls properly aligned regardless of content length

### Technical Details
- Added `.pv-image-picker-section` class for image preview layout
- Added `.pv-image-preview-container` for horizontal preview layout
- Added `.pv-image-preview` for 64x64 thumbnail container
- Updated render callback to handle image preview updates
- Preview uses error handling to show fallback on invalid paths
- CSS line-height and padding adjustments for better text rendering

## [2.3.1] - 2025-10-30

### Fixed
- **Form Party Dialog Contrast**: Fixed poor readability on light backgrounds
  - Changed text colors from light (#f0f0f0) to dark (#000000) for proper contrast
  - Updated help text color to medium gray (#666666) for better visibility
  - Changed input backgrounds from transparent to white with proper borders
  - Enhanced Browse button styling with solid blue background (#0088ff)
  - Added subtle form background tint for visual definition
  - Increased label font size to 15px and made them bold black
  - Improved select dropdown styling with larger minimum height (36px)
  - Added custom dropdown arrow for consistent appearance

- **Wall Detection False Positives**: Fixed tokens being displaced when no walls exist
  - Added check to skip wall detection entirely if scene has no walls
  - Fixed wall movement type constant (using WALL_MOVEMENT_TYPES instead of WALL_SENSE_TYPES)
  - Improved wall detection to properly identify movement-blocking walls
  - Added null-safety checks for wall.document.move property
  - Enhanced logging to identify specific reasons for token displacement
  - Better diagnostic messages in console for troubleshooting

### Improved
- **Select Dropdown Appearance**: Dropdowns now properly display full text without truncation
  - Increased padding and minimum height for better text visibility
  - Added custom SVG arrow indicator
  - Improved spacing and alignment

- **Button Styling**: Enhanced Browse button for better visual feedback
  - Solid background color instead of transparent
  - Proper hover states with lift animation
  - Better active state feedback

### Technical Details
- CSS contrast ratios now meet accessibility standards for light backgrounds
- Wall detection uses correct Foundry v13 constants (WALL_MOVEMENT_TYPES)
- Added defensive checks for undefined wall properties
- Improved console logging for deployment debugging

## [2.3.0] - 2025-10-30

### Added
- **New Formation Presets**: Added three new tactical formations that scale with party size
  - Circle: Defensive circular formation with radius scaling
  - Staggered: Two-row alternating formation
  - Box: Square perimeter formation
  
- **Dynamic Formation Scaling**: All formations now intelligently adjust spacing based on party size
  - Small parties (2-3 members): Tighter, more compact formations
  - Medium parties (4-5 members): Balanced spacing
  - Large parties (6+ members): Wider spacing to prevent overlap
  - Column and Line formations use adaptive spacing (1.0x to 1.5x grid units)
  - Wedge formation scales both horizontal and vertical spacing
  
### Improved
- **Form Party Dialog UI**: Complete redesign for better readability and usability
  - Cleaner, more spacious layout with proper visual hierarchy
  - Clear section labels without cramped text
  - Improved input field styling with better contrast
  - Professional help text styling for better guidance
  - Subtle visual dividers between sections
  - Consistent padding and spacing throughout
  - Better focus states for inputs and selects

### Fixed
- Formation spacing issues with parties of varying sizes
- Overlapping text in Form Party configuration dialog
- Poor readability of help text in dialog

### Technical Details
- Updated `formations.js` with size-aware transform functions
- Added `pv-form-party` CSS class for enhanced dialog styling
- Formation transforms now receive party size (`total` parameter)
- Dynamic spacing calculations use party size thresholds
- Improved CSS with proper form-group, label, and help-text styles

### User Experience
**Formation Improvements:**
- 2-person party in Column: Compact 1-grid spacing
- 6-person party in Column: Comfortable 1.5-grid spacing
- Circle formation radius automatically adjusts: 2 grids for small parties, up to 4+ for large ones
- Wedge formation creates proper V-shape regardless of party size
- Box formation intelligently distributes members around perimeter

**UI Improvements:**
- Form fields are easier to read and interact with
- Clear visual separation between party info and formation settings
- Help text provides guidance without cluttering the interface
- Professional appearance consistent with Foundry VTT's UI design

## [2.2.18] - 2025-10-30

### Added
- **Formation Preset Selection**: When forming a party, you can now choose from formation presets
  - Standard: Default formation as positioned
  - Tight (50%): Compress formation spacing to 50%
  - Wide (150%): Expand formation spacing to 150%
  - Column: Single-file line formation
  - Line: Horizontal line formation
  - Wedge: V-shaped battle formation
  
- **Last Used Formation Memory**: The module remembers your last used formation preset
  - When forming a new party, "Last Used: [Formation Name]" appears as an option
  - Automatically selected as the default if available
  - Streamlines repeated party formations with the same layout
  - Saved per world, persists across sessions

### Fixed
- **Duplicate Function Declaration**: Removed duplicate `cycleLightSource` function that caused syntax error on module load

### User Experience
**Formation Selection Flow:**
1. Select tokens to form party
2. Configure party name, image, and leader (as before)
3. **NEW**: Choose formation preset from dropdown
4. "Last Used: [Formation Name]" appears at top of list if you've formed parties before
5. Formation is automatically applied to token positioning
6. Your choice is saved for next time

**Example Use Cases:**
- **Dungeon Crawl**: Use "Column" for narrow corridors, then "Standard" when entering rooms
- **Combat Prep**: Quick switch to "Wedge" formation when approaching combat
- **Travel**: Use "Line" for road travel, formation is remembered for next travel day
- **Space Management**: "Tight" formation in crowded spaces, "Wide" in open areas

### Technical Details
- Added `lastUsedFormation` game setting to store most recent formation choice
- Modified Form Party macro to include formation selection UI
- Formation presets now applied during party creation via transform functions
- Backward compatible: existing parties continue to work without changes

## [2.2.17] - 2025-10-29

### Added
- **Light Source Cycling**: Right-click the Deploy Party button to cycle through available light sources
  - Cycle order: Member 1 → Member 2 → ... → No Light → Member 1
  - Each light source shows with full fidelity (color, animation, angle, etc.)
  - Console logs which light is active (minimal visual feedback)
  - "No Light" option allows manually turning off party lighting
  
### Changed
- **Auto-Switch Behavior**: When active light goes to 0 (torch extinguished, spell ends), automatically switches to next available light
  - Console log: "Active light source (Character Name) extinguished, auto-switching..."
  - If no lights remain, party token becomes dark
- **Light Management**: Party token now stores `availableLights` array and `activeLightIndex` in flags
  - `activeLightIndex = -1` means auto mode (brightest light, default behavior)
  - `activeLightIndex >= 0` means manual selection mode (user chose specific light)
  
### Enhanced
- **Smart Lighting Updates**: When torches/spells change, the system maintains manual selection when possible
  - If selected light still exists and has light → keep using it
  - If selected light goes to 0 → auto-switch to next available
  - Auto mode (default) continues to use brightest light as before

### Technical Details
- Added `cycleLightSource(partyToken)` function for cycling through available lights
- Added `collectAvailableLights(partyToken, memberData)` helper function
- Enhanced `updatePartyLightingFromActors()` to respect manual light selection
- Right-click handler on Deploy button prevents default context menu
- All light properties stored: bright, dim, color, angle, alpha, animation, coloration, luminosity, attenuation, contrast, saturation, shadows

### User Experience
**Default Behavior (Unchanged):**
- Form party → brightest light automatically selected
- Torch equipped/unequipped → lighting updates automatically

**New Cycling Feature:**
1. Form party (uses brightest light by default)
2. Right-click Deploy button → switches to next member's light
3. Right-click again → cycles to next member
4. Right-click when on last member → switches to "No Light"
5. Right-click on "No Light" → back to first member

**Auto-Switch Example:**
1. Party using Valeros's torch (40 bright)
2. Valeros drops torch → light goes to 0
3. System automatically switches to Merisiel's light (20 bright/40 dim)
4. Console: "Active light source (Valeros) extinguished, auto-switching..."
5. Console: "Auto-switched to Merisiel's light"

### Backward Compatibility
- Existing party tokens work without changes
- If `availableLights` not stored, system collects them on first right-click
- If `activeLightIndex` not set, defaults to -1 (auto mode)
- Default behavior unchanged: brightest light automatically selected

## [2.2.16] - 2025-10-29

### Fixed
- **Token Lighting Lost on Deployment**: Fixed issue where directly applied token lighting was lost when deploying party
  - **Problem**: When token lighting was set directly on a token (not from actor prototype or Active Effects), the lighting was correctly transferred to the party token, but lost when the party was deployed
  - **Example**: Merisiel has 40 dim/20 bright red light set directly on her token → Forms party → Party token gets the lighting ✓ → Deploys party → Merisiel's token has 0 dim/0 bright (lighting lost ✗)
  - **Root Cause**: When deploying, tokens were created from actor prototype data which doesn't include lighting set directly on tokens
  - **Solution**: Store original token lighting in memberData when forming party, restore it when deploying
  - **Result**: Token lighting persists through form/deploy cycles

### Changed
- **Form Party Macro**: Now stores each member's original token lighting in memberData.originalLight
- **Deploy Party Macro**: Restores originalLight for each token if it exists and has non-zero values
- **Console Logging**: Added debug output showing when original lighting is being restored

### Technical Details
- Original token lighting (set via token.document.light.update()) is stored separately from actor prototype lighting
- Active Effects and equipped items (torches) continue to work through the existing lighting synchronization system
- The originalLight property stores the complete light configuration including bright/dim ranges, color, angle, alpha, animation, and all other properties
- Lighting restoration happens for both regular members and the leader token

### How It Works
1. **Form Party**: Captures token.document.light for each member, stores in memberData[i].originalLight
2. **Party Active**: Lighting synchronization continues to work (torches, spells, etc.)
3. **Deploy Party**: For each member, if originalLight exists and has light values > 0, apply it to the created token
4. **Result**: Token lighting survives the form/deploy cycle while still supporting dynamic lighting changes

## [2.2.15] - 2025-10-29

### Fixed
- **CRITICAL - Lighting Won't Turn OFF**: Fixed issue where lighting would turn ON but couldn't be turned OFF
  - **Root Cause**: Calling actor preparation methods (prepareData, prepareEmbeddedDocuments, prepareDerivedData) on already-prepared PF2e actors caused frozen/sealed object errors
  - PF2e error: `Cannot delete property 'speed' of #<Object>`
  - PF2e error: `Cannot add property label, object is not extensible`
  - **These errors caused lighting state to become corrupted/stuck on the actor**
  - When deployed, tokens had lights permanently stuck ON that couldn't be toggled
  - **Solution**: Removed ALL actor preparation calls - actors are already prepared when hooks fire
  - Now we simply read the actor's current state without modifying it
  - **Result**: Lights turn ON and OFF correctly, no frozen object errors

### Changed
- **Removed actor preparation calls**: No more prepareData(), prepareEmbeddedDocuments(), prepareDerivedData()
- **Actors read as-is**: Trust that Foundry/game system has already prepared the actor when hooks fire
- **Faster response time**: Reduced delay from 200ms → 100ms (don't need extra time for preparation we're not doing)
- **Reduced debounce**: 200ms → 100ms to match processing delay
- **Total update time**: ~200ms (was ~400ms in v2.2.14)
- **Cleaner code**: Removed complex error handling around preparation methods

### Technical
- The key insight: Actors are already fully prepared by the time our hooks fire
- Calling prepare methods again tries to modify frozen/sealed PF2e objects
- This causes TypeErrors that corrupt the lighting state
- Simply reading actor.items, actor.effects, actor.prototypeToken is safe
- Getting computed token data (getTokenDocument/getTokenData) is also safe
- Only manual preparation calls caused issues

### Why This Was Happening
1. User equips torch → updateItem hook fires
2. PF2e processes the change, prepares actor data, freezes objects
3. Our debounced function runs 100ms later
4. We called prepareData() on already-frozen objects → TypeError
5. Lighting state got corrupted from the errors
6. Light stayed ON even when torch was removed

### Why This Fix Works
1. User equips torch → updateItem hook fires
2. PF2e processes the change, prepares actor data
3. Our debounced function runs 100ms later
4. We simply READ the actor's current state (already prepared)
5. No errors, lighting state is correct
6. Light turns ON when equipped, OFF when removed

## [2.2.14] - 2025-10-29

### Fixed
- **CRITICAL - PF2e Party Actor Crash**: Fixed error when actors are members of PF2e Party actors
  - Error: `Cannot read properties of undefined (reading 'value')` in PF2e Party data preparation
  - **Root Cause**: Calling `actor.reset()` on actors linked to PF2e Party actors caused PF2e system to crash
  - **Solution**: Check actor type before calling reset(); skip 'party' type actors; wrap in try-catch
  - Wrapped all actor data preparation calls (prepareData, prepareEmbeddedDocuments, prepareDerivedData) in try-catch
  - Errors in data preparation are now logged as warnings but don't prevent lighting detection
  - Console will show: `Skipping reset() for Party-type actor (not safe)` when applicable
  
### Changed
- All actor preparation methods now have individual try-catch blocks for maximum resilience
- Preparation failures are logged as warnings (`console.warn`) rather than errors
- Module continues to function even if some preparation steps fail
- Better error messages explain which preparation step failed and why

### Technical
- `actor.reset()` is now only called for non-Party actor types
- Each preparation method (prepareData, prepareEmbeddedDocuments, prepareDerivedData) has its own try-catch
- Errors are non-critical and won't stop lighting detection
- This fix ensures compatibility with PF2e's Party actor system

## [2.2.13] - 2025-10-29

### Fixed
- **CRITICAL - Initial Lighting Detection**: Party token now lights up immediately when party members first light a torch or light source
  - Increased processing delay from 50ms to 200ms to allow game systems more time to process item changes
  - Added `actor.reset()` call to clear cached data before reading lighting state
  - Enhanced item inspection to check multiple equipped/activated properties
  - **Before**: Light a torch → no light on party token (had to deploy/reform to sync)
  - **After**: Light a torch → party token lights up within 400ms
  
- **CRITICAL - Multiple Light Sources**: Party token now correctly maintains lighting when one of multiple light sources is extinguished
  - Improved active effect detection to properly find spell-based lighting (Light cantrip, etc.)
  - Enhanced logging shows exactly which actors have light and which strategy detected it
  - **Before**: Valeros (torch) + Ezren (Light spell) → extinguish Valeros → party goes completely dark
  - **After**: Valeros (torch) + Ezren (Light spell) → extinguish Valeros → party uses Ezren's light
  
### Changed
- **Enhanced Logging**: Comprehensive console logging now shows:
  - Per-actor section headers for easy troubleshooting
  - Each strategy attempted and its result
  - Which items/effects were found and their light values
  - Final summary of all light sources collected
  - Clear indicators (✓, ✅, ❌) for success/failure states
- **Timing Adjustments**:
  - Processing delay: 50ms → 200ms (allows systems to complete item/effect processing)
  - Debounce delay: 100ms → 200ms (matches processing delay)
  - Total update time: ~150ms → ~400ms (still imperceptible to users)
- **Strategy Improvements**:
  - Strategy 1 (Deployed Tokens): Added logging for found-but-no-light cases
  - Strategy 2 (Computed Token): Better result logging, shows light values even when zero
  - Strategy 2.5 (Active Effects): Comprehensive effect scanning with per-effect logging
  - Strategy 3 (Item Inspection): Checks more equipped states (worn, held, activated, quantity)
  - Strategy 4 (Prototype Token): Improved logging consistency

### Technical
- Item inspection now checks: equipped, equipped.value, equipped.invested, equipped.handsHeld, equipped.carryType, activated, active, quantity
- Active effect detection reports effect names and which properties they modify
- All strategies now log their results regardless of success/failure
- Final collection summary shows total light count and per-actor breakdown
- Added actor.reset() to ensure cached data doesn't interfere with fresh reads

### Debugging
These console logs will help diagnose any remaining issues:
```
Party Vision | ===== Checking lighting for 5 party members =====
Party Vision | --- Checking Valeros ---
Party Vision | Valeros: Strategy 1 (Deployed Token) - no deployed tokens found
Party Vision | Valeros: Strategy 2 (Computed Token) - bright=0, dim=0
Party Vision | Valeros: Strategy 2.5 (Active Effects) - checking 0 effects
Party Vision | Valeros: Strategy 3 (Item Inspection) - scanning 15 items
Party Vision | Valeros: Item "Torch" - equipped=true, activated=true, hasLight=true, bright=20, dim=40
Party Vision | Valeros: ✓ Strategy 3 (Item "Torch") found light - bright=20, dim=40
Party Vision | Valeros: ✅ ADDED TO LIGHTS ARRAY (bright=20, dim=40)
Party Vision | ===== LIGHT COLLECTION COMPLETE: Found 1 light source(s) =====
Party Vision |   - Valeros: bright=20, dim=40
```

## [2.2.12] - 2025-10-29

### Fixed
- **CRITICAL - Real-time Lighting Synchronization**: Party token lighting now updates immediately when party members light/extinguish light sources
  - Added 50ms delay to ensure actor/effect data is fully processed before reading lighting state
  - Enhanced actor data preparation by calling prepareData(), prepareEmbeddedDocuments(), and prepareDerivedData()
  - Added new Strategy 3: Direct item inspection for equipped light-emitting items (torches, lanterns, etc.)
  - Expanded active effect detection to include ATL (Advanced Token Lighting) properties
  - Added support for getTokenData() method used by some game systems
  - **Before**: Lighting only updated when party was re-formed; changes while formed were ignored
  - **After**: Party token lighting updates within 150ms when any member lights/extinguishes a light source
  - Fixes issue where Valeros lights torch → no light on party token (now works correctly)
  - Fixes issue where Valeros puts out torch → party token stays lit (now updates correctly)

### Changed
- Lighting detection now uses 4 strategies in order of preference:
  1. Deployed tokens (if any exist outside the party)
  2. Computed token data with effects applied (getTokenDocument/getTokenData)
  3. **NEW**: Direct inspection of equipped items with light properties
  4. Prototype token fallback
- Improved console logging for lighting detection to aid troubleshooting
- More aggressive data preparation ensures all effects and items are processed before reading light state

### Technical
- The new item inspection strategy catches PF2e torches, D&D5e light-emitting items, and similar equipment
- Added support for multiple equipped states: equipped, equipped.value, equipped.invested, equipped.handsHeld
- Lighting updates are debounced at 100ms to prevent rapid-fire updates from multiple hooks
- Total processing time from light change to party token update: ~150ms (50ms delay + 100ms debounce)

## [2.2.11] - 2025-10-29

### Fixed
- **CRITICAL - Foundry v13 Compatibility**: Removed deprecated `Token.prototype._onDoubleLeft` wrapper
  - This method no longer exists in Foundry v13
  - Was preventing module initialization and causing libWrapper errors
  - Double-click to open character sheets feature temporarily removed
  - Players can still right-click party token → Open Actor Sheet

### Changed
- Reduced libWrapper hook count from 2 to 1 (only vision hook remains)
- Module now initializes successfully without errors

### Technical
- Removed non-existent method wrapper that was breaking module load
- All other functionality remains intact and working

## [2.2.10] - 2025-10-29

### Fixed
- **Module Loading**: Enhanced initialization sequence for better Foundry v13 compatibility
  - Added explicit Foundry version check in init hook
  - Improved module loading reliability
  - Added final module export confirmation log
  - Better error reporting during initialization

### Changed
- Added explicit Foundry game object validation
- Enhanced console logging for better troubleshooting
- Improved module initialization error handling

### Technical
- Version bump to address potential module loading edge cases in Foundry v13
- All syntax validation passes (Node.js and browser compatibility confirmed)
- No functional changes to existing features

## [2.2.8] - 2025-10-29

### Fixed
- **Foundry v13 Compatibility**: Removed legacy Foundry v9/v10 data paths from movement calculation
  - Removed deprecated `actor.data.data.attributes.movement` path
  - Removed deprecated `actor.data.data.attributes.speed` path
  - All data paths now use v13 API structure
  - No functional change - these paths were never executed in v13
- **libWrapper Dependency**: Fixed module ID to use correct hyphenated format (`lib-wrapper`)
  - Changed from optional `dependencies` to required `requires` in module.json
  - Foundry will now properly warn users if lib-wrapper is not installed
- **Settings Registration**: Module settings now register before libWrapper check
  - Prevents "not a registered setting" errors if libWrapper fails to load
  - Ensures settings are always available even if other initialization fails

### Changed
- Module settings are now registered at the start of init hook (before dependency checks)
- libWrapper is now explicitly listed as a required dependency in module.json

### Technical
- Code cleanup: Removed 2 unused legacy data path checks from Form Party macro
- Improved error handling: Settings registration moved earlier in initialization sequence
- Better dependency management: Using Foundry v13 `requires` instead of v9 `dependencies`

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
