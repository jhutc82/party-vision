# Changelog

All notable changes to Party Vision will be documented in this file.

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
