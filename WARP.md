# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Projektöversikt
- Stack: Electron + Vue 3 + Vite (TypeScript)
- Målplattformar: macOS och Raspberry Pi (armv7l/arm64). Linux-paketering sker som AppImage.
- Node: >= 18 (enforced via package.json "engines")

Vanliga kommandon
- Installera beroenden
```bash path=null start=null
npm install
```
- Utvecklingsläge (startar Vite och Electron med HMR)
```bash path=null start=null
npm run dev
```
- Bygga (renderer + bundle av main/preload)
```bash path=null start=null
npm run build
```
- Starta den byggda appen lokalt (kräver build först)
```bash path=null start=null
npm run build && npm run start
```
- Lint/format/typecheck
```bash path=null start=null
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
```
- Rensa byggartefakter
```bash path=null start=null
npm run clean
```
- Paketera installers
```bash path=null start=null
# Packa för aktuell plattform
npm run dist

# macOS (DMG/ZIP)
npm run dist:mac

# Linux AppImage
npm run dist:linux:arm64
npm run dist:linux:armv7l
```
- Tester: inget testsystem är konfigurerat i denna kodbas i nuläget.

Arkitektur (big picture)
- Byggkonfiguration (vite.config.ts)
  - Vite driver renderer-bygget och använder vite-plugin-electron för att bygga två separata CJS-buntar:
    - Main: src/main/index.ts → dist-electron/main/index.js
    - Preload: src/preload/index.ts → dist-electron/preload/index.js
  - electron-log markeras som external i main-bundlingen. Dev-servern kör på port 5173.

- Processlager och dataflöde
  1) Main process (src/main)
     - index.ts: Skapar BrowserWindow (fullskärm endast i paketerad app), initierar Updater, publicerar IPC-handlers (t.ex. get-app-version, renderer-ready, get-cached-image) och sätter upp menyvalet “Sök efter uppdatering nu”.
     - load-images.ts: 
       - Laddar och bevakar SMB-konfiguration från användarens Electron userData-katalog (pp-smb.json).
       - Upprättar SMB-klient (v9u-smb2), hämtar remote settings från settings.json i konfigurerad katalog, och väljer en bild att visa.
       - Bildval: prioriterar dagens katalog (MM-DD), därefter månad (MM), annars rot. Undviker att välja samma bild två gånger i rad.
       - Cachar aktuell bild (filename + data URL + settings) och skickar events till renderer:
         - 'remote-settings-updated' (nya remote settings)
         - 'new-image' (ny bild som data URL)
       - Felväg: generiska appfel buffras tidigt och skickas som 'app-error' till renderer när den är redo.
       - Refresh-timer: styrs av remoteSettings.refreshRate och sätts till refreshRate*1000 ms. Ange därför refreshRate i sekunder i settings.json.
     - smb-settings.ts: Typdefinitioner och defaultvärden för SMB-inställningar (host, share, username, password, domain, directory).
     - app-config.ts: Förvalt repo för uppdateringar ('einord/potential-potato'). Kan överskuggas med env-variabeln UPDATE_REPO (format "owner/repo").
     - updater.ts: Manuell updaterare via GitHub Releases-API. Hittar rätt artefakt per plattform, laddar ner med progress, och hanterar omstart.
       - Linux-specifikt: 
         - Länkar ~/.local/bin/potential-potato till den senaste AppImage-filen i ~/Applications
         - Skapar ~/.config/autostart/potential-potato.desktop som vid inloggning försöker flytta muspekaren ned till höger (se nedan) och startar appen via den stabila symlänken.
         - Städar bort äldre AppImage-versioner och undviker att radera den körande binären.
       - Renderer-notifieringar: 'update-checking', 'update-available', 'update-not-available', 'update-download-progress', 'update-downloaded', 'update-error', 'update-restarting'.

  2) Preload (src/preload)
     - index.ts: Översätter IPC från main till DOM CustomEvents på window och exponerar ett säkert API via contextBridge som renderer kan konsumera.
       - window.api:
         - getVersion(), rendererReady(), getCachedImage()
         - updater-event-API (on/off) för uppdateringsstatusar
         - on/off för fjärrinställningar och nya bilder

  3) Renderer (src/renderer)
     - main.ts: Bootstrapp av Vue-app.
     - App.vue: Visar bildkomponenten och toasts. Hämtar appversion via preload-API och anmäler rendererReady efter att lyssnare kopplats på så att buffrade fel kan dräneras.
     - components/ImageViewer.vue: Dubbelbuffrad bildvisning (två lager) för mjuka övergångar. Lyssnar på nya bilder och fjärrinställningar.
     - components/UpdaterToast.vue: Visualiserar updateringsflödet (tillgänglig, progress, nedladdad, countdown till omstart).
     - composables/useRemoteSettings.ts och lib/events.ts: Hjälpare för att prenumerera på DOM-event från preload och hålla en reaktiv settings-modell synkad i UI.

- SMB-konfiguration och fjärrinställningar
  - Lokal SMB-konfig: Electron userData/pp-smb.json (skapas automatiskt om den saknas) med fälten:
    - host, share, username, password, domain, directory
  - Fjärrinställningar: settings.json i den konfigurerade SMB-katalogen. 
    - Nycklar (se src/shared-types/remote-settings.ts):
      - refreshRate (sekunder), passepartoutColor, passepartoutWidth, transitionDuration (ms), showAppVersion
    - Observera: Main tolkar refreshRate som sekunder och multiplicerar med 1000 för timerintervall.

- Uppdateringar och miljövariabler
  - UPDATE_REPO: Sätt till "owner/repo" för att överskugga inbyggt repo. Exempel vid paketering:
```bash path=null start=null
UPDATE_REPO=din-org/ditt-repo npm run dist
```

- CI/CD (GitHub Actions)
  - .github/workflows/release.yml: Vid merge av PR till main:
    - Beräknar månadsbaserad version (YY.M.N)
    - Bygger renderer + main/preload och skapar AppImage för arm64 och armv7l
    - Skapar GitHub Release och laddar upp artefakter från dist/

- Raspberry Pi (muspekare vid uppstart, Wayland/X11)
  - Autostart .desktop-filen (skapad av updatern på Linux) försöker flytta muspekaren till nederhöger vid sessionstart.
  - X11: kräver xdotool + xdpyinfo
```bash path=null start=null
sudo apt-get update && sudo apt-get install -y xdotool x11-utils
```
  - Wayland: kräver ydotool (och ydotoold)
```bash path=null start=null
sudo apt-get update && sudo apt-get install -y ydotool
sudo systemctl enable --now ydotoold
```
  - Upplösning på Wayland hämtas via wlr-randr eller swaymsg om möjligt. Annars kan fallback-variabler användas:
```bash path=null start=null
export POTATO_SCREEN_WIDTH=1920
export POTATO_SCREEN_HEIGHT=1080
```

Övriga anteckningar
- Renderer öppnar DevTools automatiskt i utvecklingsläge. Appen går inte automatiskt i fullskärm i dev; i paketerad app körs fullskärm.
- TypeScript-path aliases finns i tsconfig.json ("@renderer/*", "@main/*", "@preload/*").
- ESLint ignorerar dist/ och dist-electron/.
