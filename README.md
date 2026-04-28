# SD Cover Manager - R36S

Web tool for managing ROM covers of retro console with using web browser and ScreenScraper API.

## Features

- **Select MicroSD folder** using File System Access API
- **Scan ROMs** from subfolders (gb, snes, nes, n64, etc.)
- **Detect missing covers** by checking for images in standard locations
- **Download covers** from ScreenScraper.fr API
- **Select/deselect systems** to download covers for specific consoles
- **Choose destination folder** for images (images, media, or custom)
- **Download images and/or videos** separately
- **Region detection** from ROM filename (Europe, USA, Japan, etc.)
- **Progress tracking** with global and per-system progress bars

## Requirements

- Chrome or Edge browser (required for File System Access API)
- ScreenScraper.fr account (free registration at https://www.screenscraper.fr)
- HTTPS server or localhost (needed for File System Access API)

## Usage

1. Open the application in Chrome or Edge
2. Click "Seleccionar Carpeta de MicroSD" to select your ROMs folder
3. Enter your ScreenScraper.fr credentials
4. Select/deselect systems to process
5. Configure destination folders
6. Click "Descargar Covers" to start scraping

## ScreenScraper Credentials

- **ssid**: Your ScreenScraper username
- **sspass**: Your ScreenScraper password
- **devid**: Developer ID
- **devpass**: Developer password

## API Endpoints Used

- `/ssuserInfos.php` - User authentication
- `/jeuInfos.php` - Game information search
- `/jeuRecherche.php` - Game search by name
- `/mediaJeu.php` - Media download (box-2D, video, etc.)

## Supported Systems

- gb, gbc, gba, nes, snes, n64, nds, psx, psp
- genesis, sms, pce, ngp, wii, 3ds

## License

MIT License

## Credits

- ScreenScraper.fr for the database API
- ArkOS for the retro gaming system
