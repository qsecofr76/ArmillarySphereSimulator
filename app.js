/**
 * Simulatore 3D di Sfera Armillare
 * Logica e rendering 3D basati su Three.js
 */

// --- CONFIGURAZIONE E STATO GLOBALE ---
let scene, camera, renderer, controls;
let mobileGroup, celestialSphereGroup, earthGroup;
let starField;

// Elementi 3D per controllo visibilità
let horizonMesh, fixedMeridianMesh;
let equatorMesh, tropicCancerMesh, tropicCapricornMesh;
let arcticCircleMesh, antarcticCircleMesh;
let equinoxColureMesh, solsticeColureMesh;
let zodiacBandMesh;
let sunMesh;
let earthGlobeMesh, earthAxisMesh;
let terrestrialMeridians = [];

// Stato della simulazione
let latitude = 45; // Latitudine iniziale
let speedMultiplier = 1.0;
let celestialRotationActive = true;
let earthRotationActive = false;
let currentHour = 12.0; // Ora del giorno corrente
let currentDate = new Date('2026-05-26'); // Data corrente

const baseRotationSpeed = 0.005;

// Colori (coerenti con style.css)
const COLORS = {
  horizon: 0x00f5d4,
  meridian: 0xffb703,
  equator: 0x00bbf9,
  tropics: 0xff007f,
  polar: 0x90e0ef,
  terrestrial: 0x9b5de5,
  earthLand: 0x4cc9f0,
  earthWater: 0x071126,
  goldMetal: 0xd4af37,
  brass: 0xb5a642,
  zodiac: 0xff9f1c,
  equinox: 0x9b5de5,
  solstice: 0xff477e
};

// Poligoni approssimati per il disegno procedurale della Terra
const CONTINENTS = {
  northAmerica: [
    [-168, 65], [-120, 75], [-90, 80], [-60, 83], [-50, 60], [-60, 50],
    [-45, 48], [-60, 43], [-80, 25], [-85, 10], [-99, 15], [-105, 20],
    [-110, 8], [-95, 15], [-100, 30], [-120, 35], [-125, 48], [-168, 65]
  ],
  southAmerica: [
    [-80, 10], [-70, 12], [-50, -5], [-35, -7], [-40, -20], [-60, -40],
    [-70, -55], [-75, -50], [-72, -35], [-80, -10], [-82, 0], [-80, 10]
  ],
  greenland: [
    [-70, 70], [-60, 83], [-20, 80], [-35, 60], [-60, 60], [-70, 70]
  ],
  africa: [
    [-17, 32], [-5, 36], [10, 32], [30, 31], [33, 27], [50, 12],
    [40, -15], [30, -30], [20, -35], [10, -34], [10, -10], [5, -5],
    [-10, 5], [-17, 15], [-17, 32]
  ],
  eurasia: [
    [-10, 60], [0, 70], [20, 75], [40, 75], [60, 78], [100, 75],
    [140, 73], [170, 70], [180, 65], [170, 50], [140, 35], [120, 30],
    [108, 15], [96, 12], [80, 20], [75, 12], [60, 25], [50, 15],
    [35, 30], [15, 30], [25, 40], [10, 45], [-5, 40], [-10, 50], [-10, 60]
  ],
  australia: [
    [113, -22], [125, -15], [145, -15], [150, -33], [140, -37],
    [115, -34], [113, -22]
  ],
  madagascar: [
    [45, -12], [50, -15], [48, -25], [43, -22], [45, -12]
  ],
  antarctica: [
    [-180, -72], [180, -72], [180, -90], [-180, -90], [-180, -72]
  ]
};

// --- INIZIALIZZAZIONE ---
function init() {
  const container = document.getElementById('canvas-container');

  // 1. Scena & Background
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030308, 0.015);

  // 2. Camera
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(10, 8, 12);

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // 4. OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 4;
  controls.maxDistance = 20;

  // 5. Luci
  setupLights();

  // 6. Starfield (Sfondo)
  createStarfield();

  // 7. Costruzione Gruppi Logici
  // fixedGroup contiene gli elementi solidali con l'osservatore (orizzonte, meridiano esterno fisso)
  const fixedGroup = new THREE.Group();
  scene.add(fixedGroup);

  // mobileGroup contiene gli elementi che ruotano per latitudine
  mobileGroup = new THREE.Group();
  scene.add(mobileGroup);

  // celestialSphereGroup contiene gli anelli celesti mobili (ruota sul proprio asse polare)
  celestialSphereGroup = new THREE.Group();
  mobileGroup.add(celestialSphereGroup);

  // earthGroup contiene il globo e i suoi meridiani terrestri (ruota sul proprio asse indipendentemente)
  earthGroup = new THREE.Group();
  mobileGroup.add(earthGroup);

  // 8. Costruzione degli Elementi Grafici
  buildFixedElements(fixedGroup);
  buildMobileElements(celestialSphereGroup);
  buildEarthGlobe(earthGroup);

  // 9. Imposta Inclinazione Iniziale (Latitudine) e Data di base
  updateLatitude(latitude);
  updateDateSimulation(new Date('2026-05-26'));

  // 10. Collegamento UI
  setupEventHandlers();

  // Di default su schermi mobili e tablet la sidebar parte collassata per non coprire il canvas 3D
  if (window.innerWidth <= 900) {
    document.querySelector('.sidebar').classList.add('collapsed');
    document.getElementById('sidebar-toggle').setAttribute('aria-label', "Mostra Controlli");
  }

  // 11. Loop di Animazione
  animate();
}

