# Party Vision

**A Foundry VTT module for streamlined party movement with individual vision preservation**

## Overview

Party Vision solves the common problem in online TTRPGs where GMs must manually move multiple player tokens during dungeon crawls. This module allows you to combine multiple tokens into a single "Party Token" that moves as one unit while each player still sees from their character's unique vision (darkvision, blindsight, etc.).

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
- **Ghosted Preview**: Hover over party token to see where members would deploy (GM only)
- **Quick Member Management**: Right-click context menu for:
  - Scout Ahead: Temporarily split one character out
  - Add to Party: Add nearby tokens
  - Remove Member: Remove characters from party
- **Formation Presets**: Choose from multiple deployment formations (tight, wide, column, line, wedge)
- **Smart Default Facing**: Remembers last deployment direction

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
1. Download the latest release from [GitHub](https://github.com/yourusername/party-vision/releases)
2. Extract to your Foundry `Data/modules` folder
3. Enable the module in your world

### Method 3: Manifest URL
Use this manifest URL in Foundry's module installer:
```
https://github.com/yourusername/party-vision/releases/latest/download/module.json
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

## Module Settings

Access settings via **Configure Settings** → **Module Settings**:

- **Show HUD Buttons**: Display Form/Deploy buttons on Token HUD
- **Allow Players to Form/Deploy**: Let players use these functions (default: GM only)
- **Auto-Deploy on Combat**: Automatically deploy party when combat starts
- **Show Member Portraits**: Display character portraits around party token
- **Show Range Indicator**: Display party's spread radius
- **Show Ghosted Preview**: Show deployment preview on hover (GM only)

## Tips & Best Practices

1. **Token Requirements**: Tokens must have linked actors to be included in a party
2. **User Character Assignment**: Players must have assigned characters (in user configuration) for individual vision to work
3. **Grid Type**: Module works best with square grids (hex support limited)
4. **Combat Transitions**: Enable "Auto-Deploy on Combat" for seamless exploration-to-combat flow
5. **Tight Spaces**: Use the "Tight" formation preset when deploying in narrow corridors

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

## Development

### Building from Source
```bash
git clone https://github.com/yourusername/party-vision.git
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

**Author**: Your Name Here
**Module ID**: party-vision
**Foundry VTT**: Compatible with v13+

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/party-vision/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/party-vision/discussions)
- **Discord**: Find me on the Foundry VTT Discord server

---

*If you enjoy this module, consider leaving a rating on the Foundry VTT package page!*
