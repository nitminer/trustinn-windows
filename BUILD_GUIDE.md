# Build & Release Guide

This directory contains scripts to automate building and releasing Trustinn Windows App.

## Scripts

### 1. `release.sh` - Create a Tagged Release (Production)

Creates a new version, tags it, and pushes to GitHub for automated release.

**Usage:**
```bash
./release.sh <tag> <commit-message>
```

**Parameters:**
- `<tag>`: Git tag with version (e.g., `v0.0.7`, `v1.0.0`)
- `<commit-message>`: Commit message describing changes

**Examples:**
```bash
./release.sh v0.0.7 "Add auto-update feature"
./release.sh v1.0.0 "Major release with new UI"
./release.sh v0.0.8 "Fix Windows installer issue"
```

**What it does:**
1. Updates `package.json` version
2. Commits with your message
3. Creates git tag (`v0.0.7`)
4. Pushes to GitHub
5. Triggers GitHub Actions workflow
6. Builds Windows installer and portable .exe
7. Creates GitHub release with downloads

**Result:** Your Windows app will detect this as an update and auto-install it!

---

### 2. `dev-release.sh` - Push to Main Branch (Development)

Pushes changes to main branch without creating a release tag. Useful for development builds.

**Usage:**
```bash
./dev-release.sh <commit-message>
```

**Parameters:**
- `<commit-message>`: Commit message describing changes

**Examples:**
```bash
./dev-release.sh "Fix UI bug"
./dev-release.sh "Update dependencies"
./dev-release.sh "Add new feature"
```

**What it does:**
1. Commits all changes with your message
2. Pushes to main branch
3. Triggers GitHub Actions workflow (development build)
4. Builds but doesn't create release (no auto-update)

---

## Workflow

### For Production Release (User-Facing Updates)

```bash
# Make your changes to the code
vim index.html main.js preload.js

# Create a tagged release
./release.sh v0.0.8 "Your description of changes"

# Monitor build at: https://github.com/nitminer/trustinn-windows/actions
# Installed app will auto-update!
```

### For Development/Testing

```bash
# Make your changes
vim index.html

# Push to main (development build)
./dev-release.sh "Fix something"

# Build runs but no release created
```

---

## Quick Commands Reference

| Task | Command |
|------|---------|
| Release v0.0.7 | `./release.sh v0.0.7 "Your message"` |
| Release v0.0.8 | `./release.sh v0.0.8 "Your message"` |
| Dev build | `./dev-release.sh "Your message"` |
| Check version | `node -e "console.log(require('./package.json').version)"` |
| View builds | https://github.com/nitminer/trustinn-windows/actions |
| View releases | https://github.com/nitminer/trustinn-windows/releases |

---

## Version History

- **v0.0.5**: First stable release
- **v0.0.6**: Auto-update testing
- v0.0.7+: Your releases here

---

## Auto-Update Flow

When you run `./release.sh X.X.X`:

1. GitHub Actions builds your app
2. Creates release with `.exe` files
3. Generates `latest.yml` with version info
4. Installed v0.0.5 checks for updates
5. **Finds v0.0.7 available**
6. **User clicks "Update"**
7. **App downloads, installs, restarts**

---

## Troubleshooting

**"Permission denied" error?**
```bash
chmod +x release.sh dev-release.sh
```

**Script fails at git push?**
- Verify GitHub credentials are configured
- Check git remote: `git remote -v`

**Build fails on GitHub Actions?**
- Check workflow at: https://github.com/nitminer/trustinn-windows/actions
- View job logs for details

---

Enjoy automated releases! 🚀