// --- LUCI ---
function setupLights() {
  const ambientLight = new THREE.AmbientLight(0x1e1b4b, 0.6);
  scene.add(ambientLight);

  // Luce direzionale solare primaria (di riempimento debole)
  const sunLight = new THREE.DirectionalLight(0xfffbeb, 0.4);
  sunLight.position.set(15, 10, 10);
  scene.add(sunLight);

  // Luce azzurra di contrasto dal basso
  const skyLight = new THREE.HemisphereLight(0x00bbf9, 0x111122, 0.3);
  scene.add(skyLight);
}

// --- CREAZIONE STELLE DI SFONDO ---
function createStarfield() {
  const starsGeometry = new THREE.BufferGeometry();
  const starsCount = 1200;
  const starPositions = new Float32Array(starsCount * 3);
  const starColors = new Float32Array(starsCount * 3);

  for (let i = 0; i < starsCount * 3; i += 3) {
    // Coordinate sferiche casuali ad ampia distanza
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 40 + Math.random() * 20;

    starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i + 2] = r * Math.cos(phi);

    // Sfumature di colore stelle (bianco, giallo, azzurro)
    const colorType = Math.random();
    if (colorType > 0.8) {
      // Stelle calde/azzurre
      starColors[i] = 0.7; starColors[i+1] = 0.9; starColors[i+2] = 1.0;
    } else if (colorType > 0.6) {
      // Stelle giallognole
      starColors[i] = 1.0; starColors[i+1] = 0.95; starColors[i+2] = 0.7;
    } else {
      // Stelle bianche standard
      starColors[i] = 1.0; starColors[i+1] = 1.0; starColors[i+2] = 1.0;
    }
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starsMaterial = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });

  starField = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(starField);
}

