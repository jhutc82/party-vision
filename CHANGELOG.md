# Changelog

All notable changes to Party Vision will be documented in this file.

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
- Updated module version to 2.4.6

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

