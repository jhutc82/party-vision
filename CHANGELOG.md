# Changelog

All notable changes to Party Vision will be documented in this file.

## [2.4.5] - 2025-10-31

### 🎉 Major Release - Comprehensive Fix & Enhancement Update

This release represents a complete overhaul of the Party Vision module, addressing all known issues and implementing missing core functionality.

### ✨ New Features

#### Form Party System (Previously Missing!)
- **NEW**: Complete `showFormPartyDialog()` function - allows forming parties via UI
- **NEW**: Complete `formParty()` function - handles party formation logic
- Interactive member selection dialog with leader designation
- Formation preset selection during party formation
- Visual member list with portraits and movement speed display
- Remembers last used formation preset

#### Enhanced Dialogs
- Improved Deploy Party dialog with better styling and UX
- Better visual feedback for direction selection
- Remembers last deployment direction
- Split party dialog with member selection checkboxes

### 🐛 Critical Bug Fixes

#### Formation Rotation (CRITICAL FIX)
- **FIXED**: Formation rotation now correctly rotates around the leader as center point
- **FIXED**: Replaced flawed radian-based rotation with 90-degree step rotation system
- **FIXED**: Leader now stays at party token position during deployment
- **FIXED**: Member offsets properly maintained during rotation
- New functions: `rotateOffset()` and `calculateRotationSteps()`
- All deployment directions (north, east, south, west) now work correctly

#### API and Function Exports
- **FIXED**: Added `showDeployDialog` to `window.PartyVision` exports
- **FIXED**: Added `showFormPartyDialog` to `window.PartyVision` exports  
- **FIXED**: Added `formParty` to `window.PartyVision` exports
- **FIXED**: Added `toggleFollowLeaderMode` to `window.PartyVision` exports
- HUD buttons now properly access exported functions

#### Combat Integration
- **FIXED**: Added 500ms delay before showing deploy dialog on combat start
- **FIXED**: Added comprehensive error handling for auto-deploy
- **FIXED**: Added try-catch blocks to prevent race conditions
- **FIXED**: Auto-form on combat end now properly calls function instead of missing macro

#### Lighting System
- **FIXED**: Enhanced multi-strategy lighting detection for system compatibility
- **FIXED**: Checks prototype token light AND active effects for light sources
- **FIXED**: Proper light restoration when deploying party members
- **FIXED**: Debounced lighting updates to prevent performance issues

### 🔧 Code Improvements

#### Architecture
- Removed all compendium macro dependencies
- All functionality now in main module code
- Direct function calls replace macro execution
- Cleaner, more maintainable codebase

#### System Agnostic Design
- Multiple detection strategies for movement speed
- Compatible with Pathfinder 2e, D&D 5e, and generic systems
- Checks various possible data locations for attributes
- Fallback values for unknown systems

#### Error Handling
- Comprehensive try-catch blocks throughout
- Graceful degradation on errors
- User-friendly error messages
- Enhanced console logging for debugging

#### Code Quality
- Consistent function documentation
- Clear variable naming
- Modular function design
- Removed duplicate code

### 🎨 UI/UX Improvements

- Better dialog styling with consistent theme
- Improved visual hierarchy
- More informative tooltips
- Better feedback messages
- Enhanced member portrait displays
- Clearer formation indicators

### 📦 Settings Enhancements

- **NEW**: `lastFormationPreset` - Remembers formation choice
- **NEW**: `lastDeployDirection` - Remembers deployment direction
- All settings properly registered at init
- Better setting descriptions and hints

### 🔄 API Changes

**Breaking Changes**: None - All existing functionality preserved

**New Public API Functions**:
```javascript
window.PartyVision = {
  // NEW: Form party system
  showFormPartyDialog,
  formParty,
  
  // NOW PROPERLY EXPORTED: Deploy system
  showDeployDialog,
  deployParty,
  
  // Enhanced split system
  showSplitPartyDialog,
  splitAndDeployMembers,
  
  // Lighting system
  updatePartyLighting,
  updatePartyLightingFromActors,
  cycleLightSource,
  
  // Follow-the-leader
  toggleFollowLeaderMode,
  
  // Formations
  FORMATION_PRESETS,
  
  // Utility
  refreshAllPartyLighting
}
```

### 🧪 Testing

Tested with:
- Foundry VTT v13 (latest)
- Pathfinder 2e system v7.5+
- D&D 5e system (latest)
- Generic system

Test scenarios:
- ✅ Form party with 2-8 members
- ✅ Deploy party in all 4 directions
- ✅ Formation rotation accuracy
- ✅ Split party functionality
- ✅ Combat integration (auto-deploy/form)
- ✅ Lighting synchronization
- ✅ Follow-the-leader mode
- ✅ Wall collision detection
- ✅ Multi-size token handling

### 📝 Notes

- Minimum Foundry version: v13
- libWrapper dependency required (unchanged)
- All user data and settings preserved during update
- No migration needed from v2.4.x

### 🙏 Credits

Special thanks to the Foundry VTT community for bug reports and testing!

---

## [2.4.4-fixed] - 2025-10-30

### Internal Development Version
- Initial bug analysis and documentation
- Prototype fixes for rotation system
- Planning for comprehensive overhaul

---

## [2.4.3] - Previous Release

### Features
- Basic party formation and deployment
- Visual indicators for members
- Combat integration
- Follow-the-leader mode (basic)
- Lighting synchronization
- Formation presets
- Split party functionality

### Known Issues (Fixed in 2.4.5)
- Formation rotation incorrectly used absolute angles
- Form Party function missing (was macro-only)
- HUD buttons referenced non-exported functions
- Combat timing had race conditions
- Follow-the-leader mode very basic

---

## Future Roadmap

### Planned for v2.5.0
- Enhanced follow-the-leader with formation maintenance
- Formation rotation during follow mode (Shift+move)
- Improved wall collision detection during follow
- Visual formation preview overlay
- More formation presets
- Hex grid support improvements

### Under Consideration
- Formation templates (save/load custom formations)
- Party token appearance customization
- Member-specific deployment offsets
- Integration with popular modules (drag ruler, etc.)

---

**Note**: This changelog now follows [Keep a Changelog](https://keepachangelog.com/) format.
