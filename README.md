# potential-potato

A cross-platform Electron application built with TypeScript and Vite.

## Development

### Prerequisites

- Node.js 20+
- pnpm

### Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm start

# Lint code
pnpm run lint
```

## Building

### Local Builds

```bash
# Build for current platform
pnpm run make

# Build for specific platforms
pnpm run make:macos      # macOS (Intel + Apple Silicon)
pnpm run make:windows    # Windows x64
pnpm run make:linux      # Linux x64
pnpm run make:rpi        # Raspberry Pi (ARM64)
pnpm run make:rpi-legacy # Raspberry Pi Legacy (ARM32)
```

### Automated Releases

The project uses GitHub Actions to automatically build and release for all supported platforms:

- **CI**: Tests builds on all platforms for pull requests
- **Release**: Creates releases with binaries for all platforms when code is merged to `main`

#### Supported Platforms

- **macOS**: Intel and Apple Silicon (`.zip`)
- **Windows**: x64 (`.exe` installer)
- **Linux**: x64 (`.deb` and `.rpm` packages)
- **Raspberry Pi OS**: ARM64 and ARM32 (`.deb` packages)

#### Installation

- **macOS**: Download and extract the `.zip` file
- **Windows**: Run the `.exe` installer
- **Ubuntu/Debian**: `sudo dpkg -i potential-potato_*.deb`
- **CentOS/RHEL/Fedora**: `sudo rpm -i potential-potato_*.rpm`
- **Raspberry Pi**: `sudo dpkg -i potential-potato_*_arm64.deb`

## Auto-Updates

The application includes fully automatic update functionality that:

- **Checks for updates hourly** when running in production
- **Downloads updates automatically** without user interaction
- **Shows progress notifications** during download
- **Automatically restarts** when update is ready (perfect for headless operation)
- **Works on all platforms** including Raspberry Pi OS
- **Designed for unattended operation** - no keyboard/mouse required

### Configuration

To enable auto-updates, you need to:

1. Update the GitHub repository information in:
   - `package.json` - Set correct repository URL
   - `src/updater/index.ts` - Set your GitHub username and repo name

2. Ensure your GitHub releases are properly tagged and contain the correct assets

### Update Process (Fully Automatic)

1. App starts and checks GitHub for newer releases
2. If found, download starts automatically (no user interaction)
3. Download progress is shown in a notification
4. When complete, app automatically restarts after 3 seconds
5. On Raspberry Pi, the .deb package is seamlessly installed
6. Perfect for headless Raspberry Pi installations!

## Features

### Image Caching
The application includes intelligent image caching:
- **In-memory cache** of the last loaded image
- **Instant display** when app starts (no waiting for first SMB load)
- **Seamless transitions** between cached and new images
- **Perfect for slow network connections** to SMB shares

### Smart Image Rotation
The application ensures variety in image display:
- **No duplicate images** - never shows the same image twice in a row
- **Intelligent filtering** - current image is excluded from random selection
- **Robust handling** - gracefully handles edge cases (single image, etc.)
- **Filename-based tracking** - uses filename to identify current image

## Architecture

- **Main Process**: `src/main.ts` - Electron main process with image caching
- **Preload**: `src/preload.ts` - Secure bridge between main and renderer
- **Renderer**: `src/renderer.ts` - Frontend application
- **Updater**: `src/updater/index.ts` - Auto-update functionality
- **Components**: `src/components/` - UI components including update notifications
- **Build**: Vite for bundling, Electron Forge for packaging
