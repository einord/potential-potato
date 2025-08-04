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

## Architecture

- **Main Process**: `src/main.ts` - Electron main process
- **Preload**: `src/preload.ts` - Secure bridge between main and renderer
- **Renderer**: `src/renderer.ts` - Frontend application
- **Build**: Vite for bundling, Electron Forge for packaging