// --- DISEGNO PROCEDURALE TEXTURE DELLA TERRA ---
function generateEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 1. Sfondo Oceano Deep Blue
  ctx.fillStyle = '#060a17';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Disegno Griglia Terrestre (Paralleli e Meridiani)
  ctx.strokeStyle = 'rgba(76, 201, 240, 0.08)';
  ctx.lineWidth = 1;

  // Disegna paralleli
  for (let lat = -80; lat <= 80; lat += 10) {
    const y = ((90 - lat) / 180) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Disegna meridiani
  for (let lon = -180; lon <= 180; lon += 15) {
    const x = ((lon + 180) / 360) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // 3. Disegno dei Continenti con Glow
  ctx.fillStyle = '#10b981'; // Smeraldo futuristico per le terre emerse
  ctx.strokeStyle = '#4cc9f0'; // Confini ciano neon
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#00f5d4';
  ctx.shadowBlur = 4;

  Object.keys(CONTINENTS).forEach(key => {
    ctx.beginPath();
    const coords = CONTINENTS[key];
    coords.forEach((pt, idx) => {
      const x = ((pt[0] + 180) / 360) * canvas.width;
      const y = ((90 - pt[1]) / 180) * canvas.height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  return new THREE.CanvasTexture(canvas);
}

// --- DISEGNO PROCEDURALE TEXTURE DELLA FASCIA ZODIACALE ---
function generateZodiacTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Sfondo blu scuro semi-trasparente
  ctx.fillStyle = 'rgba(6, 10, 25, 0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Bordi superiore e inferiore dorati brillanti
  ctx.strokeStyle = '#ff9f1c';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#ff9f1c';
  ctx.shadowBlur = 6;

  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.lineTo(canvas.width, 3);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, canvas.height - 3);
  ctx.lineTo(canvas.width, canvas.height - 3);
  ctx.stroke();

  ctx.shadowBlur = 0; // Disattiva il bagliore per i dettagli minuti

  // I 12 Segni dello Zodiaco, simboli e nomi
  const numSigns = 12;
  const secWidth = canvas.width / numSigns;
  const signs = [
    { name: "ARIETE", sym: "♈" },
    { name: "TORO", sym: "♉" },
    { name: "GEMELLI", sym: "♊" },
    { name: "CANCRO", sym: "♋" },
    { name: "LEONE", sym: "♌" },
    { name: "VERGINE", sym: "♍" },
    { name: "BILANCIA", sym: "♎" },
    { name: "SCORPIONE", sym: "♏" },
    { name: "SAGITTARIO", sym: "♐" },
    { name: "CAPRICORNO", sym: "♑" },
    { name: "ACQUARIO", sym: "♒" },
    { name: "PESCI", sym: "♓" }
  ];

  for (let i = 0; i < numSigns; i++) {
    const xStart = i * secWidth;
    const xCenter = xStart + secWidth / 2;

    // Linea divisoria tra i segni celesti
    ctx.strokeStyle = 'rgba(255, 159, 28, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xStart, 0);
    ctx.lineTo(xStart, canvas.height);
    ctx.stroke();

    // Genera puntini stellari casuali all'interno della sezione (costellazione)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const numStars = 4 + Math.floor(Math.random() * 4);
    const starPts = [];
    for (let s = 0; s < numStars; s++) {
      const sx = xStart + 20 + Math.random() * (secWidth - 40);
      const sy = 20 + Math.random() * (canvas.height - 40);
      starPts.push({ x: sx, y: sy });
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2 + Math.random() * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Collega i puntini con linee debolissime per simulare la costellazione
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 0; c < starPts.length - 1; c++) {
      ctx.moveTo(starPts[c].x, starPts[c].y);
      ctx.lineTo(starPts[c+1].x, starPts[c+1].y);
    }
    ctx.stroke();

    // Disegna Testo e Simbolo dello Zodiaco
    ctx.fillStyle = '#ffb703';
    ctx.textAlign = 'center';
    
    // Simbolo centrale
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(signs[i].sym, xCenter, 55);

    // Nome in basso
    ctx.fillStyle = '#f8f9fa';
    ctx.font = 'bold 13px "Outfit", sans-serif';
    ctx.fillText(signs[i].name, xCenter, 95);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

// --- COSTRUZIONE ELEMENTI FISSI (ORIZZONTE & MERIDIANO FISSO) ---
function buildFixedElements(group) {
  // 1. Orizzonte Celeste (Piano + Bordi 3D)
  // Geometria del piano ad anello semitrasparente
  const horizonGeo = new THREE.RingGeometry(5.2, 6.2, 64);
  const horizonMat = new THREE.MeshStandardMaterial({
    color: COLORS.horizon,
    emissive: COLORS.horizon,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    roughness: 0.1,
    metalness: 0.9
  });
  
  const horizonPlane = new THREE.Mesh(horizonGeo, horizonMat);
  horizonPlane.rotation.x = -Math.PI / 2; // Rende orizzontale (piano XZ)
  group.add(horizonPlane);
  horizonMesh = horizonPlane;

  // Bordi 3D dorati/metallo per conferire un look premium "fisico"
  const innerBorderGeo = new THREE.TorusGeometry(5.2, 0.02, 16, 100);
  const outerBorderGeo = new THREE.TorusGeometry(6.2, 0.02, 16, 100);
  const brassMat = new THREE.MeshStandardMaterial({
    color: COLORS.brass,
    roughness: 0.2,
    metalness: 0.9
  });

  const innerBorder = new THREE.Mesh(innerBorderGeo, brassMat);
  innerBorder.rotation.x = Math.PI / 2;
  group.add(innerBorder);

  const outerBorder = new THREE.Mesh(outerBorderGeo, brassMat);
  outerBorder.rotation.x = Math.PI / 2;
  group.add(outerBorder);

  // Aggiunta indicatori dei punti cardinali sull'orizzonte
  const cardinalColors = [0xff0000, 0xffffff, 0x00bbff, 0xffffff]; // Nord: Rosso, Sud: Blu, Est/Ovest: Bianco
  const cardinalPositions = [
    new THREE.Vector3(0, 0.05, 5.7),  // Nord (Z positivo)
    new THREE.Vector3(5.7, 0.05, 0),  // Est (X positivo)
    new THREE.Vector3(0, 0.05, -5.7), // Sud (Z negativo)
    new THREE.Vector3(-5.7, 0.05, 0)  // Ovest (X negativo)
  ];

  cardinalPositions.forEach((pos, idx) => {
    // Piccola piramide neon ad indicare la direzione cardinale
    const pyrGeo = new THREE.ConeGeometry(0.12, 0.25, 4);
    const pyrMat = new THREE.MeshBasicMaterial({
      color: cardinalColors[idx]
    });
    const pyr = new THREE.Mesh(pyrGeo, pyrMat);
    pyr.position.copy(pos);
    if (idx === 0 || idx === 2) pyr.rotation.x = Math.PI; // Allineamento
    group.add(pyr);
  });

  // 2. Meridiano Celeste Esterno Fisso
  // Anello verticale perpendicolare all'orizzonte, orientato Nord-Sud nel piano YZ
  const fixedMeridianGeo = new THREE.TorusGeometry(5.7, 0.08, 16, 100);
  const fixedMeridianMat = new THREE.MeshStandardMaterial({
    color: COLORS.meridian,
    emissive: COLORS.meridian,
    emissiveIntensity: 0.3,
    roughness: 0.1,
    metalness: 0.9
  });

  const fixedMeridian = new THREE.Mesh(fixedMeridianGeo, fixedMeridianMat);
  // Ruota per allinearlo al piano verticale YZ (invece di XY)
  fixedMeridian.rotation.y = Math.PI / 2;
  group.add(fixedMeridian);
  fixedMeridianMesh = fixedMeridian;
}

// --- COSTRUZIONE ELEMENTI MOBILI (SFERA INCLINATA) ---
function buildMobileElements(group) {
  // 1. Asse Polare (Asta metallica centrale passante per i poli)
  const axisGeo = new THREE.CylinderGeometry(0.03, 0.03, 11.4, 16);
  const axisMat = new THREE.MeshStandardMaterial({
    color: COLORS.brass,
    roughness: 0.2,
    metalness: 0.9
  });
  const axis = new THREE.Mesh(axisGeo, axisMat);
  group.add(axis);

  // Piccoli terminali dorati dell'asse (Poli celesti)
  const capGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const capMat = new THREE.MeshStandardMaterial({ color: COLORS.goldMetal, metalness: 0.9, roughness: 0.1 });
  
  const northCap = new THREE.Mesh(capGeo, capMat);
  northCap.position.y = 5.7;
  group.add(northCap);

  const southCap = new THREE.Mesh(capGeo, capMat);
  southCap.position.y = -5.7;
  group.add(southCap);

  // 2. Equatore Celeste (Anello mobile primario)
  const equatorGeo = new THREE.TorusGeometry(5.0, 0.06, 16, 100);
  const equatorMat = new THREE.MeshStandardMaterial({
    color: COLORS.equator,
    emissive: COLORS.equator,
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.8
  });
  
  const equator = new THREE.Mesh(equatorGeo, equatorMat);
  equator.rotation.x = Math.PI / 2; // Orizzontale nel gruppo locale mobile
  group.add(equator);
  equatorMesh = equator;

  // Materiale per i paralleli minori (Tropici e Circoli Polari)
  const createParallelMaterial = (color, intensity) => {
    return new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.2,
      metalness: 0.8
    });
  };

  // R = raggio sfera = 5.0
  const R = 5.0;

  // 3. Tropico del Cancro (+23.5°)
  const cancerAngle = 23.44 * Math.PI / 180;
  const cancerRad = R * Math.cos(cancerAngle);
  const cancerHeight = R * Math.sin(cancerAngle);

  const tropicCancerGeo = new THREE.TorusGeometry(cancerRad, 0.04, 16, 100);
  const tropicsMat = createParallelMaterial(COLORS.tropics, 0.55);
  
  tropicCancerMesh = new THREE.Mesh(tropicCancerGeo, tropicsMat);
  tropicCancerMesh.rotation.x = Math.PI / 2;
  tropicCancerMesh.position.y = cancerHeight;
  group.add(tropicCancerMesh);

  // 4. Tropico del Capricorno (-23.5°)
  const tropicCapricornGeo = new THREE.TorusGeometry(cancerRad, 0.04, 16, 100);
  
  tropicCapricornMesh = new THREE.Mesh(tropicCapricornGeo, tropicsMat);
  tropicCapricornMesh.rotation.x = Math.PI / 2;
  tropicCapricornMesh.position.y = -cancerHeight;
  group.add(tropicCapricornMesh);

  // 5. Circolo Polare Artico (+66.5°)
  const polarAngle = 66.56 * Math.PI / 180;
  const polarRad = R * Math.cos(polarAngle);
  const polarHeight = R * Math.sin(polarAngle);

  const arcticCircleGeo = new THREE.TorusGeometry(polarRad, 0.04, 16, 100);
  const polarMat = createParallelMaterial(COLORS.polar, 0.5);

  arcticCircleMesh = new THREE.Mesh(arcticCircleGeo, polarMat);
  arcticCircleMesh.rotation.x = Math.PI / 2;
  arcticCircleMesh.position.y = polarHeight;
  group.add(arcticCircleMesh);

  // 6. Circolo Polare Antartico (-66.5°)
  const antarcticCircleGeo = new THREE.TorusGeometry(polarRad, 0.04, 16, 100);
  
  antarcticCircleMesh = new THREE.Mesh(antarcticCircleGeo, polarMat);
  antarcticCircleMesh.rotation.x = Math.PI / 2;
  antarcticCircleMesh.position.y = -polarHeight;
  group.add(antarcticCircleMesh);

  // 7. Coluri (Meridiani Celesti Mobili principali)
  // Anelli verticali di raggio 5.0 passanti per i poli celesti, perpendicolari tra loro.
  const colureGeo = new THREE.TorusGeometry(5.0, 0.035, 16, 100);
  
  // A. Coluro Equinoziale (passa per i punti equinoziali, colore Viola)
  const equinoxMat = new THREE.MeshStandardMaterial({
    color: COLORS.equinox,
    emissive: COLORS.equinox,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.8
  });
  equinoxColureMesh = new THREE.Mesh(colureGeo, equinoxMat);
  equinoxColureMesh.rotation.y = Math.PI / 2; // Giace nel piano YZ locale (contiene gli equinozi a x=0)
  group.add(equinoxColureMesh);

  // B. Coluro Solstiziale (passa per i punti solstiziali, colore Rosa/Rosso)
  const solsticeMat = new THREE.MeshStandardMaterial({
    color: COLORS.solstice,
    emissive: COLORS.solstice,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.8
  });
  solsticeColureMesh = new THREE.Mesh(colureGeo, solsticeMat);
  solsticeColureMesh.rotation.y = 0; // Giace nel piano XY locale (contiene i solstizi a z=0)
  group.add(solsticeColureMesh);

  // 8. Fascia Zodiacale (Eclittica) - Tilted band between the Tropics
  const zodiacTexture = generateZodiacTexture();
  // Cilindro aperto alle estremità, raggio 5.08 (leggermente maggiore di R=5.0 per non compenetrarsi), altezza 0.6
  const zodiacGeo = new THREE.CylinderGeometry(5.08, 5.08, 0.6, 128, 1, true);
  const zodiacMat = new THREE.MeshStandardMaterial({
    map: zodiacTexture,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    roughness: 0.2,
    metalness: 0.8,
    emissive: COLORS.zodiac,
    emissiveMap: zodiacTexture,
    emissiveIntensity: 0.55
  });

  zodiacBandMesh = new THREE.Mesh(zodiacGeo, zodiacMat);
  // Inclinazione sull'eclittica: ruota il cilindro sull'asse Z locale di 23.44° rispetto all'equatore
  zodiacBandMesh.rotation.z = 23.44 * Math.PI / 180;
  group.add(zodiacBandMesh);

  // 9. Il Sole - Sfera luminosa sull'Eclittica (inserita direttamente dentro zodiacBandMesh)
  const sunGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
  sunMesh = new THREE.Mesh(sunGeo, sunMat);

  // Luce puntiforme del Sole per illuminare la Terra e mostrare l'effetto delle stagioni
  const sunLight = new THREE.PointLight(0xfffae0, 2.5, 14, 0.4);
  sunMesh.add(sunLight);

  // Corona o corona di luce attorno al Sole
  const coronaGeo = new THREE.SphereGeometry(0.32, 16, 16);
  const coronaMat = new THREE.MeshBasicMaterial({
    color: 0xffea00,
    transparent: true,
    opacity: 0.2
  });
  const corona = new THREE.Mesh(coronaGeo, coronaMat);
  sunMesh.add(corona);

  // Aggiunge il Sole alla fascia zodiacale in modo che risieda nel piano inclinato dell'eclittica
  zodiacBandMesh.add(sunMesh);

  // Nascosto di default come richiesto per concentrarsi solo sulla fascia zodiacale
  sunMesh.visible = false;
}

// --- COSTRUZIONE GLOBO TERRESTRE CENTRALE ---
function buildEarthGlobe(group) {
  // 1. Sfera della Terra con texture geografica procedurale
  const earthGeo = new THREE.SphereGeometry(1.6, 64, 64);
  const earthTexture = generateEarthTexture();
  
  const earthMat = new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.35,
    metalness: 0.15,
    emissive: 0x4cc9f0,
    emissiveMap: earthTexture,
    emissiveIntensity: 0.4 // Rende i confini dei continenti delicatamente luminosi
  });

  earthGlobeMesh = new THREE.Mesh(earthGeo, earthMat);
  group.add(earthGlobeMesh);

  // 2. Piccola asta che indica l'asse terrestre allineata con l'asse dei poli
  const earthAxisGeo = new THREE.CylinderGeometry(0.015, 0.015, 3.8, 16);
  const earthAxisMat = new THREE.MeshStandardMaterial({
    color: COLORS.brass,
    metalness: 0.9,
    roughness: 0.2
  });
  earthAxisMesh = new THREE.Mesh(earthAxisGeo, earthAxisMat);
  group.add(earthAxisMesh);

  // 3. 4 Meridiani Terrestri (anelli metallici sottilissimi attorno alla Terra)
  // Avvolgono strettamente il globo per motivi estetici e didattici
  const terrMeridianGeo = new THREE.TorusGeometry(1.63, 0.012, 8, 80);
  const terrMeridianMat = new THREE.MeshStandardMaterial({
    color: COLORS.terrestrial,
    emissive: COLORS.terrestrial,
    emissiveIntensity: 0.2,
    metalness: 0.8,
    roughness: 0.3
  });

  const angles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4];
  angles.forEach(angle => {
    const meridian = new THREE.Mesh(terrMeridianGeo, terrMeridianMat);
    meridian.rotation.y = angle;
    group.add(meridian);
    terrestrialMeridians.push(meridian);
  });
}

