# Party Vision - Complete Deployment Guide

## Table of Contents
1. [Testing on Forge VTT](#part-1-testing-on-forge-vtt)
2. [Public Release on GitHub](#part-2-public-release-on-github)
3. [Publishing to Foundry VTT Website](#part-3-publishing-to-foundry-vtt-website)
4. [Post-Release Maintenance](#part-4-post-release-maintenance)

---

# Part 1: Testing on Forge VTT

## Step 1: Prepare Your Module Files

Create the following folder structure on your local computer:

```
party-vision/
├── module.json
├── LICENSE
├── README.md
├── CHANGELOG.md
├── scripts/
│   ├── main.js
│   └── formations.js
├── styles/
│   └── party-vision.css
└── packs/
    └── macros.db
```

**All files are provided above in this guide.**

## Step 2: Create ZIP Package

### On Windows:
1. Right-click the `party-vision` folder
2. Select "Send to" → "Compressed (zipped) folder"
3. Rename to `party-vision.zip`

### On Mac:
1. Right-click the `party-vision` folder
2. Select "Compress 'party-vision'"
3. Rename to `party-vision.zip`

### On Linux:
```bash
cd /path/to/parent/directory
zip -r party-vision.zip party-vision/
```

**Important**: The ZIP should contain the folder structure, not just the files. When you open the ZIP, you should see a `party-vision` folder, not the files directly.

## Step 3: Install lib-wrapper Dependency

1. Log into **The Forge** (https://forge-vtt.com)
2. Go to your game world
3. Click **"Configure Settings"** (gear icon)
4. Click **"Manage Modules"**
5. Click **"Install Module"**
6. Search for **"lib-wrapper"**
7. Click **"Install"**
8. Wait for installation to complete

## Step 4: Upload Module to Forge

1. Still in your Forge game, go to **"Manage Modules"**
2. Click **"Install Module"** again
3. Click the **"Choose File"** button (or drag-and-drop area)
4. Select your `party-vision.zip` file
5. Click **"Install"**
6. Wait for the upload to complete

**Alternative Method - Using Bazaar**:
1. In Forge, go to **"Bazaar"**
2. Click **"Import Module"** at the top
3. Upload your `party-vision.zip`

## Step 5: Activate the Module

1. In your game world, click **"Manage Modules"**
2. Find **"lib-wrapper"** and check its checkbox
3. Find **"Party Vision"** and check its checkbox
4. Click **"Save Module Settings"**
5. The page will reload

## Step 6: Verify Installation

After reload, verify the module loaded correctly:

1. Open the browser console (F12)
2. Look for these messages:
   ```
   Party Vision | Initializing Enhanced Module v2.0
   Party Vision | Module Ready
   ```
3. If you see errors, check the troubleshooting section below

## Step 7: Test Core Functionality

### Test 1: Form Party
1. Create or select 3-4 player tokens on a map
2. Select all of them (click and drag, or Shift+click)
3. Right-click one token → you should see a HUD appear
4. Click the **Users icon** (Form Party button)
5. Verify:
   - Individual tokens disappear
   - A new "The Party" token appears
   - Token is the size of the largest member

### Test 2: Individual Vision
1. With the Party Token on the map
2. Log in as different players (or use "Configure Players" to assign yourself a character)
3. Each player should see from the party token using their own character's vision
4. Test with characters that have different vision (darkvision vs normal)

### Test 3: Deploy Party
1. Select the Party Token
2. Click the **Users-Slash icon** (Deploy Party button)
3. A dialog should appear with:
   - Formation options
   - Direction grid
4. Select a formation and direction
5. Click **"Deploy"**
6. Verify:
   - Party token disappears
   - Individual tokens reappear in formation
   - They face the chosen direction

### Test 4: Follow-the-Leader Mode
1. Select 2-3 tokens
2. Press **Ctrl+L** (or Command+L on Mac)
3. You should see: "Follow-the-Leader mode enabled. [Name] is the leader."
4. Move the first selected token
5. Other tokens should follow automatically
6. Press **Ctrl+L** again to disable

### Test 5: Auto-Deploy on Combat
1. Form a party
2. Go to **Configure Settings** → **Module Settings**
3. Ensure "Auto-Deploy on Combat" is enabled
4. Create a combat encounter
5. Add the party token to combat
6. Start combat (click the play button)
7. Party should automatically deploy

### Test 6: Member Management
1. Form a party
2. Right-click the party token
3. You should see context menu options:
   - "Scout Ahead"
   - "Remove Member"
4. Test "Scout Ahead":
   - Select a character
   - They should spawn at party location
5. Place another token near the party
6. Right-click it → "Add to Nearby Party"
7. Token should join the party

### Test 7: Visual Indicators
1. Verify you see character portraits around the party token
2. Verify you see a blue range circle
3. As GM, hover over the party token
4. You should see ghosted previews of where tokens would deploy

### Test 8: Module Settings
1. Go to **Configure Settings** → **Module Settings**
2. Find the "Party Vision" section
3. Verify all settings are present:
   - Show HUD Buttons
   - Allow Players to Form/Deploy Party
   - Auto-Deploy on Combat Start
   - Show Member Portraits
   - Show Range Indicator
   - Show Ghosted Preview on Hover

### Test 9: Edge Cases
1. Test with mixed token sizes (Medium + Large)
2. Test deploying into/near walls
3. Test deploying in a tight space
4. Test with tokens that have no linked actor (should be skipped with warning)

## Troubleshooting - Forge

### Module Won't Install
- **Error**: "Invalid module structure"
  - **Fix**: Ensure your ZIP contains a `party-vision` folder, not files directly
  - Re-create the ZIP ensuring folder structure is correct

### Module Doesn't Appear in List
- **Fix**: Refresh the page completely (Ctrl+F5)
- Check Forge's module storage limit hasn't been reached

### lib-wrapper Error
- **Error**: "Party Vision requires lib-wrapper"
  - **Fix**: Install lib-wrapper from the module browser first
  - Ensure lib-wrapper is activated BEFORE Party Vision

### Vision Not Working
- **Cause**: Player has no assigned character
  - **Fix**: Go to "Configure Players" and assign characters to users

### Macros Not Found
- **Error**: "Party Vision macro not found!"
  - **Fix**: Check that `macros.db` is in the correct location
  - Try disabling and re-enabling the module

### Console Errors
If you see errors in console (F12):
1. Copy the full error message
2. Check that all files are present in your ZIP
3. Verify the file content matches the provided code exactly

---

# Part 2: Public Release on GitHub

## Step 1: Create GitHub Account

1. Go to https://github.com
2. Click "Sign up"
3. Follow the registration process
4. Verify your email

## Step 2: Create a New Repository

1. Click the **"+"** icon in top-right → "New repository"
2. Repository name: `party-vision`
3. Description: `A Foundry VTT module for streamlined party movement with individual vision preservation`
4. Select **"Public"**
5. Check **"Add a README file"** (we'll replace it)
6. Choose license: **MIT License**
7. Click **"Create repository"**

## Step 3: Upload Your Files

### Method A: Web Upload (Easier)

1. In your new repository, click **"Add file"** → "Upload files"
2. Drag and drop ALL your module files:
   - module.json
   - README.md
   - CHANGELOG.md
   - LICENSE (might already exist)
   - scripts/ folder (with main.js and formations.js)
   - styles/ folder (with party-vision.css)
   - packs/ folder (with macros.db)
3. Commit message: "Initial release - v2.0.0"
4. Click **"Commit changes"**

### Method B: Git Command Line (Advanced)

```bash
# Navigate to your party-vision folder
cd /path/to/party-vision

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial release - v2.0.0"

# Add remote
git remote add origin https://github.com/YOUR-USERNAME/party-vision.git

# Push
git branch -M main
git push -u origin main
```

## Step 4: Create a Release

1. In your repository, click **"Releases"** (right sidebar)
2. Click **"Create a new release"**
3. Click **"Choose a tag"** → type `v2.0.0` → "Create new tag"
4. Release title: `Party Vision v2.0.0 - Enhanced Edition`
5. Description:
   ```markdown
   ## Party Vision v2.0.0 - Enhanced Edition
   
   Complete rewrite with major new features!
   
   ### New Features
   - Follow-the-Leader mode (Ctrl+L)
   - Auto-deploy on combat start
   - Visual member indicators with portraits
   - Formation presets (tight, wide, column, line, wedge)
   - Quick member management (Scout Ahead, Add/Remove)
   - Ghosted deployment preview
   - Range indicator
   - Smart default facing
   
   ### Installation
   Use this manifest URL in Foundry VTT:
   ```
   https://github.com/YOUR-USERNAME/party-vision/releases/latest/download/module.json
   ```
   
   ### Requirements
   - Foundry VTT v13+
   - lib-wrapper module
   
   See README.md for full documentation.
   ```
6. Click **"Publish release"**

## Step 5: Get Your URLs

After publishing the release, you need two important URLs:

### A. Manifest URL
1. Go to your repository main page
2. Click on `module.json` file
3. Click the **"Raw"** button
4. Copy the URL from your browser's address bar
5. It should look like:
   ```
   https://raw.githubusercontent.com/YOUR-USERNAME/party-vision/main/module.json
   ```

### B. Download URL
1. Go to your **"Releases"** page
2. Find your v2.0.0 release
3. Right-click the **"Source code (zip)"** link
4. Select "Copy link address"
5. It should look like:
   ```
   https://github.com/YOUR-USERNAME/party-vision/archive/refs/tags/v2.0.0.zip
   ```

## Step 6: Update module.json with URLs

**CRITICAL STEP**: You must update your module.json file with the correct URLs.

1. In GitHub, click on `module.json`
2. Click the **pencil icon** (Edit this file)
3. Update these fields:
   ```json
   "url": "https://github.com/YOUR-USERNAME/party-vision",
   "manifest": "https://raw.githubusercontent.com/YOUR-USERNAME/party-vision/main/module.json",
   "download": "https://github.com/YOUR-USERNAME/party-vision/archive/refs/tags/v2.0.0.zip"
   ```
4. Replace `YOUR-USERNAME` with your actual GitHub username
5. Commit message: "Update URLs in module.json"
6. Click **"Commit changes"**

**Important**: Every time you create a new release (e.g., v2.0.1), you must update the `download` URL to match the new version tag.

## Step 7: Test the Manifest URL

1. Open a new Foundry VTT world (not Forge - use local install for testing)
2. Go to "Add-on Modules"
3. Click "Install Module"
4. Paste your **Manifest URL** into the field
5. Click "Install"
6. If it works, proceed to public release!

---

# Part 3: Publishing to Foundry VTT Website

## Prerequisites

Before submitting to Foundry:
- ✅ Module fully tested on Forge
- ✅ GitHub repository public and complete
- ✅ Release created (v2.0.0)
- ✅ module.json URLs updated correctly
- ✅ Manifest URL tested and working

## Step 1: Create Foundry Account

1. Go to https://foundryvtt.com
2. Click "Sign In" (top right)
3. If you don't have an account:
   - Click "Register"
   - Fill out the form
   - Verify your email

## Step 2: Access Package Management

1. After logging in, click your username (top right)
2. Select **"My Account"**
3. In the left sidebar, click **"Packages"**
4. Click **"Create Package"** button

## Step 3: Submit Your Package

### Basic Information

Fill out the form:

**Package Type**: Module

**Package Title**: `Party Vision`

**Short Name**: `party-vision`

**Description**:
```
A Foundry VTT module for streamlined party movement with individual vision preservation. Create party tokens that move as one unit while each player sees using their character's unique vision. Includes follow-the-leader mode, auto-deploy on combat, formation presets, visual indicators, and quick member management.
```

**Manifest URL**:
```
https://raw.githubusercontent.com/YOUR-USERNAME/party-vision/main/module.json
```
(Replace YOUR-USERNAME)

### Categories & Tags

**Primary Category**: Automation & Workflow

**Additional Tags**:
- Tokens
- Combat
- Utility
- Quality of Life

### Media

**Package Icon**: 
- Upload a 512x512 PNG image (optional)
- You can use a generic "party" icon or the Font Awesome users icon

**Screenshots** (highly recommended):
1. Take screenshots showing:
   - Party token with member portraits
   - Deploy dialog with formations
   - Before/after forming party
   - Follow-the-leader in action
2. Upload 3-5 screenshots

**Video** (optional but helpful):
- Create a short demo video (1-2 minutes)
- Upload to YouTube
- Paste the YouTube URL

### Compatibility

**Minimum Core Version**: `13`

**Verified Core Version**: `13`

**Systems**: 
- Leave this blank (system-agnostic)
- Or check specific systems you've tested with

### Dependencies

**Required Modules**:
- Add `lib-wrapper` as a required dependency
- Minimum version: `1.12.0`

### Code Repository & Links

**Repository URL**: `https://github.com/YOUR-USERNAME/party-vision`

**Bugs URL**: `https://github.com/YOUR-USERNAME/party-vision/issues`

**Changelog URL**: `https://github.com/YOUR-USERNAME/party-vision/blob/main/CHANGELOG.md`

**License URL**: `https://github.com/YOUR-USERNAME/party-vision/blob/main/LICENSE`

### README

Paste your entire README.md content into this field.

## Step 4: Review & Submit

1. Review all fields carefully
2. Check the "I agree to the terms" checkbox
3. Click **"Submit Package"**

## Step 5: Wait for Approval

- Foundry staff will review your submission (typically 1-7 days)
- You'll receive an email when it's approved or if changes are needed
- Common reasons for rejection:
  - Manifest URL not working
  - Missing required fields
  - Conflicts with existing packages
  - Technical issues in code

## Step 6: After Approval

Once approved:
1. Your module will appear in Foundry's module browser
2. Users can install it directly from within Foundry VTT
3. You'll receive notifications about reviews and ratings

---

# Part 4: Post-Release Maintenance

## Updating Your Module

When you want to release an update (e.g., v2.0.1):

### Step 1: Update Your Code
1. Make your changes locally
2. Update version in `module.json`:
   ```json
   "version": "2.0.1"
   ```
3. Update `CHANGELOG.md` with new changes

### Step 2: Commit to GitHub
```bash
git add .
git commit -m "Release v2.0.1 - Bug fixes"
git push
```

### Step 3: Create New Release
1. Go to GitHub → Releases → "Draft a new release"
2. Tag: `v2.0.1`
3. Title: `Party Vision v2.0.1`
4. Describe changes
5. Publish release

### Step 4: Update module.json Download URL
1. Get the new download URL for v2.0.1
2. Update `module.json` on GitHub:
   ```json
   "download": "https://github.com/YOUR-USERNAME/party-vision/archive/refs/tags/v2.0.1.zip"
   ```
3. Commit the change

### Step 5: Users Auto-Update
- Users will automatically see the update in Foundry
- They can update with one click
- No need to resubmit to Foundry (it reads your manifest URL automatically)

## Handling Issues

When users report issues:

1. **GitHub Issues**: 
   - Users will report bugs at `https://github.com/YOUR-USERNAME/party-vision/issues`
   - Respond promptly and professionally
   - Create fixes and new releases

2. **Foundry Forums**:
   - Monitor the Foundry VTT Discord
   - Check forums for discussions about your module

3. **Version Support**:
   - When new Foundry versions release, test compatibility
   - Update `verified` field in module.json

## Best Practices

1. **Semantic Versioning**:
   - Patch (2.0.X): Bug fixes
   - Minor (2.X.0): New features, backwards compatible
   - Major (X.0.0): Breaking changes

2. **Test Before Release**:
   - Always test on Forge first
   - Test with multiple Foundry versions if possible
   - Have beta testers if making major changes

3. **Documentation**:
   - Keep README up to date
   - Maintain clear CHANGELOG
   - Respond to questions in issues

4. **Communication**:
   - Announce updates on Discord
   - Thank users for feedback and contributions
   - Be transparent about known issues

---

# Quick Reference

## URLs You'll Need

Replace `YOUR-USERNAME` with your GitHub username:

- **Repository**: `https://github.com/YOUR-USERNAME/party-vision`
- **Manifest**: `https://raw.githubusercontent.com/YOUR-USERNAME/party-vision/main/module.json`
- **Download**: `https://github.com/YOUR-USERNAME/party-vision/archive/refs/tags/v2.0.0.zip`
- **Issues**: `https://github.com/YOUR-USERNAME/party-vision/issues`
- **License**: `https://github.com/YOUR-USERNAME/party-vision/blob/main/LICENSE`

## Common Commands

```bash
# Create ZIP for Forge testing
zip -r party-vision.zip party-vision/

# Git workflow for updates
git add .
git commit -m "Description of changes"
git push

# Create new release (on GitHub website)
# Releases → Draft new release → Tag v2.0.X
```

## Support Resources

- **Foundry Discord**: https://discord.gg/foundryvtt
- **Foundry Developer Docs**: https://foundryvtt.com/api/
- **lib-wrapper Docs**: https://github.com/ruipin/fvtt-lib-wrapper

---

# Congratulations!

You now have a complete, enhanced Party Vision module ready for:
1. ✅ Testing on Forge VTT
2. ✅ Public release on GitHub
3. ✅ Official publication on Foundry VTT

Your module includes all the enhanced features and is production-ready!
