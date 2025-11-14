# Changelog

All notable changes to Party Vision will be documented in this file.

## [2.6.0] - 2025-11-14

### Added

**D&D 5e System-Specific Features**
- **Inspiration Tracking**:
  - Member access panel now displays a gold star icon for characters with inspiration
  - Added toggle button to grant or remove inspiration directly from the panel
  - Inspiration status updates in real-time
- **Exhaustion Level Display**:
  - Party token now shows exhaustion level indicator (skull icon with level number) when any party member has exhaustion
  - Exhaustion level displayed in member access panel with red highlight
  - Shows highest exhaustion level in the party
- **Help Action Chains**:
  - After deploying during combat, visual green lines appear showing which party members are within 5 feet
  - Lines indicate who can use the Help action to assist each other
  - Visual indicators auto-disappear after 10 seconds
  - Can be toggled on/off in module settings

**Pathfinder 2e System-Specific Features**
- **Exploration Activities**:
  - Member access panel includes dropdown to set each character's exploration activity
  - Activities include: Avoid Notice, Defend, Detect Magic, Follow the Expert, Investigate, Repeat a Spell, Scout, Search, Track
  - Activity selection persists and shows in party member info
  - Notifications confirm when activity is set
- **Bulk Tracking**:
  - Party bulk summary displayed at top of member access panel showing total party bulk
  - Individual member bulk shown for each character with encumbrance status
  - Encumbered characters highlighted in red
  - Helps track party carrying capacity during exploration
- **Aid Action Coordination**:
  - After deploying during combat, visual lines show which party members are within reach (10ft)
  - Lines indicate who can use the Aid action to help each other
  - Visual indicators auto-disappear after 10 seconds
  - Can be toggled on/off in module settings

### Changed
- Enhanced member access panel with system-specific information
- Updated module description to highlight new system-specific features
- Added new module setting: "Show Help/Aid Action Chains" (default: enabled)

### Technical
- Added helper functions: `getActorInspiration()`, `getActorExhaustion()`, `getActorExplorationActivity()`, `setActorExplorationActivity()`, `getActorBulk()`, `getPartyBulk()`, `showHelpActionVisualization()`
- Enhanced `refreshStatusEffects()` to display exhaustion level indicator
- Updated public API exports with new system-specific functions
- All new functions include proper input validation and error handling

## [2.5.2] - 2025-11-03

### Fixed

**Critical Bug Fixes**
- **Token HUD jQuery Error**: Fixed `html.find is not a function` error when rendering Token HUD for party tokens (wrapped html parameter with jQuery)
- **Passive Perception Display**: Fixed perception tooltip showing permanently and duplicating on hover
  - Now only appears on mouseover and disappears on mouseout as intended
  - Properly strips existing perception text to prevent accumulation
- **Combat Tracker Integration**: Fixed party tokens not adding members to combat
  - Added `preCreateCombatant` hook to intercept party token combat additions
  - Automatically creates combatants for all party member actors instead of the token
  - Auto-creates combat encounter if none exists
  - Prevents "no associated actor" error message
- **Double-Click Error**: Fixed "actor no longer present in world" error when double-clicking party tokens
  - Overrides `Token.prototype._onClickLeft2` to intercept party token double-clicks
  - Prevents default actor sheet opening behavior for party tokens
  - Explicitly sets `actorId: null` and `actorLink: false` on party token creation
- **Light Cycling Missing Torches**: Fixed light cycling not detecting equipped items like torches
  - Added Strategy 3: Item Inspection to `cycleLightSource` function
  - Now properly detects light from equipped/held/activated items (torches, lanterns, etc.)
  - Matches detection logic used in party formation for consistency

**Pathfinder 2e Improvements**
- **Perception System**: Updated perception display to properly support PF2e rules
  - PF2e now shows "Perception: +5" (modifier) instead of "PP: 15" (passive perception)
  - D&D 5e continues to show passive perception values
  - Checks `system.perception.totalModifier` and other PF2e-specific paths
  - Module setting renamed to "Show Perception" to reflect system-agnostic behavior
- **Movement Type Selector**: Enhanced movement type detection and display for PF2e
  - Added comprehensive debugging for movement type calculation
  - Improved selector population with multiple fallback strategies
  - Better handling of PF2e v7.5+ movement structure (`system.movement.speeds`)

### Technical Improvements
- Added extensive console logging for debugging light detection and cycling
- Improved light matching logic with more lenient comparison
- Enhanced `addPartyToCombat` with auto-combat creation and duplicate checking
- Updated `rollPartyInitiative` to handle both combatant IDs and data objects
- Better error handling and user notifications throughout