// --- DINAMICA INCLINAZIONE LATITUDINE ---
function updateLatitude(latValue) {
  latitude = latValue;
  
  // Converte gradi in radianti
  const latRad = latitude * Math.PI / 180;
  
  // Formula di rotazione: a 90° (Polo Nord) l'inclinazione è zero (asse polare = Zenith).
  // A 0° (Equatore) l'inclinazione è 90° (l'asse è orizzontale sul piano XZ).
  // Di conseguenza la rotazione sull'asse X rispetto all'orizzonte fisso è: (90 - Latitudine).
  const rotationAngle = (90 - latitude) * Math.PI / 180;
  
  // Applica la rotazione al gruppo contenitore mobile
  mobileGroup.rotation.x = rotationAngle;

  // Aggiorna etichette testuali nell'interfaccia utente
  const labelSuffix = latitude >= 0 ? "° N" : "° S";
  const absLat = Math.abs(latitude).toFixed(0);
  
  document.getElementById('lat-val-label').innerText = `${absLat}${labelSuffix}`;
  document.getElementById('hud-lat-value').innerText = `${absLat}.0${labelSuffix}`;
}

// --- DINAMICA SIMULAZIONE DELLA DATA & ECLITTICA ---
const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getDateFromDay(year, day) {
  const date = new Date(year, 0); // 1 Gennaio
  return new Date(date.setDate(day));
}

