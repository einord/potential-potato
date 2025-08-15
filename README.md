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

## Mouse positioning on startup (Raspberry Pi)

The app tries to move the mouse cursor to the bottom-right corner on startup (useful for kiosk setups). This is implemented via the autostart .desktop file and is best-effort:

- X11: requires xdotool and xdpyinfo
  - Install: `sudo apt-get update && sudo apt-get install -y xdotool x11-utils`
- Wayland: requires ydotool (and the ydotoold daemon)
  - Install: `sudo apt-get update && sudo apt-get install -y ydotool`
  - Enable daemon: `sudo systemctl enable --now ydotoold`
  - Resolution detection tries wlr-randr (wlroots) or swaymsg. If not available, you can set fallback env vars below.

Optional environment fallbacks (Wayland):
- `POTATO_SCREEN_WIDTH` and `POTATO_SCREEN_HEIGHT` can be exported to provide the screen resolution if it cannot be detected.

Notes:
- On Wayland, pointer warping is restricted; ydotool works via uinput and may require additional permissions depending on your distro.
- If none of the tools are available, the app will simply start without moving the cursor.