## [2.5.1] - 2025-11-03

### Added

**Movement Type Selector**
- Party tokens now properly support the "Select Movement Action" dropdown in the Token HUD
- Shows only movement types that ALL party members have in common
- Defaults to system-appropriate movement type:
  - **PF2e**: "land" (Travel mode)
  - **D&D 5e**: "walk"
- Movement data stored in token's actorData for proper HUD integration

### Changed
- **Compact Deploy Dialog**: Significantly reduced the size of the deployment menu to take up less screen space
  - Reduced padding and margins throughout (15px → 8px)
  - Smaller heading sizes and tighter spacing
  - Direction grid reduced from 240px to 150px with smaller arrow icons (28px → 18px)
  - Member list max height reduced from 300px to 200px
  - Member items more compact with smaller portraits (32px → 24px)
  - Smaller buttons and controls throughout the dialog
  - All functionality preserved while reducing overall screen footprint by approximately 40%

### Fixed
- **Health Indicator Real-Time Updates**: Health bars now update instantly when actor HP changes, without needing to click the token
- **Passive Perception Tooltip**: Fixed accumulating "| PP: X" text that would append multiple times on hover
- **Double-Click Actor Sheet**: Prevented party token's own actor sheet from trying to open (and failing) when double-clicking
- **Light Cycling**: Fixed right-click light cycling to properly go from brightest → next brightest → ... → off → brightest

### Technical Improvements
- Added `getDefaultMovementType()` helper for system-specific defaults
- Enhanced `updateActor` hook to detect HP changes and refresh health indicators
- Enhanced `updateToken` hook to handle HP changes for unlinked tokens
- Added `actorData` to party token creation with proper system-specific movement structure
- Improved tooltip management with original text storage and restoration
- Better double-click event handling with timestamp tracking to prevent unwanted sheet openings

## [2.5.0] - 2025-11-03

### Added - Player-Friendly Enhancements

**Double-Click to Open Sheets**
- Double-clicking a party token now opens all member actor sheets simultaneously
- Sheets are automatically cascaded with offset positions for easy viewing
- Respects user permissions (only opens sheets you have permission to view)
- Can be toggled on/off in module settings

**Combat Toggle Integration**
- Clicking the combat toggle button on a party token now adds ALL members to combat tracker
- Each member gets their own combatant entry with proper initiative ordering
- Toggle off to remove all party members from combat at once
- Auto-roll initiative option for all members when added (configurable)

**Right-Click Context Menu**
- "Open All Sheets" - Quick access to open all member character sheets
- "View Party Members" - Opens detailed member access panel
- "Split Single Member" - Quick dialog to split one member from party

**Member Access Panel**
- Beautiful interactive dialog showing all party members
- Displays member portraits, current HP, max HP, and active status effects
- Quick action buttons to open individual sheets or split members
- Real-time status updates
- Smooth animations and modern styling

**Party Chat Commands**
- `/party status` - Shows party health and active effects in chat
- `/party members` - Lists all party members with leader indication
- `/party help` - Shows available commands
- All commands whispered to user for privacy

**Health Indicator**
- Visual health bar displayed below party token
- Color-coded: Green (>50% HP), Orange (25-50% HP), Red (<25% HP)
- Shows aggregate HP of all party members
- Updates automatically when member HP changes
- PIXI graphics for performance

**Status Effect Indicators**
- Shows up to 5 active status effects as small icons on party token
- Displays unique effects from all party members
- Positioned at top-left of token for visibility
- Updates automatically when effects are added/removed
- Icon-based visual representation with tooltips

**Passive Perception Display**
- Shows highest passive perception value in party token tooltip
- System-agnostic (supports D&D 5e, PF2e, and other systems)
- Automatically calculates from character abilities
- Can be toggled on/off in settings

### Added - Module Settings

Six new configurable settings in the module configuration:
- **Auto-Roll Initiative for Party** (default: ON) - Automatically roll initiative when adding party to combat
- **Show Party Health Indicator** (default: ON) - Display aggregate health bar on party token
- **Show Status Effect Indicators** (default: ON) - Display active status effects on party token
- **Show Passive Perception** (default: ON) - Display highest passive perception in tooltip
- **Double-Click Opens All Sheets** (default: ON) - Enable double-click to open all member sheets
- **Enable Member Access Panel** (default: ON) - Enable member access panel feature

### Technical Improvements

**System-Agnostic Data Access**
- Added helper functions for cross-system compatibility
- `getActorHP()` - Works with D&D 5e, PF2e, and other systems
- `getActorMaxHP()` - System-agnostic max HP retrieval
- `getActorPassivePerception()` - Cross-system perception detection with fallback calculation

