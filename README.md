# Party Vision

**A Foundry VTT module for streamlined party movement with individual vision preservation**

## Overview

Party Vision solves the common problem in online TTRPGs where GMs must manually move multiple player tokens during dungeon crawls. This module allows you to combine multiple tokens into a single "Party Token" that moves as one unit while each player still sees from their character's unique vision (darkvision, blindsight, etc.).

## Recent Updates (v2.5.2)

**Critical Bug Fixes**:
- ✅ Fixed Token HUD jQuery error (`html.find is not a function`)
- ✅ Fixed Passive Perception tooltip showing permanently and duplicating
- ✅ Fixed party tokens not adding members to combat tracker
- ✅ Fixed "actor no longer present" error when double-clicking party tokens
- ✅ Fixed light cycling not detecting equipped torches/lanterns

**Pathfinder 2e Improvements**:
- 🎲 Perception now shows modifiers (e.g., "Perception: +5") instead of passive perception
- 🎲 Enhanced movement type detection and selector for PF2e v7.5+
- 🎲 Better support for PF2e-specific data structures

See [CHANGELOG.md](CHANGELOG.md) for full details.

## Features

### Core Features
- **Individual Vision Preservation**: Each player sees from the party token using their own character's vision settings
- **Form Party**: Combine multiple tokens into one, preserving their relative positions
- **Deploy Party**: Separate the party back into individual tokens with directional facing
- **Wall-Aware Deployment**: Automatically finds valid positions when deploying near walls/obstacles
- **Token Size Awareness**: Party token automatically adopts the size of the largest member

### Enhanced Features (v2.0)
- **Follow-the-Leader Mode**: Move one token, and others follow automatically (Ctrl+L to toggle)
- **Auto-Deploy on Combat**: Automatically separates party when combat starts
- **Visual Member Indicators**: Shows character portraits around the party token
- **Range Indicator**: Displays the party's spread radius
- **Quick Member Management**: Right-click context menu for:
  - Scout Ahead: Temporarily split one character out
  - Add to Party: Add nearby tokens
  - Remove Member: Remove characters from party
- **Formation Presets**: Choose from multiple deployment formations (tight, wide, column, line, wedge)
- **Smart Default Facing**: Remembers last deployment direction

### Player-Friendly Features (v2.5.0)
- **Double-Click to Open Sheets**: Double-click a party token to open all member character sheets at once
- **Combat Toggle Integration**: Click the combat button on party token to add all members to combat tracker
- **Auto-Roll Initiative**: Automatically rolls initiative for all party members (configurable)
- **Member Access Panel**: Beautiful interactive panel showing member portraits, HP, and active effects
- **Party Chat Commands**: Use `/party status`, `/party members`, or `/party help` for quick party info
- **Health Indicator**: Visual health bar below party token with color-coded status
- **Status Effect Icons**: Shows up to 5 active effects from party members on the token
- **Perception Display**: Shows highest perception value in tooltip (passive perception for D&D 5e, perception modifier for PF2e)
- **Quick Split Member**: Right-click context menu to quickly split one member from party

## Requirements

