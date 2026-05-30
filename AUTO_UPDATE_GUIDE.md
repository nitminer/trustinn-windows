# Trustinn Windows App - Setup & Build Guide

## Auto-Update Feature

This Electron app includes a built-in auto-update system that checks for new versions on GitHub Releases and prompts users to install them.

### How It Works

1. **Automatic Checks**: The app checks for updates every 60 seconds
2. **User Notification**: When an update is available, the app displays:
   - "Update available: vX.X.X. Downloading now..."
   - Progress percentage while downloading
   - "Ready to install" button when complete
3. **One-Click Update**: User clicks the button to restart and install the update automatically

### Release Process

To release a new version with auto-update support:

```bash
# 1. Tag the version
git tag -a vX.X.X -m "Version X.X.X"

# 2. Push the tag (this triggers GitHub Actions)
git push origin vX.X.X

# 3. GitHub Actions will:
#    - Build Windows installers (.exe files)
#    - Create a GitHub Release
#    - Upload .exe files to the release
#    - Generate update metadata for electron-updater
```

### GitHub Setup Requirements

For the auto-update and release system to work, set these secrets in your GitHub repository:

1. **Go to**: Repository Settings → Secrets and variables → Actions
2. **Add Secret**: `GH_TOKEN`
   - Value: Your GitHub Personal Access Token with `repo` scope
   - This allows the workflow to upload build artifacts to releases

```bash
# Or from command line:
gh secret set GH_TOKEN --body "your-github-token"
```

### Environment Variables (Workflow)

The GitHub Actions workflow requires:

```env
# .github/workflows/ci-cd.yml uses:
GH_TOKEN          # GitHub token for uploading releases
GITHUB_TOKEN      # Provided automatically by GitHub
```

### Testing Auto-Updates Locally

1. **Build the app**:
   ```bash
   npm install
   npm run dist
   ```

2. **Create a GitHub Release** with the built .exe files:
   - Go to GitHub repository → Releases → Create Release
   - Tag: `vX.X.X`
   - Upload the .exe files from `dist/` folder

3. **Update app version** in `package.json` to an older version (e.g., `0.0.1`)

4. **Run the app** - it should detect the newer version and prompt to update

### Build Configuration

The `package.json` includes electron-builder configuration:

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "nitminer",
        "repo": "trustinn-windows"
      }
    ],
    "win": {
      "target": ["nsis", "portable"]
    }
  }
}
```

This generates:
- **NSIS Installer**: `Trustinn Windows App Setup X.X.X.exe` (recommended for users)
- **Portable Version**: `Trustinn Windows App X.X.X.exe` (no installation needed)

### Troubleshooting

**"No .exe files in release"**
- Check GitHub Actions workflow logs
- Verify `GH_TOKEN` is set correctly
- Ensure Docker is available if building locally

**"Update not detected"**
- Verify GitHub Release exists with proper tag
- Check app console logs for update check messages
- Ensure version in `package.json` is older than release version

**"Download fails"**
- Check network connectivity
- Verify GitHub Release has uploaded .exe files
- Check error logs in app console

### File Structure

```
trustinn-windows/
├── main.js              # Auto-updater initialization
├── preload.js           # IPC bridge for update notifications
├── index.html           # Update UI with progress
├── package.json         # Version & build config
├── Dockerfile           # Windows build container
└── .github/workflows/
    └── ci-cd.yml        # GitHub Actions release workflow
```

### Key Files Modified for Auto-Update

1. **main.js**: 
   - Initializes `electron-updater`
   - Listens to update events
   - Sends status to renderer via IPC

2. **preload.js**: 
   - Securely exposes update methods to renderer
   - Handles `getAppVersion()`, `onUpdateStatus()`, `requestRestartAndUpdate()`

3. **index.html**: 
   - Displays update status and progress
   - Shows "Restart and Install" button
   - Real-time progress bar during download

4. **.github/workflows/ci-cd.yml**: 
   - Builds on version tags (`v*`)
   - Uploads to GitHub Releases
   - Generates update metadata

### Version Numbering

Follow semantic versioning:
- `0.0.1` - Initial release
- `0.0.2` - Bug fixes, patches
- `0.1.0` - Minor features
- `1.0.0` - Major release

Tag format: `vX.Y.Z`
