import { useState, useEffect, useRef } from 'react';

const ROM_EXTENSIONS = ['.nes', '.snes', '.sfc', '.gb', '.gbc', '.gba', '.n64', '.z64', '.nds', '.3ds', '.cia', '.xci', '.xwb', '.gcm', '.iso', '.wbfs', '.wad', '.a26', '.lnx', '.jag', '.j64', '.gen', '.sms', '.gg', '.s32x', '.32x', '.pce', '.ngp', '.ngc', '.crypt', '.fb', '.nsp', '.kv', '.m3u', '.zip', '.7z', '.bin', '.p8', '.apk', '.jar', '.pymo'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi'];

const SCREENSCRAPER_API = 'https://api.screenscraper.fr/api2';
const SOFT_NAME = 'SDCoverManager';
const DEV_ID = 'koko004';
const DEV_PASSWORD = 'EhkHQozlUSq';
const MY_PROXY = '/proxy.php?url=';

interface System {
  id: string;
  name: string;
  system: string;
  romCount: number;
  missing: number;
  folderHandle?: any;
  images?: any[];
  videos?: any[];
  gamelist?: string;
  roms?: Game[];
}

interface Game {
  name: string;
  path: string;
  size: number;
  handle?: any;
  hasCover?: boolean;
  imageName?: string | null;
}

interface LogEntry {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface DownloadedCover {
  id: number;
  game: string;
  system: string;
  image: string;
  date: string;
}

const destinationOptions = [
  { value: 'images', label: 'images/' },
  { value: 'media', label: 'media/' },
  { value: 'custom', label: 'custom/' },
];

let SYSTEM_MAP: { [key: string]: number } = {
  'gb': 9, 'gbc': 10, 'gba': 12, 'nes': 3, 'snes': 4, 'sfc': 4,
  'n64': 14, 'nds': 28, '3ds': 43, 'wii': 17, 'wiiu': 41,
  'mastersystem': 2, 'sms': 2, 'genesis': 1, 'megadrive': 1,
  'sega32x': 11, 'gamegear': 21, 'neogeo': 142, 'mame': 75,
  'fbneo': 75, 'psx': 57, 'ps1': 57, 'psp': 61, 'ps2': 58,
  'pce': 31, 'tg16': 31, 'tgcd': 31, 'wswan': 45, 'wswanc': 46,
  'lynx': 26, 'ngp': 18, 'ngpc': 19, 'atarilynx': 26,
  'snesmini': 4, 'nesmini': 3, 'switch': 130,
  'gamecube': 16, 'dreamcast': 64, 'saturn': 62,
  'cps1': 38, 'cps2': 41, 'cps3': 6, 'atomiswave': 53,
  'c64': 64, 'pcengine': 31, 'amiga': 151, 'atari800': 87,
  'oric': 99, 'ti99': 156, 'zxspectrum': 85, 'amstradpcw': 223,
  'apple2': 76, 'macintosh': 163, 'intellivision': 48,
  'colecovision': 48, 'vectrex': 84,
  'pico8': 999, 'pico-8': 999, 'j2me': 999, 'pymo': 999
};

export default function SDScrapperRetro() {
  const [credentials, setCredentials] = useState({ ssid: '', sspass: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedUser, setLoggedUser] = useState('');

  const [folderSelected, setFolderSelected] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [systems, setSystems] = useState<System[]>([]);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);

const [destFolder, setDestFolder] = useState('images');
  const [customFolder, setCustomFolder] = useState('images');
  const [videoDestFolder, setVideoDestFolder] = useState('videos');
  const [videoCustomFolder, setVideoCustomFolder] = useState('videos');
  const [imageType, setImageType] = useState('mixrbv2');
  const [boxType, setBoxType] = useState('box-3D');
  const [logoType, setLogoType] = useState('wheel');
  const [preferredRegion, setPreferredRegion] = useState('eu');

  const [isScraping, setIsScraping] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSystem, setCurrentSystem] = useState('');
  const [currentGame, setCurrentGame] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [failedDownloads, setFailedDownloads] = useState<any[]>([]);

  const [downloadedCovers, setDownloadedCovers] = useState<DownloadedCover[]>([]);
  const [showGallery, setShowGallery] = useState(false);

  const [showWarning, setShowWarning] = useState(false);
  const [warningText, setWarningText] = useState('');

  const directoryHandleRef = useRef<any>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal2Ref = useRef<HTMLDivElement>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
    if (terminal2Ref.current) {
      terminal2Ref.current.scrollTop = terminal2Ref.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!window.showDirectoryPicker) {
      setShowWarning(true);
      setWarningText('API File System Access no disponible. Usa Chrome o Edge.');
    }
  }, []);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const safeMsg = message.replace(DEV_PASSWORD, '***').replace(DEV_ID, '***');
    const newLog: LogEntry = { id: Date.now() + Math.random(), message: safeMsg, type };
    setLogs(prev => [...prev.slice(-50), newLog]);
  };

  const getExtension = (filename: string) => {
    return filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  };

  const getBasename = (filename: string) => {
    return filename.replace(/\.[^.]+$/, '');
  };

  const escapeXml = (str: string) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  };

  const cleanRomNameForSearch = (filename: string) => {
    let name = getBasename(filename);
    name = name.replace(/\s*-\s*/g, ' ');
    name = name.replace(/\s*\([^)]*\)\s*/g, ' ');
    name = name.replace(/\s*\[.*\]\s*/g, ' ');
    name = name.replace(/,\s*.*$/g, '');
    name = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    name = name.replace(/\s+/g, ' ').trim();
    return name;
  };

  const getGameName = (jeu: any, region: string) => {
    if (!jeu) return 'Unknown';
    if (jeu.nom) return jeu.nom;
    if (jeu.noms && Array.isArray(jeu.noms) && jeu.noms.length > 0) {
      const regions = region ? [region, 'eu', 'us', 'jp', 'ss', 'wor'] : ['eu', 'us', 'jp', 'ss', 'wor'];
      for (const r of regions) {
        const found = jeu.noms.find((n: any) => n.region === r);
        if (found && found.text) return found.text;
      }
      return jeu.noms[0].text;
    }
    return 'Unknown';
  };

  const crc32 = (data: Uint8Array) => {
    let crc = 0xFFFFFFFF;
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  };

  const calculateRomHash = async (romHandle: any, fileSize: number) => {
    const MAX_SIZE = 50 * 1024 * 1024;
    if (fileSize > MAX_SIZE) return null;
    try {
      const file = await romHandle.getFile();
      const buffer = await file.slice(0, Math.min(fileSize, MAX_SIZE)).arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const hash = crc32(uint8);
      return hash.toString(16).toUpperCase();
    } catch (e) {
      return null;
    }
  };

  const scanDirectory = async (handle: any, path = ''): Promise<{ roms: any[], images: any[], videos: any[], folders: any[], gamelist: string | null }> => {
    const results = { roms: [], images: [], videos: [], folders: [], gamelist: null as string | null };
    const MEDIA_FOLDERS = ['media', 'image', 'images', 'imagen', 'imagenes', 'video', 'videos', 'box', 'covers', 'snap'];

    try {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          const ext = getExtension(entry.name).toLowerCase();
          const nameLower = entry.name.toLowerCase();

          if (ROM_EXTENSIONS.includes(ext)) {
            let fileSize = 0;
            try { fileSize = (await entry.getFile()).size; } catch (e) {}
            results.roms.push({ name: entry.name, path: path + '/' + entry.name, size: fileSize, handle: entry });
          } else if (IMAGE_EXTENSIONS.includes(ext)) {
            results.images.push({ name: entry.name, path: path + '/' + entry.name });
          } else if (VIDEO_EXTENSIONS.includes(ext)) {
            results.videos.push({ name: entry.name, path: path + '/' + entry.name });
          } else if (nameLower === 'gamelist.xml') {
            try {
              const file = await entry.getFile();
              results.gamelist = await file.text();
            } catch (e) {}
          }
        } else if (entry.kind === 'directory') {
          const folderName = entry.name.toLowerCase();
          if (folderName.startsWith('.') || folderName === 'tmp' || folderName === 'temp' || folderName === 'themes' || folderName === 'media' || folderName === 'portmaster' || folderName === 'tools' || folderName === 'backup' || folderName === 'bin' || folderName === 'scripts' || folderName === 'config' || folderName === 'saves' || folderName === 'save' || folderName === 'states' || folderName === 'roms' || folderName === 'cache' || folderName === 'lib' || folderName === 'bios' || folderName === 'system' || folderName === 'emulators' || folderName === 'languages' || folderName === 'skins') {
            continue;
          }

          try {
            const subResults = await scanDirectory(entry.handle, path + '/' + entry.name);
            if (subResults.images.length > 0 || subResults.videos.length > 0) {
              results.images.push(...subResults.images);
              results.videos.push(...subResults.videos);
            }
            if (subResults.gamelist && !results.gamelist) results.gamelist = subResults.gamelist;
          } catch (e) {}

          results.folders.push({ name: entry.name, handle: entry, path: path + '/' + entry.name });
        }
      }
    } catch (e) {}
    return results;
  };

  const detectSystem = (folderPath: string) => {
    const parts = folderPath.split('/').filter(p => p);
    let folder = (parts[0] || '').toLowerCase();
    if (SYSTEM_MAP[folder]) return folder;
    if (parts.length > 1) {
      folder = (parts[1] || '').toLowerCase();
      if (SYSTEM_MAP[folder]) return folder;
    }
    return 'other';
  };

  const findSystemFolders = async (rootHandle: any) => {
    const systems: any = {};
    let foldersScanned = 0;
    let romsFound = 0;
    
    const scan = async (handle: any, path: string) => {
      try {
        const results = await scanDirectory(handle, path);
        foldersScanned++;
        
        if (results.roms.length > 0) {
          romsFound += results.roms.length;
          const system = detectSystem(path);
          if (!systems[system]) {
            systems[system] = { name: path.split('/').pop() || system, system, roms: [], images: [], videos: [], gamelist: results.gamelist, folderHandle: handle };
          }
          systems[system].roms.push(...results.roms);
          systems[system].images.push(...results.images);
          systems[system].videos.push(...results.videos);
          if (results.gamelist && !systems[system].gamelist) systems[system].gamelist = results.gamelist;
        }
        
        const excludedFolders = ['media', 'themes', 'portmaster', 'tools', 'backup', 'bin', 'scripts', 'config', 'saves', 'save', 'states', 'roms', 'cache', 'lib', 'bios', 'system', 'emulators', 'languages', 'skins'];
        for (const folder of results.folders) {
          const folderLower = folder.name.toLowerCase();
          if (!folder.name.startsWith('.') && !excludedFolders.includes(folderLower)) {
            await scan(folder.handle, folder.path);
          }
        }
      } catch (e) {
        console.error('Error scanning folder:', path, e);
      }
    };
    
    await scan(rootHandle, '');
    console.log('Scan complete - Folders:', foldersScanned, 'ROMs:', romsFound, 'Systems:', Object.keys(systems).length);
    return systems;
  };

  const checkCovers = (systemData: System): Game[] => {
    const imageNames = systemData.images?.map((i: any) => getBasename(i.name).toLowerCase()) || [];
    let gamelistImages: string[] = [];
    if (systemData.gamelist) {
      try {
        const imgMatches = systemData.gamelist.match(/<image>([^<]+)<\/image>/g) || [];
        gamelistImages = imgMatches.map((m: string) => getBasename(m.replace(/<[^>]+>/g, '')).toLowerCase());
      } catch (e) {}
    }
    const allImageNames = [...new Set([...imageNames, ...gamelistImages])];
    return systemData.roms.map((rom: any) => {
      const baseName = getBasename(rom.name).toLowerCase();
      const hasImage = allImageNames.some(img => img.startsWith(baseName) || baseName.startsWith(img) || img.includes(baseName));
      return { ...rom, hasCover: hasImage };
    });
  };

  const fetchSystemsFromAPI = async (user: string, pass: string) => {
    try {
      const url = SCREENSCRAPER_API + '/systemesListe.php?output=json&devid=' + encodeURIComponent(DEV_ID) + '&devpassword=' + encodeURIComponent(DEV_PASSWORD) + '&softname=' + encodeURIComponent(SOFT_NAME) + '&ssid=' + encodeURIComponent(user) + '&sspassword=' + encodeURIComponent(pass);
      const response = await fetch(url);
      if (!response.ok) return;
      const data = await response.json();
      if (data.response?.systems?.systeme) {
        const newSystemMap: any = {};
        for (const sys of data.response.systems.systeme) {
          const id = parseInt(sys.id);
          const nom = sys.nom || sys.nom_us || sys.nom_eu || sys.nom_ss || '';
          if (id && nom) {
            const nameLower = nom.toLowerCase().replace(/\s+/g, '');
            newSystemMap[nameLower] = id;
          }
        }
        SYSTEM_MAP = { ...SYSTEM_MAP, ...newSystemMap };
      }
    } catch (e) {
      console.error('Error fetching systems:', e);
    }
  };

  const testLogin = async () => {
    if (!credentials.ssid || !credentials.sspass) {
      addLog('ERROR: Enter ScreenScraper username and password', 'error');
      return false;
    }
    addLog('Probando conexion...', 'info');
    try {
      const params = new URLSearchParams({
        output: 'json', ssid: credentials.ssid, sspassword: credentials.sspass,
        devid: DEV_ID, devpassword: DEV_PASSWORD
      });
      const response = await fetch(SCREENSCRAPER_API + '/ssuserInfos.php?' + params);
      if (!response.ok) throw new Error('HTTP error');
      const text = await response.text();
      if (text.startsWith('Erreur')) {
        addLog('ScreenScraper error: ' + text, 'error');
        return false;
      }
      const data = JSON.parse(text);
      if (data.response?.ssuser) {
        const userData = data.response.ssuser;
        addLog('Login OK! Nivel: ' + userData.niveau + ' - Threads: ' + userData.maxthreads, 'success');
        await fetchSystemsFromAPI(credentials.ssid, credentials.sspass);
        return true;
      }
      return false;
    } catch (e) {
      addLog('Error: ' + (e as Error).message, 'error');
      return false;
    }
  };

  const handleLogin = async () => {
    const success = await testLogin();
    if (success) {
      setIsLoggedIn(true);
      setLoggedUser(credentials.ssid.toUpperCase());
    }
  };

  const handleSelectFolder = async () => {
    try {
      addLog('Opening folder selector...', 'info');
      const handle = await (window as any).showDirectoryPicker();
      directoryHandleRef.current = handle;
      setFolderSelected(true);
      addLog('✓ Folder selected successfully', 'success');
      addLog('Presiona "SCAN ROM DIRECTORIES" para buscar ROMs', 'info');
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        addLog('Error selecting folder: ' + e.message, 'error');
      }
    }
  };

  const [isScanning, setIsScanning] = useState(false);

  const handleScanRoms = async () => {
    if (!directoryHandleRef.current) {
      addLog('ERROR: Select a folder first', 'error');
      return;
    }
    addLog('=== STARTING SCAN ===', 'info');
    addLog('Analyzing folder structure...', 'info');
    setIsScanning(true);
    try {
      addLog('This may take a few seconds...', 'info');
      const scannedSystems = await findSystemFolders(directoryHandleRef.current);
      
      const systemsArray: System[] = [];
      for (const key of Object.keys(scannedSystems)) {
        const data = scannedSystems[key];
        if (data.roms && data.roms.length > 0) {
          const romsWithCovers = checkCovers(data);
          const missingCount = Number(romsWithCovers.filter((r: Game) => !r.hasCover).length);
          systemsArray.push({ 
            id: key, 
            name: data.name, 
            system: key, 
            romCount: data.roms.length, 
            missing: missingCount,
            images: data.images || [],
            videos: data.videos || [],
            gamelist: data.gamelist,
            folderHandle: data.folderHandle,
            roms: romsWithCovers 
          });
        }
      }
      systemsArray.sort((a, b) => b.romCount - a.romCount);
      
      if (systemsArray.length === 0) {
        addLog('ERROR: No ROMs found in folder', 'error');
        addLog('Make sure to select the ROMs root folder', 'info');
      } else {
        setSystems(systemsArray);
        setSelectedSystems(systemsArray.map(s => s.id));
        addLog('=== SCAN COMPLETE ===', 'success');
        addLog(systemsArray.length + ' systems detected', 'info');
        addLog(systemsArray.reduce((a, s) => a + s.romCount, 0) + ' ROMs found', 'info');
        addLog(systemsArray.reduce((a, s) => a + s.missing, 0) + ' covers missing', 'info');
        addLog('Select systems and press START SCRAPPING', 'info');
      }
    } catch (e) {
      addLog('ERROR escaneando: ' + (e as Error).message, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSystem = (systemId: string) => {
    if (selectedSystems.includes(systemId)) {
      setSelectedSystems(prev => prev.filter(id => id !== systemId));
    } else {
      setSelectedSystems(prev => [...prev, systemId]);
    }
  };

  const findMedia = (medias: any[], region: string, type: string, box: string, logo: string) => {
    const mediaTypes = [];
    if (type && type !== 'none') mediaTypes.push(type);
    if (box && box !== 'none' && box !== type) mediaTypes.push(box);
    if (logo && logo !== 'none') mediaTypes.push(logo);
    if (mediaTypes.length === 0) mediaTypes.push('screenshot', 'box-2D');

    const regionPriority = region ? [region, 'eu', 'us', 'jp', 'fr', 'wor', null] : ['eu', 'us', 'jp', 'fr', 'wor', null];

    for (const mediaType of mediaTypes) {
      for (const reg of regionPriority) {
        const candidates = medias.filter((m: any) => m.type === mediaType && (!reg || m.region === reg));
        if (candidates.length > 0) return candidates[0];
      }
    }
    return null;
  };

  const findMediaByType = (medias: any[], region: string, searchType: string) => {
    const typeMapping: any = {
      'screenshot': ['ss', 'screenshot', 'ss eu', 'ss us', 'ss jp'],
      'titlescreen': ['sstitle', 'titlescreen', 'sstitle eu', 'sstitle us'],
      'mixrbv1': ['mixrbv1', 'mix rb v1'],
      'mixrbv2': ['mixrbv2', 'mix rb v2', 'mixrbv2 eu', 'mixrbv2 us'],
      'box-2D': ['box-2d', 'box2d', 'box', 'boxart', 'box-2d eu', 'box-2d us'],
      'box-3D': ['box-3d', 'box3d', 'box-3d eu', 'box-3d us'],
      'wheel': ['wheel-hd', 'wheel', 'wheel-steel', 'wheel hd'],
      'marquee': ['wheel-steel', 'marquee', 'marquee', 'wheel steel'],
      'video': ['video', 'video-full', 'video-mp4', 'video mp4'],
      'manual': ['manual', 'manual-pdf', 'manuel', 'manuel-pdf']
    };
    
    const apiTypes = typeMapping[searchType] || [searchType];
    const regionPriority = region ? [region, 'eu', 'us', 'jp', 'fr', 'wor', null] : ['eu', 'us', 'jp', 'fr', 'wor', null];
    
    for (const reg of regionPriority) {
      for (const type of apiTypes) {
        const candidates = medias.filter((m: any) => {
          const typeMatch = m.type?.toLowerCase() === type.toLowerCase();
          const regionMatch = !reg || m.region?.toLowerCase() === reg;
          return typeMatch && regionMatch;
        });
        if (candidates.length > 0) return candidates[0];
      }
    }
    
    // Fallback: try without region
    for (const type of apiTypes) {
      const candidates = medias.filter((m: any) => m.type?.toLowerCase() === type.toLowerCase());
      if (candidates.length > 0) return candidates[0];
    }
    
    return null;
  };

  const scrapeGame = async (user: string, pass: string, systemId: string, rom: Game, region: string) => {
    const romHandle = rom.handle;
    const fileSize = rom.size || 0;
    let hash = null;
    if (romHandle && fileSize > 0) hash = await calculateRomHash(romHandle, fileSize);

    if (hash) {
      const hashUrl = SCREENSCRAPER_API + '/jeuInfos.php?output=json&devid=' + encodeURIComponent(DEV_ID) + '&devpassword=' + encodeURIComponent(DEV_PASSWORD) + '&softname=' + encodeURIComponent(SOFT_NAME) + '&ssid=' + encodeURIComponent(user) + '&sspassword=' + encodeURIComponent(pass) + '&systemeid=' + systemId + '&crc=' + hash;
      try {
        const response = await fetch(hashUrl);
        if (response.ok) {
          const text = await response.text();
          if (!text.startsWith('Erreur') && text.includes('"jeu"')) {
            const data = JSON.parse(text);
            if (data.response?.jeu) {
              const jeu = data.response.jeu;
              return { jeu: { id: jeu.id, nom: getGameName(jeu, region) }, medias: data.response.jeu.medias || [] };
            }
          }
        }
      } catch (e) {}
    }

    const cleanName = cleanRomNameForSearch(rom.name);
    const cleanUrl = SCREENSCRAPER_API + '/jeuInfos.php?output=json&devid=' + encodeURIComponent(DEV_ID) + '&devpassword=' + encodeURIComponent(DEV_PASSWORD) + '&softname=' + encodeURIComponent(SOFT_NAME) + '&ssid=' + encodeURIComponent(user) + '&sspassword=' + encodeURIComponent(pass) + '&systemeid=' + systemId + '&romnom=' + encodeURIComponent(cleanName);
    try {
      const response = await fetch(cleanUrl);
      if (!response.ok) return null;
      const text = await response.text();
      if (text.startsWith('Erreur')) return null;
      const data = JSON.parse(text);
      if (data.response?.jeu) {
        return { jeu: data.response.jeu, medias: data.response.jeu.medias || [] };
      }
    } catch (e) {}
    return null;
  };

  const downloadImage = async (cdnUrl: string) => {
    if (!cdnUrl) return null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const proxyUrl = MY_PROXY + encodeURIComponent(cdnUrl);
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const blob = await response.blob();
          if (blob.size > 0) return blob;
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 2000));
    }
    return null;
  };

  const ensureFolderExists = async (systemHandle: any, folderName: string) => {
    try {
      const dirHandle = await systemHandle.getDirectoryHandle(folderName);
      return dirHandle;
    } catch (e) {
      try {
        return await systemHandle.getDirectoryHandle(folderName, { create: true });
      } catch (e2) {
        console.error('Error creating folder:', e2);
        throw e2;
      }
    }
  };

  const requestWritePermission = async (handle: any) => {
    try {
      if (!handle) return false;
      
      // Check if already has permission
      try {
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
          console.log('Permission already granted');
          return true;
        }
      } catch (e) {
        console.log('Need to request permission');
      }
      
      // Request permission
      try {
        const requested = await handle.requestPermission({ mode: 'readwrite' });
        console.log('Permission result:', requested);
        return requested === 'granted';
      } catch (e2) {
        console.error('Error requesting permission:', e2);
        return false;
      }
    } catch (e) {
      console.error('Error checking permission:', e);
      return false;
    }
  };

  const saveImage = async (systemData: System, imageName: string, blob: Blob, folder: string) => {
    try {
      const folderHandle = systemData.folderHandle;
      
      // Request permission for this specific folder
      try {
        await folderHandle.requestPermission({ mode: 'readwrite' });
      } catch (e) {
        console.log('Folder permission already granted or not needed');
      }
      
      const imageFolderHandle = await ensureFolderExists(folderHandle, folder);
      const fileHandle = await imageFolderHandle.getFileHandle(imageName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (e) {
      console.error('Save error:', e);
      return false;
    }
  };

  const saveVideo = async (systemData: System, videoName: string, blob: Blob, folder: string) => {
    try {
      const folderHandle = systemData.folderHandle;
      
      try {
        await folderHandle.requestPermission({ mode: 'readwrite' });
      } catch (e) {}
      
      const videoFolderHandle = await ensureFolderExists(folderHandle, folder);
      const fileHandle = await videoFolderHandle.getFileHandle(videoName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (e) {
      console.error('Save video error:', e);
      return false;
    }
  };

  const readGamelistXml = async (systemData: System) => {
    try {
      const fileHandle = await systemData.folderHandle.getFileHandle('gamelist.xml');
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (e) {
      return null;
    }
  };

  const updateGamelistXml = async (systemData: System, gameFile: string, imageFile: string | null, jeuData?: any, videoFile?: string | null, boxFile?: string | null, marqueeFile?: string | null, thumbFile?: string | null) => {
    try {
      let xml = await readGamelistXml(systemData);
      if (!xml) {
        xml = '<?xml version="1.0" encoding="UTF-8"?>\n<gameList>\n</gameList>';
      }
      const gameName = getBasename(gameFile);
      const imageName = imageFile || gameName + '-image.png';
      const gamePath = gameFile;
      
      let gameEntry = '';
      
      if (xml.includes('<path>' + gamePath + '</path>')) {
        const existingEntryRegex = new RegExp('(<game>[\\s\\S]*?<path>' + gamePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</path>[\\s\\S]*?</game>)', 'i');
        const match = xml.match(existingEntryRegex);
        if (match && jeuData) {
          let existing = match[1];
          existing = existing.replace(/<image>[^<]*<\/image>/, '<image>' + imageName + '</image>');
          if (videoFile) existing = existing.replace(/<video>[^<]*<\/video>/, '<video>' + videoFile + '</video>') || existing + '\n    <video>' + videoFile + '</video>';
          if (marqueeFile) existing = existing.replace(/<marquee>[^<]*<\/marquee>/, '<marquee>' + marqueeFile + '</marquee>') || existing + '\n    <marquee>' + marqueeFile + '</marquee>';
          if (thumbFile) existing = existing.replace(/<thumbnail>[^<]*<\/thumbnail>/, '<thumbnail>' + thumbFile + '</thumbnail>') || existing + '\n    <thumbnail>' + thumbFile + '</thumbnail>';
          if (boxFile) existing = existing.replace(/<bezel>[^<]*<\/bezel>/, '<bezel>' + boxFile + '</bezel>') || existing + '\n    <bezel>' + boxFile + '</bezel>';
          xml = xml.replace(existingEntryRegex, existing);
        }
      } else {
        gameEntry = '  <game>\n';
        gameEntry += '    <path>' + gamePath + '</path>\n';
        gameEntry += '    <name>' + (jeuData?.noms?.[0]?.text || jeuData?.nom || gameName) + '</name>\n';
        
        if (imageFile) gameEntry += '    <image>' + imageName + '</image>\n';
        if (videoFile) gameEntry += '    <video>' + videoFile + '</video>\n';
        if (marqueeFile) gameEntry += '    <marquee>' + marqueeFile + '</marquee>\n';
        if (thumbFile) gameEntry += '    <thumbnail>' + thumbFile + '</thumbnail>\n';
        if (boxFile) gameEntry += '    <bezel>' + boxFile + '</bezel>\n';
        
        if (jeuData) {
          if (jeuData.description) gameEntry += '    <desc>' + escapeXml(jeuData.description.substring(0, 2000)) + '</desc>\n';
          
          if (jeuData.genres?.genre) {
            const genres = Array.isArray(jeuData.genres.genre) ? jeuData.genres.genre.map((g: any) => g.nom).join(', ') : jeuData.genres.genre?.nom;
            if (genres) gameEntry += '    <genre>' + escapeXml(genres) + '</genre>\n';
          }
          
          if (jeuData.datederelease) {
            const date = jeuData.datederelease.replace(/-/g, '');
            gameEntry += '    <releasedate>' + date + 'T000000</releasedate>\n';
          }
          
          if (jeuData.developpeur) gameEntry += '    <developer>' + escapeXml(jeuData.developpeur) + '</developer>\n';
          if (jeuData.editeur) gameEntry += '    <publisher>' + escapeXml(jeuData.editeur) + '</publisher>\n';
          
          if (jeuData.note) {
            const rating = typeof jeuData.note === 'object' ? (jeuData.note.note || 0) / 20 : parseFloat(jeuData.note) / 20;
            gameEntry += '    <rating>' + rating.toFixed(2) + '</rating>\n';
          }
          
          if (jeuData.joueurs) gameEntry += '    <players>' + jeuData.joueurs + '</players>\n';
          
          if (jeuData.families?.family) {
            const families = Array.isArray(jeuData.families.family) ? jeuData.families.family.map((f: any) => f.nom).join(', ') : jeuData.families.family?.nom;
            if (families) gameEntry += '    <family>' + escapeXml(families) + '</family>\n';
          }
        }
        
        gameEntry += '  </game>';
        xml = xml.replace('<gameList>', '<gameList>\n' + gameEntry);
      }
      
      const fileHandle = await systemData.folderHandle.getFileHandle('gamelist.xml', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(xml);
      await writable.close();
      return true;
    } catch (e) {
      console.error('Error updating gamelist.xml:', e);
      return false;
    }
  };

  const startScraping = async () => {
    if (!isLoggedIn || selectedSystems.length === 0 || systems.length === 0) {
      addLog('ERROR: Missing login or systems selected', 'error');
      return;
    }

    setIsScraping(true);
    setShouldStop(false);
    stopRef.current = false;
    setProgress(0);
    setLogs([]);
    setProcessedCount(0);
    setDownloadedCovers([]);
    setFailedDownloads([]);

    addLog('=== STARTING SCRAPING v1.36 ===', 'info');
    addLog('Usuario: ' + credentials.ssid, 'info');

    // Request write permission for the folder
    addLog('Requesting write permissions...', 'info');
    const hasPermission = await requestWritePermission(directoryHandleRef.current);
    if (!hasPermission) {
      addLog('ERROR: Write permissions denied', 'error');
      setIsScraping(false);
      return;
    }
    addLog('✓ Write permissions granted', 'success');

    const folder = destFolder === 'custom' ? (customFolder || 'images') : destFolder;
    addLog('Destination folder: /' + folder, 'info');

    const gamesToProcess: { game: Game, system: System }[] = [];
    for (const sysId of selectedSystems) {
      const sysData = systems.find(s => s.id === sysId);
      if (sysData && sysData.roms) {
        // Request permission for each system folder
        if (sysData.folderHandle) {
          try {
            await sysData.folderHandle.requestPermission({ mode: 'readwrite' });
          } catch (e) {}
        }
        
        const romsWithoutCover = sysData.roms.filter((r: Game) => !r.hasCover);
        for (const g of romsWithoutCover) {
          gamesToProcess.push({ game: g, system: sysData });
        }
      }
    }

    setTotalToProcess(gamesToProcess.length);
    let completed = 0;
    const newCovers: DownloadedCover[] = [];
    const failed: any[] = [];

    addLog('Starting downloads (1 request every 2 seconds)...', 'info');

    for (let i = 0; i < gamesToProcess.length; i++) {
      // Delay between games to avoid server overload
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      if (stopRef.current) {
        addLog('=== STOPPED ===', 'info');
        break;
      }

      const { game, system } = gamesToProcess[i];
      const systemIdNum = SYSTEM_MAP[system.system];
      setCurrentSystem(system.name);
      setCurrentGame(game.name);

      addLog('Searching: ' + game.name + ' [' + system.name + ']', 'info');

      const result = await scrapeGame(credentials.ssid, credentials.sspass, systemIdNum?.toString() || '999', game, preferredRegion);

      if (result && result.medias) {
        const medias = result.medias;
        let downloadedCount = 0;
        
        // 1. Download main image (imageType)
        if (imageType && imageType !== 'none') {
          const media = findMediaByType(medias, preferredRegion, imageType);
          if (media?.url) {
            const blob = await downloadImage(media.url);
            if (blob) {
              const ext = '.png';
              const imageName = getBasename(game.name) + '-image' + ext;
              const saved = await saveImage(system, imageName, blob, folder);
              if (saved) {
                addLog('✓ Image: ' + imageName, 'success');
                const videoName = downloadVideos ? getBasename(game.name) + '-video.mp4' : null;
                const boxName = boxType && boxType !== 'none' && boxType !== imageType ? getBasename(game.name) + '-thumb.png' : null;
                const marqueeName = logoType && logoType !== 'none' ? getBasename(game.name) + '-marquee.png' : null;
                const thumbName = boxType && boxType !== 'none' ? getBasename(game.name) + '-thumb.png' : null;
                await updateGamelistXml(system, game.name, imageName, result.jeu, videoName, boxName, marqueeName, thumbName);
                downloadedCount++;
              }
            }
          }
        }
        
        // 2. Download box (if different from image)
        if (boxType && boxType !== 'none' && boxType !== imageType) {
          const boxMedia = findMediaByType(medias, preferredRegion, boxType);
          if (boxMedia?.url) {
            const blob = await downloadImage(boxMedia.url);
            if (blob) {
              const boxName = getBasename(game.name) + '-thumb.png';
              const saved = await saveImage(system, boxName, blob, folder);
              if (saved) {
                addLog('✓ Box: ' + boxName, 'success');
                downloadedCount++;
              }
            }
          }
        }
        
        // 3. Download logo (wheel/marquee)
        if (logoType && logoType !== 'none') {
          const logoMedia = findMediaByType(medias, preferredRegion, logoType);
          if (logoMedia?.url) {
            const blob = await downloadImage(logoMedia.url);
            if (blob) {
              const logoName = getBasename(game.name) + '-marquee.png';
              const saved = await saveImage(system, logoName, blob, folder);
              if (saved) {
                addLog('✓ Logo: ' + logoName, 'success');
                downloadedCount++;
              }
            }
          }
        }
        
        // 4. Download video
        if (downloadVideos) {
          const videoFolder = videoDestFolder === 'custom' ? (videoCustomFolder || 'videos') : videoDestFolder;
          const videoMedia = findMediaByType(medias, preferredRegion, 'video');
          if (videoMedia?.url) {
            const blob = await downloadImage(videoMedia.url);
            if (blob) {
              const videoName = getBasename(game.name) + '.mp4';
              const saved = await saveVideo(system, videoName, blob, videoFolder);
              if (saved) {
                addLog('✓ Video: ' + videoName, 'success');
                downloadedCount++;
              }
            }
          }
        }
        
        // 5. Download manual
        if (downloadManual) {
          const manualMedia = findMediaByType(medias, preferredRegion, 'manual');
          if (manualMedia?.url) {
            const blob = await downloadImage(manualMedia.url);
            if (blob) {
              const manualName = getBasename(game.name) + '.pdf';
              const saved = await saveImage(system, manualName, blob, 'manuals');
              if (saved) {
                addLog('✓ Manual: ' + manualName, 'success');
                downloadedCount++;
              }
            }
          }
        }
        
        // 6. Scan ratings
        if (scanRatings && result.jeu) {
          let rating = null;
          if (result.jeu.note) rating = typeof result.jeu.note === 'object' ? JSON.stringify(result.jeu.note) : result.jeu.note;
          else if (result.jeu.note_md5) rating = result.jeu.note_md5;
          if (rating) {
            addLog('★ Rating: ' + rating + '/10', 'info');
          }
        }
        
        if (downloadedCount === 0) {
          addLog('No media available for: ' + imageType, 'error');
          failed.push({ game: game.name, system: system.name });
        }
      } else {
        addLog('No encontrado en API', 'error');
        failed.push({ game: game.name, system: system.name });
      }

      setDownloadedCovers([...newCovers]);
      completed = i + 1;
      setProcessedCount(completed);
      setProgress(Math.floor((completed / gamesToProcess.length) * 100));
    }

    setFailedDownloads(failed);
    setTimeout(() => {
      setProgress(100);
      addLog('=== SCRAPING COMPLETE ===', 'success');
      addLog(completed + '/' + gamesToProcess.length + ' games processed', 'success');
      setIsScraping(false);
      setCurrentSystem('');
      setCurrentGame('');
    }, 500);
  };

  const stopScraping = () => {
    stopRef.current = true;
    setShouldStop(true);
    addLog('Stopping...', 'info');
  };

  const resetAll = () => {
    setIsScraping(false);
    setShouldStop(false);
    setProgress(0);
    setLogs([]);
    setProcessedCount(0);
    setDownloadedCovers([]);
    setFolderSelected(false);
    setFolderPath('');
    setSystems([]);
    setSelectedSystems([]);
    setShowGallery(false);
    setCurrentSystem('');
    setCurrentGame('');
    setIsLoggedIn(false);
    setLoggedUser('');
    setCredentials({ ssid: '', sspass: '' });
    addLog('System reset', 'info');
  };

  const totalMissing = systems.filter(s => selectedSystems.includes(s.id)).reduce((sum, s) => sum + Number(s.missing || 0), 0);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#00ff41] overflow-hidden">
      {showWarning && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-6">
          <div className="retro-panel p-8 border-red-500 max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="led led-red"></div>
              <h3 className="font-bold text-xl text-red-400">NAVEGADOR NO COMPATIBLE</h3>
            </div>
            <p className="text-sm text-white/70">{warningText}</p>
          </div>
        </div>
      )}

      <div className="border-b-4 border-[#2a2f38] bg-[#11151b]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">📼</div>
            <div>
              <h1 className="text-4xl font-bold tracking-[4px] text-[#39ff14]">SD SCRAPPER</h1>
              <div className="text-xs tracking-[3px] text-[#ffaa00] -mt-1">RETRO COVER MANAGER v1.36</div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className={`led ${isLoggedIn ? 'led-green' : 'led-red'}`}></div>
              <span className="text-[#00ff41]/70">SCREENSCRAPER.FR</span>
            </div>
            <div className="px-4 py-1 bg-[#1a1f26] border border-[#2a2f38] text-xs tracking-widest">
              CRT THEME
            </div>
          </div>

          <button onClick={resetAll} className="retro-btn px-5 py-2 text-xs">RESET</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between text-xs border-b border-[#2a2f38] pb-4">
          <div className="flex items-center gap-8">
            <div>STATUS: <span className="text-[#ffaa00] font-bold">{isScraping ? 'SCRAPPING' : isLoggedIn ? 'READY' : 'AWAITING LOGIN'}</span></div>
            {folderSelected && <div>FOLDER: <span className="text-white/80">MicroSD Selected</span></div>}
            {systems.length > 0 && <div>SYSTEMS: <span className="text-white/80">{systems.length}</span></div>}
          </div>
          {loggedUser && <div className="text-[#ffaa00]">CONNECTED: <span className="font-bold text-white">{loggedUser}</span></div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Terminal - PARTE SUPERIOR */}
          <div className="lg:col-span-12 retro-panel crt p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📟</span>
                <span className="text-[#ffaa00] text-sm tracking-[2px]">TERMINAL</span>
              </div>
              <button onClick={() => setLogs([])} className="text-xs px-2 py-1 border border-[#2a2f38] hover:border-[#00ff41] text-[#00ff41]/60">CLEAR</button>
            </div>
            <div ref={terminalRef} className="terminal p-3 h-40 overflow-y-auto font-mono text-xs ">
              {logs.length === 0 && <div className="opacity-60">waiting for action...</div>}
              {logs.map(log => (
                <div key={log.id} className={log.type === 'success' ? 'text-[#39ff14]' : log.type === 'error' ? 'text-[#ff3355]' : 'text-[#00cc33]'}>
                  [{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}] {log.message}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 retro-panel crt p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="text-xl">🔐</div>
              <div>
                <div className="text-[#ffaa00] text-sm tracking-[2px]">SCREENSCRAPER.FR</div>
                <div className="font-bold text-lg -mt-1">CREDENTIALS</div>
              </div>
            </div>

            {!isLoggedIn ? (
              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
                <div>
                  <div className="text-xs mb-1.5 tracking-widest text-[#ffaa00]/80">SSID / USERNAME</div>
                  <input type="text" value={credentials.ssid} onChange={(e) => setCredentials({...credentials, ssid: e.target.value})} className="retro-input w-full text-lg" placeholder="YOUR USERNAME" autoComplete="username" />
                </div>
                <div>
                  <div className="text-xs mb-1.5 tracking-widest text-[#ffaa00]/80">SSPASS / PASSWORD</div>
                  <input type="password" value={credentials.sspass} onChange={(e) => setCredentials({...credentials, sspass: e.target.value})} className="retro-input w-full text-lg" autoComplete="current-password" />
                </div>
                <button type="submit" disabled={isScraping} className="retro-btn w-full py-3.5 text-base mt-2 tracking-[1.5px]">VERIFY & CONNECT</button>
                <div className="text-center text-[10px] text-[#ffaa00]/60 tracking-widest">FREE ACCOUNT REQUIRED</div>
              </form>
            ) : (
              <div className="py-4">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="led led-green"></div>
                  <div className="text-xl font-bold">CONNECTED</div>
                </div>
                <div className="text-center text-sm bg-[#1a1f26] py-4 border border-[#2a2f38]">
                  <div className="text-[#ffaa00]">WELCOME, {loggedUser}</div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 retro-panel crt p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-xl">💾</div>
                  <div>
                    <div className="text-[#ffaa00] text-sm tracking-[2px]">MICRO-SD CARD</div>
                    <div className="font-bold text-lg -mt-1">ROM STORAGE</div>
                  </div>
                </div>
              </div>
              {folderSelected && <div className="px-3 py-1 text-xs border border-[#00ff41] text-[#00ff41]">MOUNTED</div>}
            </div>

            {!folderSelected ? (
              <button onClick={handleSelectFolder} disabled={isScraping} className="retro-btn w-full py-8 text-xl tracking-[3px]">SELECT MICRO-SD FOLDER</button>
            ) : (
              <div>
                <div className="bg-[#0a0c10] border-4 border-[#2a2f38] p-4 mb-4 font-mono text-sm">
                  {folderPath || 'Folder selected'}
                  <br />
                  <span className="text-[#ffaa00]">✓ READY FOR SCANNING</span>
                </div>
                <button onClick={handleScanRoms} disabled={systems.length > 0 || isScraping || isScanning} className="retro-btn w-full py-3 text-base tracking-widest">
                  {isScanning ? 'SCANNING...' : systems.length > 0 ? 'ROMS SCANNED' : 'SCAN ROM DIRECTORIES'}
                </button>
              </div>
            )}

            {systems.length > 0 && (
              <div className="mt-4 text-xs flex justify-between items-center border-t border-[#2a2f38] pt-4">
                <div>TOTAL ROMS: <span className="text-white">{systems.reduce((a, s) => a + (s.romCount || 0), 0)}</span></div>
                <div>MISSING: <span className="text-[#ffaa00] font-bold">{totalMissing}</span></div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 retro-panel crt p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">⚙︎</span>
                <span className="font-bold text-lg tracking-wide">CONFIG</span>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <div className="text-xs text-[#ffaa00]/70 mb-2 tracking-widest">IMAGES FOLDER</div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input type="radio" name="dest" checked={destFolder === 'images'} onChange={() => setDestFolder('images')} className="accent-[#00ff41]" />
                    <span className="font-mono text-xs">images/</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input type="radio" name="dest" checked={destFolder === 'media'} onChange={() => setDestFolder('media')} className="accent-[#00ff41]" />
                    <span className="font-mono text-xs">media/</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input type="radio" name="dest" checked={destFolder === 'custom'} onChange={() => setDestFolder('custom')} className="accent-[#00ff41]" />
                    <span className="font-mono text-xs">custom</span>
                  </label>
                  {destFolder === 'custom' && (
                    <input type="text" value={customFolder} onChange={(e) => setCustomFolder(e.target.value)} className="retro-input text-xs w-full mt-1" placeholder="Folder name" />
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-[#ffaa00]/70 mb-2 tracking-widest">VIDEOS FOLDER</div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input type="radio" name="videoDest" checked={videoDestFolder === 'videos'} onChange={() => setVideoDestFolder('videos')} className="accent-[#00ff41]" />
                    <span className="font-mono text-xs">videos/</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input type="radio" name="videoDest" checked={videoDestFolder === 'media'} onChange={() => setVideoDestFolder('media')} className="accent-[#00ff41]" />
                    <span className="font-mono text-xs">media/</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input type="radio" name="videoDest" checked={videoDestFolder === 'movies'} onChange={() => setVideoDestFolder('movies')} className="accent-[#00ff41]" />
                    <span className="font-mono text-xs">movies/</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input type="radio" name="videoDest" checked={videoDestFolder === 'custom'} onChange={() => setVideoDestFolder('custom')} className="accent-[#00ff41]" />
                    <span className="font-mono text-xs">custom</span>
                  </label>
                  {videoDestFolder === 'custom' && (
                    <input type="text" value={videoCustomFolder} onChange={(e) => setVideoCustomFolder(e.target.value)} className="retro-input text-xs w-full mt-1" placeholder="Folder name" />
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[#2a2f38]">
                <div className="text-xs text-[#ffaa00]/70 mb-2 tracking-widest">MEDIA TYPE</div>
                <select value={imageType} onChange={(e) => setImageType(e.target.value)} className="retro-input w-full text-xs mb-2">
                  <option value="screenshot">Screenshot</option>
                  <option value="titlescreen">Titlescreen</option>
                  <option value="mixrbv1">Mix V1</option>
                  <option value="mixrbv2">Mix V2</option>
                  <option value="box-2D">Box 2D</option>
                  <option value="box-3D">Box 3D</option>
                </select>
                <select value={boxType} onChange={(e) => setBoxType(e.target.value)} className="retro-input w-full text-xs mb-2">
                  <option value="none">No Box</option>
                  <option value="box-2D">Box 2D</option>
                  <option value="box-3D">Box 3D</option>
                </select>
                <select value={logoType} onChange={(e) => setLogoType(e.target.value)} className="retro-input w-full text-xs mb-2">
                  <option value="none">No Logo</option>
                  <option value="wheel">Wheel</option>
                  <option value="marquee">Marquee</option>
                </select>
              </div>

              <div className="pt-2 border-t border-[#2a2f38]">
                <div className="text-xs text-[#ffaa00]/70 mb-2 tracking-widest">REGION</div>
                <select value={preferredRegion} onChange={(e) => setPreferredRegion(e.target.value)} className="retro-input w-full text-xs">
                  <option value="eu">EU (Europa)</option>
                  <option value="us">US (USA)</option>
                  <option value="jp">JP (Japan)</option>
                  <option value="fr">FR (France)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-[#2a2f38]">
                <div className="text-xs text-[#ffaa00]/70 mb-2 tracking-widest">EXTRAS</div>
                <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                  <input type="checkbox" checked={downloadVideos} onChange={(e) => setDownloadVideos(e.target.checked)} className="accent-[#00ff41] w-4 h-4" />
                  <span className="text-xs">Download Videos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                  <input type="checkbox" checked={downloadManual} onChange={(e) => setDownloadManual(e.target.checked)} className="accent-[#00ff41] w-4 h-4" />
                  <span className="text-xs">Download Manual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={scanRatings} onChange={(e) => setScanRatings(e.target.checked)} className="accent-[#00ff41] w-4 h-4" />
                  <span className="text-xs">Scan Ratings</span>
                </label>
              </div>
            </div>
          </div>

          {systems.length > 0 && (
            <div className="lg:col-span-12 retro-panel crt p-6 mt-2">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <div className="text-[#ffaa00] text-sm tracking-[3px]">AVAILABLE CONSOLES</div>
                  <div className="font-bold text-2xl tracking-wide">SELECT SYSTEMS TO SCRAP</div>
                </div>
                <div className="text-right text-xs">
                  <div>{selectedSystems.length} / {systems.length} SELECTED</div>
                  <div className="text-[#ffaa00]">{totalMissing} COVERS PENDING</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {systems.map((system) => {
                  const isSelected = selectedSystems.includes(system.id);
                  return (
                    <div key={system.id} onClick={() => !isScraping && toggleSystem(system.id)} className={`system-card p-4 cursor-pointer flex flex-col items-center text-center ${isSelected ? 'selected' : ''}`}>
                      <div className="font-bold text-sm tracking-widest mb-1">{system.name.toUpperCase()}</div>
                      <div className="text-[10px] text-[#ffaa00] font-mono mb-1">{system.romCount} ROMS</div>
                      <div className={`inline-block px-3 py-px text-xs border ${isSelected ? 'border-[#ffaa00] text-[#ffaa00]' : 'border-[#2a2f38] text-white/60'}`}>
                        {system.missing} MISSING
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="lg:col-span-12 flex flex-wrap items-center gap-4 justify-between mt-3">
            <div className="flex items-center gap-4">
              {!isScraping ? (
                <button onClick={startScraping} disabled={!isLoggedIn || selectedSystems.length === 0 || systems.length === 0} className="retro-btn px-14 py-4 text-xl tracking-[4px] disabled:opacity-40">START SCRAPPING</button>
              ) : (
                <button onClick={stopScraping} className="retro-btn px-14 py-4 text-xl tracking-[4px] border-red-500 text-red-500">STOP</button>
              )}
              {downloadedCovers.length > 0 && !isScraping && (
                <button onClick={() => setShowGallery(true)} className="retro-btn px-8 py-4 border-[#ffaa00] text-[#ffaa00] tracking-[2px]">GALLERY ({downloadedCovers.length})</button>
              )}
            </div>
            <div className="text-xs text-[#ffaa00]/60 tracking-widest">REAL API MODE • FILE SYSTEM ACCESS</div>
          </div>

          {isScraping && (
            <div className="lg:col-span-12 retro-panel crt p-8 mt-4 border-[#ffaa00]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="font-bold text-xl tracking-[2px]">SCRAPPING IN PROGRESS</div>
                  <div className="text-[#ffaa00] text-xs tracking-widest mt-px">SCREENSCRAPER API • LIVE</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl tabular-nums tracking-widest">{progress}<span className="text-sm align-super">%</span></div>
                  <div className="text-xs text-white/60">{processedCount} / {totalToProcess}</div>
                </div>
              </div>

              <div className="retro-progress mb-6">
                <div className="retro-progress-bar" style={{ width: `${progress}%` }} />
              </div>

              {currentSystem && (
                <div className="text-sm mb-2 flex items-center gap-3">
                  <span className="text-[#ffaa00]">SYSTEM:</span> 
                  <span className="font-bold tracking-widest">{currentSystem}</span>
                </div>
              )}
              {currentGame && (
                <div className="text-sm mb-4 flex items-center gap-3">
                  <span className="text-[#00ff41]">GAME:</span> 
                  <span className="font-bold tracking-widest">{currentGame}</span>
                </div>
              )}

              <div ref={terminal2Ref} className="terminal p-4 font-mono text-xs leading-relaxed h-48 overflow-y-auto">
                {logs.length === 0 && <div className="opacity-60">INITIALIZING...</div>}
                {logs.map(log => (
                  <div key={log.id} className={log.type === 'success' ? 'text-[#39ff14]' : log.type === 'error' ? 'text-[#ff3355]' : 'text-[#00cc33]'}>
                    [{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}] {log.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t-4 border-[#2a2f38] py-4 text-center text-xs text-[#00ff41]/50 tracking-[2px]">
        SD SCRAPPER • POWERED BY SCREENSCRAPER.FR
      </div>

      {showGallery && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6" onClick={() => setShowGallery(false)}>
          <div className="max-w-6xl w-full retro-panel crt p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="text-[#ffaa00] tracking-[4px] text-sm">DOWNLOADED</div>
                <div className="text-4xl tracking-[3px] font-bold">COVER GALLERY</div>
              </div>
              <button onClick={() => setShowGallery(false)} className="retro-btn px-8 py-3">CLOSE</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {downloadedCovers.map((cover, idx) => (
                <div key={idx} className="cover-card">
                  <div className="cover-frame p-2">
                    <div className="aspect-[4/3] bg-black overflow-hidden">
                      <img src={cover.image} alt={cover.game} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="px-3 py-2 text-center text-xs text-[#ffaa00] border-t border-[#2a2f38]">
                    {cover.game}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}