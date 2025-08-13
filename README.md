# Potential Potato

Electron + Vue + Vite starter that targets macOS and Raspberry Pi (armv7l/arm64).

## Develop

```bash
# install deps
npm install

# start renderer + bundle main/preload and launch Electron
npm run dev
```

## Build installers

```bash
# Build renderer and bundle main/preload, then package for your platform
npm run dist
```

On Raspberry Pi, prefer Node 18 LTS or newer. For 32-bit Pi (armv7l), build on the Pi itself for best compatibility.