function getZodiacSign(date) {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return { name: "Ariete", sym: "♈" };
  } else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return { name: "Toro", sym: "♉" };
  } else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return { name: "Gemelli", sym: "♊" };
  } else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return { name: "Cancro", sym: "♋" };
  } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return { name: "Leone", sym: "♌" };
  } else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return { name: "Vergine", sym: "♍" };
  } else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return { name: "Bilancia", sym: "♎" };
  } else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return { name: "Scorpione", sym: "♏" };
  } else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return { name: "Sagittario", sym: "♐" };
  } else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return { name: "Capricorno", sym: "♑" };
  } else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return { name: "Acquario", sym: "♒" };
  } else {
    return { name: "Pesci", sym: "♓" };
  }
}

function updateDateSimulation(date) {
  currentDate = date; // Salva la data corrente a livello globale
  const day = getDayOfYear(date);
  
  // L'angolo lungo l'eclittica: equinozio di primavera (20 marzo, giorno ~79) a lambda = 0 (local +Z, inizio Ariete)
  // Per una corretta visione Boreale, il moto annuo del Sole è in senso antiorario (da Ovest a Est dello Zodiaco),
  // quindi l'angolo decresce per spostarsi da +Z (Equinozio, Ariete) a +X (Solstizio d'Estate, Cancro).
  const angle = -((day - 79) / 365.24) * 2 * Math.PI + Math.PI / 2;

  // Posiziona il Sole localmente sul cerchio dell'eclittica (figlio di zodiacBandMesh, R = 5.08)
  if (sunMesh) {
    sunMesh.position.x = 5.08 * Math.cos(angle);
    sunMesh.position.y = 0;
    sunMesh.position.z = 5.08 * Math.sin(angle);
  }

  // Calcolo matematico dell'angolo di rotazione Y per allineare il punto solare al meridiano Sud locale (mezzogiorno locale).
  const x_local = Math.cos(angle) * Math.cos(23.44 * Math.PI / 180);
  const z_local = Math.sin(angle);
  const noonAngle = Math.atan2(-x_local, -z_local);

  // Calcolo dell'angolo orario dovuto all'ora del giorno (12:00 = 0 diff, 24 ore = 2*PI radianti)
  // Per la visione Boreale, il moto diurno apparente va da Est a Ovest (rotazione in senso orario, ovvero decrescente in Y).
  const hourAngle = -(currentHour - 12.0) * (2 * Math.PI / 24.0);

  // Applica la rotazione alla Sfera Celeste (somma di mezzogiorno locale + scostamento orario diurno)
  celestialSphereGroup.rotation.y = noonAngle + hourAngle;

  // Calcola il Segno Zodiacale corrente
  const zodiac = getZodiacSign(date);

  // Aggiorna UI Data
  const dayName = date.getDate();
  const monthName = MONTHS_IT[date.getMonth()];
  const yearName = date.getFullYear();

  document.getElementById('date-val-label').innerText = `${dayName} ${monthName} ${yearName}`;
  document.getElementById('day-val-label').innerText = `Giorno ${day}`;
  document.getElementById('zodiac-hud-sidebar').innerHTML = `Sole nel Segno dei ${zodiac.name} ${zodiac.sym}`;

  // Aggiorna UI Ora del Giorno
  const hours = Math.floor(currentHour);
  const minutes = Math.floor((currentHour - hours) * 60);
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  
  let labelDesc = "";
  if (currentHour >= 5.0 && currentHour < 8.0) labelDesc = " (Alba)";
  else if (currentHour >= 8.0 && currentHour < 12.0) labelDesc = " (Mattina)";
  else if (currentHour === 12.0) labelDesc = " (Mezzogiorno)";
  else if (currentHour > 12.0 && currentHour < 17.0) labelDesc = " (Pomeriggio)";
  else if (currentHour >= 17.0 && currentHour < 20.0) labelDesc = " (Tramonto)";
  else if (currentHour >= 20.0 && currentHour < 24.0) labelDesc = " (Sera)";
  else labelDesc = " (Notte)";

  document.getElementById('time-val-label').innerText = `${hh}:${mm}${labelDesc}`;
}