**PIXI Graphics Integration**
- Health bars and status effects use PIXI.Graphics and PIXI.Sprite for performance
- Added as children to token object with named identifiers
- Automatic cleanup prevents memory leaks
- Smooth visual updates without canvas redraws

**Hook Integration**
- `getTokenConfigHeaderButtons` - Add "View Members" button to token config
- `getTokenHUDMenuItems` - Add context menu options
- `chatMessage` - Intercept `/party` commands
- `hoverToken` - Add passive perception to tooltip
- `refreshToken` - Update health and status indicators
- `renderTokenHUD` - Override combat toggle for party tokens

**Public API Expansion**
Added 13 new functions to `window.PartyVision`:
- `openAllMemberSheets()`
- `togglePartyCombat()`
- `addPartyToCombat()`
- `rollPartyInitiative()`
- `showMemberAccessPanel()`
- `showQuickSplitDialog()`
- `showPartyStatus()`
- `showPartyMembers()`
- `showPartyHelp()`
- `getHighestPassivePerception()`
- `refreshHealthIndicator()`
- `refreshStatusEffects()`
- Plus helper functions for HP and perception detection

### Changed

**Enhanced Token HUD**
- Combat toggle button now has party-specific behavior
- Right-click functionality preserved for individual token combat
- Visual feedback for party vs individual token interactions

**Improved User Experience**
- Cascading sheet positions prevent screen clutter
- Responsive dialogs adapt to screen size
- Smooth animations for all interactive elements
- Color-coded health indicators for quick status assessment

**CSS Enhancements**
- Added ~340 lines of new styling for player enhancement features
- Dark theme consistency across all new dialogs
- Responsive design for different screen sizes
- Smooth hover effects and transitions
- Custom scrollbar styling for member lists

### Notes

This major update focuses on making Party Vision more player-friendly and reducing GM workload. The new features provide quick access to party information, streamlined combat integration, and better visual feedback for party status. All features are configurable and can be toggled on/off based on your table's preferences.

The module maintains full backward compatibility with existing party tokens and all core functionality remains unchanged.

## [2.4.9] - 2025-10-31

### Fixed
- **Lighting Detection System**: Restored comprehensive 4-strategy lighting detection from v2.4.0 that was missing in v2.4.8
  - Strategy 1: Check deployed tokens on scene
  - Strategy 2: Get computed token data with effects applied
  - Strategy 2.5: Manually apply active effects to prototype token
  - **Strategy 3: Check for equipped light-emitting items** (PF2e torches, D&D5e lanterns, etc.) - **THIS WAS MISSING**
  - Strategy 4: Fall back to prototype token
- **Item Change Detection**: Added hooks for `createItem`, `updateItem`, and `deleteItem` to detect when players equip/unequip/consume light sources
- **Lighting Updates**: All lighting update hooks now use debounced updates to prevent flickering and excessive updates
- **Complete Light Properties**: Lighting now properly includes all light properties (coloration, luminosity, attenuation, contrast, saturation, shadows) not just bright/dim

### Technical Improvements
- Added `debouncedUpdatePartyLighting()` wrapper function for all lighting update hooks
- Updated `aggregateLights()` to include all light properties with proper defaults
- Enhanced `updatePartyLightingFromActors()` with comprehensive multi-strategy detection and 100ms wait for system processing
- Added detailed console logging for lighting detection debugging (shows which strategy found light for each actor)
- Updated public API exports to include `debouncedUpdatePartyLighting` and `aggregateLights`

### Notes
This version restores the lighting functionality from the macro-based v2.4.0 that was inadvertently simplified in the function-based v2.4.8 refactor. Party tokens will now properly detect and display light from equipped items, active effects, and all other light sources.

## [2.4.8] - 2025-10-31

### Added
- **Custom Formation Persistence**: Custom formations are now saved per party. When you form a party with "Custom" selected, the current token positions are saved and available as "Saved Custom Formation" when deploying that party in the future.
- **Party Leader Persistence**: The selected party leader is now saved per party composition and automatically pre-selected when forming the same party again.
- **Combined Deploy/Split Dialog**: The deploy and split party dialogs have been merged into a single, more intuitive interface. You can now select which members to deploy and choose formation/direction all in one dialog.
- **Quick Select Buttons**: Added "Select All" and "Select None" buttons to the member selection interface for easier party splitting.
- **Formation Descriptions**: Formation dropdown now shows descriptions for each formation type to help you choose the right one.

