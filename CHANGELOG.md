# Changelog

All notable changes to the Party Vision module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