// --- GESTIONE EVENTI & CONTROLLI UI ---
function setupEventHandlers() {
  // Slider Latitudine
  const latSlider = document.getElementById('latitude-slider');
  latSlider.addEventListener('input', (e) => {
    updateLatitude(parseFloat(e.target.value));
  });

  // Date Picker & Day Slider (Sincronizzazione Bidirezionale)
  const datePicker = document.getElementById('date-picker');
  const daySlider = document.getElementById('day-slider');

  // Sincronizza da Date Picker a Slider del giorno
  datePicker.addEventListener('change', (e) => {
    if (!e.target.value) return;
    const date = new Date(e.target.value);
    const day = getDayOfYear(date);
    daySlider.value = day;
    updateDateSimulation(date);
  });

  // Sincronizza da Slider a Date Picker (Calendario)
  daySlider.addEventListener('input', (e) => {
    const day = parseInt(e.target.value);
    const date = getDateFromDay(2026, day); // Utilizziamo il 2026 come riferimento
    
    // Formatta in YYYY-MM-DD per il date-picker
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    datePicker.value = `${yyyy}-${mm}-${dd}`;
    
    updateDateSimulation(date);
  });

  // Slider Velocità Rotazione
  const speedSlider = document.getElementById('speed-slider');
  speedSlider.addEventListener('input', (e) => {
    speedMultiplier = parseFloat(e.target.value);
    document.getElementById('speed-val-label').innerText = `${speedMultiplier.toFixed(1)}x`;
  });

  // Slider Ora del Giorno
  const timeSlider = document.getElementById('time-slider');
  timeSlider.addEventListener('input', (e) => {
    currentHour = parseFloat(e.target.value);
    updateDateSimulation(currentDate);
  });

  // Pulsante Play/Pause Sfera Celeste
  const btnCelestial = document.getElementById('btn-play-celestial');
  btnCelestial.addEventListener('click', () => {
    celestialRotationActive = !celestialRotationActive;
    
    // Aggiorna grafica pulsante
    document.getElementById('btn-play-icon').innerText = celestialRotationActive ? "⏸" : "▶";
    document.getElementById('btn-play-text').innerText = celestialRotationActive ? "Pausa Sfera" : "Avvia Sfera";
    
    if (celestialRotationActive) {
      btnCelestial.classList.add('btn-primary');
    } else {
      btnCelestial.classList.remove('btn-primary');
      // Snappa istantaneamente l'orientamento della fascia alla data selezionata (mezzogiorno locale)
      const date = new Date(datePicker.value);
      updateDateSimulation(date);
    }
  });

  // Pulsante Rotazione Terra
  const btnEarth = document.getElementById('btn-play-earth');
  btnEarth.addEventListener('click', () => {
    earthRotationActive = !earthRotationActive;
    btnEarth.classList.toggle('btn-primary');
  });

  // Gestione dei Toggle di Visibilità
  const bindToggle = (elementId, targetMeshOrList) => {
    const toggle = document.getElementById(elementId);
    toggle.addEventListener('change', (e) => {
      const visible = e.target.checked;
      if (Array.isArray(targetMeshOrList)) {
        targetMeshOrList.forEach(mesh => mesh.visible = visible);
      } else if (targetMeshOrList) {
        targetMeshOrList.visible = visible;
      }
    });
  };

  // Associazione controlli
  bindToggle('toggle-horizon', horizonMesh);
  bindToggle('toggle-meridian', fixedMeridianMesh);
  bindToggle('toggle-equator', equatorMesh);
  bindToggle('toggle-zodiac', zodiacBandMesh);
  
  // Sincronizzazione dei due toggle del Sole (visibilità generale + pannello data)
  const toggleSun = document.getElementById('toggle-sun');
  const toggleSunDate = document.getElementById('toggle-sun-date');

  const updateSunVisibility = (visible) => {
    sunMesh.visible = visible;
    toggleSun.checked = visible;
    toggleSunDate.checked = visible;
  };

  toggleSun.addEventListener('change', (e) => {
    updateSunVisibility(e.target.checked);
  });

  toggleSunDate.addEventListener('change', (e) => {
    updateSunVisibility(e.target.checked);
  });
  
  // Tropici (include entrambi)
  const toggleTropics = document.getElementById('toggle-tropics');
  toggleTropics.addEventListener('change', (e) => {
    tropicCancerMesh.visible = e.target.checked;
    tropicCapricornMesh.visible = e.target.checked;
  });

  // Circoli Polari (include entrambi)
  const togglePolar = document.getElementById('toggle-polar');
  togglePolar.addEventListener('change', (e) => {
    arcticCircleMesh.visible = e.target.checked;
    antarcticCircleMesh.visible = e.target.checked;
  });

  // Coluro Equinoziale e Solstiziale
  bindToggle('toggle-equinox', equinoxColureMesh);
  bindToggle('toggle-solstice', solsticeColureMesh);

  // Pulsante per collassare la barra laterale (drawer) e overlay mobile
  const btnToggleSidebar = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  const toggleSidebar = (forceCollapse) => {
    let isCollapsed;
    if (typeof forceCollapse === 'boolean') {
      isCollapsed = forceCollapse;
      if (isCollapsed) {
        sidebar.classList.add('collapsed');
      } else {
        sidebar.classList.remove('collapsed');
      }
    } else {
      isCollapsed = sidebar.classList.toggle('collapsed');
    }
    
    btnToggleSidebar.setAttribute('aria-label', isCollapsed ? "Mostra Controlli" : "Nascondi Controlli");
    
    if (overlay) {
      if (isCollapsed) {
        overlay.classList.remove('active');
      } else {
        if (window.innerWidth <= 900) {
          overlay.classList.add('active');
        }
      }
    }
  };

  btnToggleSidebar.addEventListener('click', () => toggleSidebar());
  if (overlay) {
    overlay.addEventListener('click', () => {
      toggleSidebar(true);
    });
  }

  // Pulsante fluttuante per decollassare la barra dei controlli
  const floatingMenuBtn = document.getElementById('floating-menu-btn');
  if (floatingMenuBtn) {
    floatingMenuBtn.addEventListener('click', () => {
      toggleSidebar(false); // Espande la barra laterale
    });
  }

  // Globo Terrestre + Asse + Meridiani Terrestri
  const toggleEarth = document.getElementById('toggle-earth');
  toggleEarth.addEventListener('change', (e) => {
    const visible = e.target.checked;
    earthGlobeMesh.visible = visible;
    earthAxisMesh.visible = visible;
    terrestrialMeridians.forEach(mesh => mesh.visible = visible);
  });

  // Resize del browser
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  const overlay = document.getElementById('sidebar-overlay');
  if (window.innerWidth > 900 && overlay) {
    overlay.classList.remove('active');
  }
}