- **Foundry VTT**: Version 13 or higher
- **lib-wrapper**: Required dependency (install from Foundry's module browser)

## Installation

### Method 1: Foundry Module Browser
1. In Foundry VTT, go to **Add-on Modules**
2. Click **Install Module**
3. Search for "Party Vision"
4. Click **Install**

### Method 2: Manual Installation
1. Download the latest release from [GitHub](https://github.com/jhutc82/party-vision/releases)
2. Extract to your Foundry `Data/modules` folder
3. Enable the module in your world

### Method 3: Manifest URL
Use this manifest URL in Foundry's module installer:
```
https://raw.githubusercontent.com/jhutc82/party-vision/refs/heads/main/module.json
```

## Quick Start Guide

### Basic Workflow

1. **Form a Party**:
   - Select multiple player tokens
   - Click the "Form Party" button in the Token HUD, or
   - Run the "Form Party" macro

2. **Move Together**:
   - Move the party token normally
   - Each player sees using their own character's vision

3. **Deploy Party**:
   - Select the party token
   - Click the "Deploy Party" button in the Token HUD
   - Choose a formation and facing direction
   - Individual tokens are recreated in formation

### Follow-the-Leader Mode

1. Select 2+ tokens
2. Press **Ctrl+L** (or your configured keybind)
3. Move any selected token - the others follow automatically
4. Press **Ctrl+L** again to disable

### Member Management

**Scout Ahead**:
- Right-click party token → "Scout Ahead"
- Select which character to split off
- Character spawns at party location (still in party data)

**Add to Party**:
- Position a token near a party token
- Right-click the token → "Add to Nearby Party"

**Remove Member**:
- Right-click party token → "Remove Member"
- Select which character to remove

### Player-Friendly Features (v2.5.0)

**Double-Click to Open Sheets**:
1. Double-click any party token
2. All member character sheets open automatically
3. Sheets cascade with offset positions for easy viewing

**Combat Integration**:
1. Select a party token
2. Click the combat toggle button (sword icon) on the Token HUD
3. All party members are added to the combat tracker
4. Initiative is automatically rolled (if enabled in settings)

**Member Access Panel**:
1. Right-click party token → "View Party Members"
2. See all members with portraits, HP, and active effects
3. Click portrait to open individual character sheet
4. Click split button to remove member from party

**Party Chat Commands**:
- Type `/party status` to see party health and effects
- Type `/party members` to list all party members
- Type `/party help` to see all available commands
- All responses are whispered to you privately

**Visual Indicators**:
- **Health Bar**: Appears below party token showing aggregate HP
  - Green when party is healthy (>50% HP)
  - Orange when wounded (25-50% HP)
  - Red when critically injured (<25% HP)
- **Status Effects**: Up to 5 effect icons appear at top-left of token
- **Perception Tooltip**: Hover over token to see highest perception value (PP for D&D 5e, modifier for PF2e)

## Module Settings

Access settings via **Configure Settings** → **Module Settings**:

### Core Settings
- **Show HUD Buttons**: Display Form/Deploy buttons on Token HUD
- **Allow Players to Form/Deploy**: Let players use these functions (default: GM only)
- **Auto-Deploy on Combat**: Automatically deploy party when combat starts
- **Auto-Form on Combat End**: Automatically reform party after combat ends
- **Animate Deployment**: Smoothly animate tokens when deploying
- **Show Member Portraits**: Display character portraits around party token
- **Show Range Indicator**: Display party's spread radius

### Player Enhancement Settings (v2.5.0)
- **Auto-Roll Initiative for Party**: Automatically roll initiative when adding party to combat
- **Show Party Health Indicator**: Display aggregate health bar on party token
- **Show Status Effect Indicators**: Display active status effects on party token
- **Show Perception**: Display highest perception value in tooltip (system-agnostic)
- **Double-Click Opens All Sheets**: Enable double-click to open all member sheets
- **Enable Member Access Panel**: Enable member access panel feature

## Tips & Best Practices

1. **Token Requirements**: Tokens must have linked actors to be included in a party
2. **User Character Assignment**: Players must have assigned characters (in user configuration) for individual vision to work
3. **Grid Type**: Module works best with square grids (hex support limited)
4. **Combat Transitions**: Enable "Auto-Deploy on Combat" for seamless exploration-to-combat flow
5. **Tight Spaces**: Use the "Tight" formation preset when deploying in narrow corridors

### Player Enhancement Tips (v2.5.0)
6. **Quick Sheet Access**: Double-click is faster than right-click menu for opening all sheets
7. **Combat Setup**: Use the combat toggle button instead of manually adding each member to combat
8. **Party Status Checks**: Use `/party status` command to quickly check party health without opening sheets
9. **Visual Feedback**: Enable all visual indicators (health bar, status effects) for at-a-glance party status
10. **Member Management**: Use the Member Access Panel for a complete overview before splitting the party

## Keyboard Shortcuts

- **Ctrl+L**: Toggle Follow-the-Leader mode (customizable in Foundry's controls settings)

## Known Limitations

- Only works with square grid maps (hex/gridless support limited)
- Requires players to have assigned characters for vision to work
- Maximum recommended party size: 8 members (for visual clarity)

## Troubleshooting

**Vision not working?**
- Ensure players have assigned characters (User Configuration)
- Check that tokens have the "Has Vision" checkbox enabled
- Verify lib-wrapper is installed and active

**Deployment fails?**
- Ensure there's enough space for the party to deploy
- Try a different formation or direction
- Check for walls/obstacles blocking deployment

**Portraits not showing?**
- Enable "Show Member Portraits" in module settings
- Ensure actors have valid token images
- Refresh the page if portraits don't appear immediately

**Double-click not opening sheets?** (v2.5.0)
- Ensure "Double-Click Opens All Sheets" is enabled in settings
- Make sure you're clicking on the token itself, not empty space
- Verify you have permission to view the character sheets
- Try clicking slightly slower if detection isn't working

**Health/status indicators not showing?** (v2.5.0)
- Check that the respective settings are enabled in module configuration
- Verify party members have HP values set
- Refresh the token by moving it slightly or re-selecting it
- Check console for any PIXI-related errors

**Chat commands not working?** (v2.5.0)
- Commands must start with `/party` (lowercase)
- Ensure you're typing the command in the chat box, not a macro
- Check that you have a party token on the current scene
- Commands are whispered, check your chat filters

**Party not adding to combat?** (v2.5.2)
- Fixed in v2.5.2! Update to the latest version
- Try clicking the combat toggle button on the Token HUD
- Verify all party members have valid actor links
- Check the console (F12) for detailed logging
- Combat encounter will be created automatically if none exists

**Light cycling not showing all sources?** (v2.5.2)
- Fixed in v2.5.2! Torches and lanterns now detected properly
- Make sure light-emitting items are equipped/held/activated
- Right-click the Deploy button to cycle through lights
- Check console (F12) to see which light sources are detected

**Perception not showing correctly in PF2e?** (v2.5.2)
- Fixed in v2.5.2! Now shows perception modifier instead of passive perception
- Hover over party token to see the value
- PF2e shows "Perception: +5", D&D 5e shows "PP: 15"
- Enable "Show Perception" in module settings if disabled

## Development

### Building from Source
```bash
git clone https://github.com/jhutc82/party-vision.git
cd party-vision
# No build process required - pure JavaScript module
```

### File Structure
```
party-vision/
├── module.json           # Module manifest
├── scripts/
│   ├── main.js          # Core functionality
│   └── formations.js    # Formation presets
├── styles/
│   └── party-vision.css # UI styles
└── packs/
    └── macros.db        # Macro compendium
```

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with clear description of changes

## License

This module is licensed under the MIT License. See LICENSE file for details.

## Credits

**Author**: jhutc82
**Module ID**: party-vision
**Foundry VTT**: Compatible with v13+

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Support

- **Issues**: [GitHub Issues](https://github.com/jhutc82/party-vision/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jhutc82/party-vision/discussions)

---

*If you enjoy this module, consider leaving a rating on the Foundry VTT package page!*