### Fixed
- **Preset Formations Now Functional**: All preset formations (Column, Line, Wedge, Circle, Staggered, Box, Tight, Wide) now properly apply their transforms when deploying. Previously, the transform functions were defined but never used.
- **Formation Scaling**: All preset formations now properly scale for any party size (2-100+ members), dynamically adjusting spacing and arrangement based on the number of party members.
- **Split Party Single Character Bug**: Fixed issue where selecting only one character to split would deploy the entire party. Now correctly deploys only selected members.
- **Wall Collision Detection**: All formations now properly respect walls and avoid placing tokens through obstacles.
- **Formation Rotation**: Formations now correctly rotate when deploying in different directions while maintaining their shape integrity.

### Changed
- Removed separate "Split Party" button from deploy dialog - functionality is now integrated into the main deploy dialog
- Formation selection now remembers the last formation used for each party
- Member checkboxes now show a star icon next to the party leader
- Improved visual feedback for selected members with enhanced styling
- Formation presets now use transform functions consistently for all deployment scenarios

### Technical Improvements
- Refactored `deployParty()` to properly use formation transform functions from `formations.js`
- Enhanced `splitAndDeployMembers()` to accept formation and direction parameters
- Added formation key and custom formation data to party token flags for persistence
- Improved `savePartyConfig()` to store leader actor ID and custom formation offsets
- Custom formations stored with actor ID mapping for reliable position restoration
- All formations now use the same deployment pipeline for consistency

## [2.4.7] - 2025-10-31

### Fixed
- **Token Images on Deployment**: Tokens now properly display their actor token images when deployed instead of being blank. Changed from `img` property to `texture.src` for Foundry v13 compatibility.
- **Party Token Image**: Party tokens now properly use the selected custom image instead of defaulting to actor portrait.
- **Pathfinder 2e Movement API**: Updated to use PF2e v7.5+ movement API (`system.movement.speeds`) to eliminate deprecation warnings. Module now checks modern paths first, then falls back to older paths for backward compatibility.
- **Dropdown Text Colors**: Fixed white text in dropdown options by changing option backgrounds to white with black text for proper visibility.
- **Browse Button Size**: Constrained browse button to max 120px width so it doesn't hide the filename input field.
- **Formation Label Visibility**: Ensured formation labels and select elements have proper sizing and visibility in all dialogs.
- **Auto-Deploy Single Member**: When splitting a party down to 1 remaining member, that member is now automatically deployed since a party of one isn't really a party.

### Technical Improvements
- Added `getActorSpeed()` helper function for system-agnostic movement speed detection
- Updated token creation to use Foundry v13's `texture.src` format instead of deprecated `img` property
- Enhanced movement detection with fallback chain: PF2e v7.5+ → D&D 5e → legacy paths
- Improved split party logic to handle single-member edge case

## [2.4.6] - 2025-10-31

### Added
- **Party Name Input**: You can now name your party when forming it. The name is saved and will be remembered when you form a party with the same members again.
- **Party Token Image Picker**: Select a custom image for your party token with a built-in file picker. The image preference is saved for future use with the same party composition.
- **Party Configuration Persistence**: The module now remembers party names and images based on member composition, so reforming the same party will use your previously saved settings.
- **Enhanced Vision Cleanup**: Improved cleanup of vision circles when forming parties to eliminate visual artifacts on the scene.

### Fixed
- **White Text in Dialogs**: Fixed all dialog text colors to be readable on dark backgrounds. Labels, help text, and all dialog content now uses light colors (#ddd, #aaa) instead of black.
- **Vision Artifacts**: Fixed issue where individual token vision circles remained visible after forming a party, creating a "mess" of overlapping vision indicators.
- **Canvas Perception Updates**: Added forced canvas perception updates after forming and deploying parties to ensure vision and lighting are properly refreshed.

### Changed
- Updated all dialog styling to use consistent dark theme with light text
- Improved form party dialog layout to accommodate new name and image inputs
- Enhanced CSS for better contrast and readability across all dialogs

## [2.4.5] - Previous Version

### Fixed
- Formation rotation mathematics
- Combat integration timing
- UI visibility issues
- Party splitting functionality

### Changed
- Converted from macro-based system to function-based system
- Updated deprecated API calls for Foundry v13
- Fixed libWrapper integration issues
- Enhanced error handling and debug logging

## [2.4.0] - Macro-Based Version

### Features
- Party formation with macros
- Formation presets
- Deploy party functionality
- Party splitting
- Follow-the-leader mode
- Auto-deploy on combat
- Auto-form on combat end
- Movement capability calculations
- Multi-strategy lighting detection
- Wall collision detection