// --- ANIMATION LOOP ---
function animate() {
  requestAnimationFrame(animate);

  const deltaMultiplier = speedMultiplier;

  // 1. Rotazione Giornaliera della Sfera Celeste (Diurna)
  if (celestialRotationActive) {
    // Incrementa l'ora del giorno in base alla velocità (24 ore = giro completo della sfera celeste di 2*PI radianti)
    currentHour += (baseRotationSpeed * deltaMultiplier * 24.0) / (2 * Math.PI);
    if (currentHour >= 24.0) currentHour -= 24.0;
    
    // Aggiorna lo slider dell'ora del giorno
    document.getElementById('time-slider').value = currentHour;
    
    // Applica l'orientamento diurno corretto in base a data ed ora corrente
    updateDateSimulation(currentDate);
  }

  // 2. Rotazione Propria del Globo Terrestre (Heliocentrica)
  if (earthRotationActive) {
    // Per una corretta visione Boreale, la Terra ruota verso Est (senso antiorario, Y crescente)
    earthGroup.rotation.y += baseRotationSpeed * deltaMultiplier * 1.5;
  }

  // Aggiorna controlli di orbita telecamera
  controls.update();

  // Rendering scena
  renderer.render(scene, camera);
}

// Avvio applicazione al caricamento del DOM
window.addEventListener('DOMContentLoaded', init);
