const bgCanvas = document.getElementById('bgCanvas');
const uiCanvas = document.getElementById('uiCanvas');
const bgCtx = bgCanvas.getContext('2d');
const uiCtx = uiCanvas.getContext('2d');
const coordTooltip = document.getElementById('coordTooltip');
const nCoordSpan = document.getElementById('nCoord');
const eCoordSpan = document.getElementById('eCoord');
const customCursor = document.getElementById('customCursor');
const cursorIcon = document.querySelector('.cursor-icon');

let width, height;

// Mouse coordinates initialized offscreen so lines don't appear initially
let mouseX = -100;
let mouseY = -100;
let targetMouseX = mouseX;
let targetMouseY = mouseY;
let visualCursorX = mouseX;
let visualCursorY = mouseY;

let isMagnetic = false;
let magneticCenter = { x: 0, y: 0 };

// Configuration options
const GRID_SIZE = 40; // Scale of the drawing board grid
const GRID_COLOR = 'rgba(139, 119, 101, 0.15)'; // Aesthetic brown
const GRID_HIGHLIGHT_COLOR = 'rgba(139, 119, 101, 0.4)'; // Darker brown for highlight
const CROSSHAIR_COLOR = 'rgba(139, 119, 101, 0.35)';
const DRAWING_COLOR = 'rgba(139, 119, 101, 0.18)'; // Restored for random drawings
const VANISH_TIME = 15000; // Time in ms before a point fully vanishes (15 seconds)

// Active sketches engines
const drawings = []; // Re-added for the background random lines
let userDrawings = [];
let currentDrawing = null;
let isDrawing = false;
let activeVignettes = [];

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    
    // Support high DPI / Retina displays to make the lines perfectly crisp
    const dpr = window.devicePixelRatio || 1;
    
    bgCanvas.width = width * dpr;
    bgCanvas.height = height * dpr;
    uiCanvas.width = width * dpr;
    uiCanvas.height = height * dpr;
    
    bgCtx.scale(dpr, dpr);
    uiCtx.scale(dpr, dpr);
    
    bgCanvas.style.width = width + 'px';
    bgCanvas.style.height = height + 'px';
    uiCanvas.style.width = width + 'px';
    uiCanvas.style.height = height + 'px';
    
    drawGrid();
}

function drawGrid() {
    bgCtx.clearRect(0, 0, width, height);

    // Draw grid lines
    bgCtx.beginPath();
    bgCtx.strokeStyle = GRID_COLOR;
    bgCtx.lineWidth = 1;

    // Draw vertical grid lines
    for (let x = 0; x <= width; x += GRID_SIZE) {
        bgCtx.moveTo(x + 0.5, 0);
        bgCtx.lineTo(x + 0.5, height);
    }
    // Draw horizontal grid lines
    for (let y = 0; y <= height; y += GRID_SIZE) {
        bgCtx.moveTo(0, y + 0.5);
        bgCtx.lineTo(width, y + 0.5);
    }
    bgCtx.stroke();

    // Draw weighted grid dots at intersections
    const influenceRadius = 120;
    
    for (let x = 0; x <= width; x += GRID_SIZE) {
        for (let y = 0; y <= height; y += GRID_SIZE) {
            // Calculate distance from cursor
            const dx = mouseX - x;
            const dy = mouseY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < influenceRadius) {
                // Calculate opacity based on proximity (closer = darker)
                const proximity = 1 - (distance / influenceRadius);
                const opacity = 0.15 + (proximity * 0.5); // Base 0.15 to max 0.65
                const dotSize = 1.5 + (proximity * 2.5); // Base 1.5px to max 4px
                
                bgCtx.beginPath();
                bgCtx.fillStyle = `rgba(139, 119, 101, ${opacity})`;
                bgCtx.arc(x, y, dotSize, 0, Math.PI * 2);
                bgCtx.fill();
            } else {
                // Draw faint base dot
                bgCtx.beginPath();
                bgCtx.fillStyle = 'rgba(139, 119, 101, 0.12)';
                bgCtx.arc(x, y, 1.5, 0, Math.PI * 2);
                bgCtx.fill();
            }
        }
    }
}

// --- ARCHITECTURAL SKETCH CHOREOGRAPHY ENGINE ---

// Library of sequence definitions (relative to a 0,0 origin)
// Personal interests: Football, Chelsea, Tech, Watch, Gym, Plants, Car, Legos, Stats
const VIGNETTES = {
    // === FOOTBALL PITCH ===
    footballPitch: [
        // Outer pitch
        { type: "line", start: [10,20], end: [130,20], duration: 500, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [130,20], end: [130,90], duration: 400, weight: 1.5, opacity: 0.15, delay: 300 },
        { type: "line", start: [130,90], end: [10,90], duration: 500, weight: 1.5, opacity: 0.15, delay: 600 },
        { type: "line", start: [10,90], end: [10,20], duration: 400, weight: 1.5, opacity: 0.15, delay: 900 },
        // Center line
        { type: "line", start: [70,20], end: [70,90], duration: 400, weight: 1.2, opacity: 0.12, delay: 1100 },
        // Center circle
        { type: "arc", center: [70,55], radius: 15, startAngle: 0, endAngle: Math.PI * 2, duration: 400, weight: 1.2, opacity: 0.12, delay: 1400 },
        // Center dot
        { type: "arc", center: [70,55], radius: 2, startAngle: 0, endAngle: Math.PI * 2, duration: 100, weight: 0.8, opacity: 0.1, delay: 1800 },
        // Left goal area
        { type: "line", start: [10,40], end: [25,40], duration: 200, weight: 1, opacity: 0.12, delay: 1600 },
        { type: "line", start: [25,40], end: [25,70], duration: 200, weight: 1, opacity: 0.12, delay: 1800 },
        { type: "line", start: [25,70], end: [10,70], duration: 200, weight: 1, opacity: 0.12, delay: 2000 },
        // Right goal area
        { type: "line", start: [130,40], end: [115,40], duration: 200, weight: 1, opacity: 0.12, delay: 1700 },
        { type: "line", start: [115,40], end: [115,70], duration: 200, weight: 1, opacity: 0.12, delay: 1900 },
        { type: "line", start: [115,70], end: [130,70], duration: 200, weight: 1, opacity: 0.12, delay: 2100 },
        // Label
        { type: "text", point: [50,5], text: "Stamford Bridge", delay: 2300 }
    ],

    // === CHELSEA LOGO (Simplified Lion Crest) ===
    chelseaLogo: [
        // Shield outline
        { type: "line", start: [30,25], end: [30,65], duration: 300, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [30,65], end: [70,80], duration: 300, weight: 1.5, opacity: 0.15, delay: 250 },
        { type: "line", start: [70,80], end: [110,65], duration: 300, weight: 1.5, opacity: 0.15, delay: 500 },
        { type: "line", start: [110,65], end: [110,25], duration: 300, weight: 1.5, opacity: 0.15, delay: 750 },
        { type: "line", start: [110,25], end: [70,15], duration: 300, weight: 1.5, opacity: 0.15, delay: 1000 },
        { type: "line", start: [70,15], end: [30,25], duration: 300, weight: 1.5, opacity: 0.15, delay: 1250 },
        // Lion body (simplified)
        { type: "line", start: [55,45], end: [85,45], duration: 250, weight: 1.2, opacity: 0.12, delay: 1500 },
        { type: "line", start: [55,45], end: [50,60], duration: 200, weight: 1.2, opacity: 0.12, delay: 1700 },
        { type: "line", start: [85,45], end: [90,60], duration: 200, weight: 1.2, opacity: 0.12, delay: 1850 },
        { type: "line", start: [50,60], end: [65,70], duration: 200, weight: 1.2, opacity: 0.12, delay: 2000 },
        { type: "line", start: [90,60], end: [75,70], duration: 200, weight: 1.2, opacity: 0.12, delay: 2150 },
        { type: "line", start: [65,70], end: [75,70], duration: 150, weight: 1.2, opacity: 0.12, delay: 2300 },
        // Staff/Cane
        { type: "line", start: [90,35], end: [90,75], duration: 250, weight: 1, opacity: 0.12, delay: 2000 },
        // CFC letters area
        { type: "text", point: [55,38], text: "CFC", delay: 2500 }
    ],

    // === KEYBOARD ===
    keyboard: [
        // Keyboard body
        { type: "line", start: [10,30], end: [110,30], duration: 400, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [110,30], end: [110,60], duration: 300, weight: 1.5, opacity: 0.15, delay: 300 },
        { type: "line", start: [110,60], end: [10,60], duration: 400, weight: 1.5, opacity: 0.15, delay: 550 },
        { type: "line", start: [10,60], end: [10,30], duration: 300, weight: 1.5, opacity: 0.15, delay: 900 },
        // Key rows
        { type: "line", start: [15,35], end: [105,35], duration: 250, weight: 0.8, opacity: 0.1, delay: 1100 },
        { type: "line", start: [15,42], end: [105,42], duration: 250, weight: 0.8, opacity: 0.1, delay: 1300 },
        { type: "line", start: [15,49], end: [105,49], duration: 250, weight: 0.8, opacity: 0.1, delay: 1500 },
        { type: "line", start: [15,56], end: [105,56], duration: 250, weight: 0.8, opacity: 0.1, delay: 1700 },
        // Vertical key lines
        { type: "line", start: [25,35], end: [25,56], duration: 200, weight: 0.8, opacity: 0.1, delay: 1200 },
        { type: "line", start: [40,35], end: [40,56], duration: 200, weight: 0.8, opacity: 0.1, delay: 1350 },
        { type: "line", start: [55,35], end: [55,56], duration: 200, weight: 0.8, opacity: 0.1, delay: 1500 },
        { type: "line", start: [70,35], end: [70,56], duration: 200, weight: 0.8, opacity: 0.1, delay: 1650 },
        { type: "line", start: [85,35], end: [85,56], duration: 200, weight: 0.8, opacity: 0.1, delay: 1800 },
        { type: "line", start: [100,35], end: [100,56], duration: 200, weight: 0.8, opacity: 0.1, delay: 1950 },
        // Spacebar
        { type: "line", start: [35,56], end: [85,56], duration: 200, weight: 1, opacity: 0.12, delay: 2100 },
        // Label
        { type: "text", point: [35,20], text: "Mechanical", delay: 2300 }
    ],

    // === MOUSE ===
    mouse: [
        // Mouse body (ellipse-like)
        { type: "arc", center: [60,50], radius: 25, startAngle: 0.2, endAngle: Math.PI * 0.8, duration: 400, weight: 1.5, opacity: 0.15 },
        { type: "arc", center: [60,50], radius: 18, startAngle: Math.PI * 0.8, endAngle: Math.PI * 2.2, duration: 350, weight: 1.5, opacity: 0.15, delay: 350 },
        // Left/right click divide
        { type: "line", start: [60,25], end: [60,40], duration: 200, weight: 1, opacity: 0.12, delay: 700 },
        // Scroll wheel
        { type: "line", start: [55,32], end: [65,32], duration: 100, weight: 0.8, opacity: 0.1, delay: 900 },
        { type: "line", start: [55,32], end: [55,38], duration: 100, weight: 0.8, opacity: 0.1, delay: 1000 },
        { type: "line", start: [65,32], end: [65,38], duration: 100, weight: 0.8, opacity: 0.1, delay: 1100 },
        { type: "line", start: [55,38], end: [65,38], duration: 100, weight: 0.8, opacity: 0.1, delay: 1200 },
        // Cable
        { type: "line", start: [60,25], end: [60,10], duration: 200, weight: 0.8, opacity: 0.1, delay: 1300 },
        // Label
        { type: "text", point: [35,75], text: "Gaming Mouse", delay: 1600 }
    ],

    // === PC CASE ===
    pcCase: [
        // Case body
        { type: "line", start: [30,15], end: [30,85], duration: 400, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [30,85], end: [90,85], duration: 400, weight: 1.5, opacity: 0.15, delay: 350 },
        { type: "line", start: [90,85], end: [90,15], duration: 400, weight: 1.5, opacity: 0.15, delay: 700 },
        { type: "line", start: [90,15], end: [30,15], duration: 400, weight: 1.5, opacity: 0.15, delay: 1050 },
        // Side window
        { type: "line", start: [40,30], end: [40,70], duration: 250, weight: 1.2, opacity: 0.12, delay: 1400 },
        { type: "line", start: [40,70], end: [80,70], duration: 250, weight: 1.2, opacity: 0.12, delay: 1600 },
        { type: "line", start: [80,70], end: [80,30], duration: 250, weight: 1.2, opacity: 0.12, delay: 1800 },
        { type: "line", start: [80,30], end: [40,30], duration: 250, weight: 1.2, opacity: 0.12, delay: 2000 },
        // GPU inside
        { type: "line", start: [45,45], end: [75,45], duration: 200, weight: 0.8, opacity: 0.1, delay: 2100 },
        { type: "line", start: [45,52], end: [75,52], duration: 200, weight: 0.8, opacity: 0.1, delay: 2250 },
        // Power button
        { type: "arc", center: [50,22], radius: 4, startAngle: 0, endAngle: Math.PI * 2, duration: 150, weight: 0.8, opacity: 0.1, delay: 2300 },
        // Label
        { type: "text", point: [95,50], text: "RGB Build", delay: 2500 }
    ],

    // === GPU ===
    gpu: [
        // GPU body
        { type: "line", start: [15,35], end: [105,35], duration: 450, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [105,35], end: [105,65], duration: 350, weight: 1.5, opacity: 0.15, delay: 400 },
        { type: "line", start: [105,65], end: [15,65], duration: 450, weight: 1.5, opacity: 0.15, delay: 700 },
        { type: "line", start: [15,65], end: [15,35], duration: 350, weight: 1.5, opacity: 0.15, delay: 1100 },
        // Fan 1
        { type: "arc", center: [40,50], radius: 12, startAngle: 0, endAngle: Math.PI * 2, duration: 300, weight: 1.2, opacity: 0.12, delay: 1400 },
        { type: "line", start: [40,38], end: [40,62], duration: 150, weight: 0.8, opacity: 0.1, delay: 1700 },
        { type: "line", start: [28,50], end: [52,50], duration: 150, weight: 0.8, opacity: 0.1, delay: 1800 },
        // Fan 2
        { type: "arc", center: [80,50], radius: 12, startAngle: 0, endAngle: Math.PI * 2, duration: 300, weight: 1.2, opacity: 0.12, delay: 1600 },
        { type: "line", start: [80,38], end: [80,62], duration: 150, weight: 0.8, opacity: 0.1, delay: 1900 },
        { type: "line", start: [68,50], end: [92,50], duration: 150, weight: 0.8, opacity: 0.1, delay: 2000 },
        // Label
        { type: "text", point: [40,25], text: "RTX 4080", delay: 2200 }
    ],
    // === WATCH ===
    watch: [
        // Watch face circle
        { type: "arc", center: [60,50], radius: 30, startAngle: 0, endAngle: Math.PI * 2, duration: 450, weight: 1.5, opacity: 0.15 },
        // Hour markers
        { type: "line", start: [60,23], end: [60,28], duration: 100, weight: 0.8, opacity: 0.1, delay: 500 },
        { type: "line", start: [60,72], end: [60,77], duration: 100, weight: 0.8, opacity: 0.1, delay: 550 },
        { type: "line", start: [33,50], end: [38,50], duration: 100, weight: 0.8, opacity: 0.1, delay: 600 },
        { type: "line", start: [82,50], end: [87,50], duration: 100, weight: 0.8, opacity: 0.1, delay: 650 },
        // Hour hand
        { type: "line", start: [60,50], end: [48,38], duration: 200, weight: 1.2, opacity: 0.12, delay: 800 },
        // Minute hand
        { type: "line", start: [60,50], end: [75,35], duration: 200, weight: 1, opacity: 0.12, delay: 1000 },
        // Center pin
        { type: "arc", center: [60,50], radius: 3, startAngle: 0, endAngle: Math.PI * 2, duration: 100, weight: 0.8, opacity: 0.1, delay: 1200 },
        // Top strap
        { type: "line", start: [45,22], end: [48,5], duration: 200, weight: 1, opacity: 0.12, delay: 1300 },
        { type: "line", start: [75,22], end: [72,5], duration: 200, weight: 1, opacity: 0.12, delay: 1450 },
        { type: "line", start: [48,5], end: [72,5], duration: 150, weight: 1, opacity: 0.12, delay: 1600 },
        // Bottom strap
        { type: "line", start: [45,78], end: [48,95], duration: 200, weight: 1, opacity: 0.12, delay: 1400 },
        { type: "line", start: [75,78], end: [72,95], duration: 200, weight: 1, opacity: 0.12, delay: 1550 },
        { type: "line", start: [48,95], end: [72,95], duration: 150, weight: 1, opacity: 0.12, delay: 1700 },
        // Label
        { type: "text", point: [40,10], text: "Automatic", delay: 1900 }
    ],

    // === GYM / DUMBBELL ===
    dumbbell: [
        // Center bar
        { type: "line", start: [35,50], end: [85,50], duration: 300, weight: 1.5, opacity: 0.15 },
        // Left weight (hexagon)
        { type: "line", start: [20,35], end: [35,35], duration: 200, weight: 1.5, opacity: 0.15, delay: 300 },
        { type: "line", start: [35,35], end: [35,65], duration: 200, weight: 1.5, opacity: 0.15, delay: 450 },
        { type: "line", start: [35,65], end: [20,65], duration: 200, weight: 1.5, opacity: 0.15, delay: 600 },
        { type: "line", start: [20,65], end: [15,58], duration: 150, weight: 1.5, opacity: 0.15, delay: 750 },
        { type: "line", start: [15,58], end: [15,42], duration: 150, weight: 1.5, opacity: 0.15, delay: 900 },
        { type: "line", start: [15,42], end: [20,35], duration: 150, weight: 1.5, opacity: 0.15, delay: 1050 },
        // Right weight (hexagon)
        { type: "line", start: [85,35], end: [100,35], duration: 200, weight: 1.5, opacity: 0.15, delay: 400 },
        { type: "line", start: [100,35], end: [105,42], duration: 150, weight: 1.5, opacity: 0.15, delay: 550 },
        { type: "line", start: [105,42], end: [105,58], duration: 150, weight: 1.5, opacity: 0.15, delay: 700 },
        { type: "line", start: [105,58], end: [100,65], duration: 150, weight: 1.5, opacity: 0.15, delay: 850 },
        { type: "line", start: [100,65], end: [85,65], duration: 200, weight: 1.5, opacity: 0.15, delay: 1000 },
        { type: "line", start: [85,65], end: [85,35], duration: 200, weight: 1.5, opacity: 0.15, delay: 1150 },
        // Label
        { type: "text", point: [40,20], text: "20 kg", delay: 1400 }
    ],

    // === PLANT ===
    plant: [
        // Pot
        { type: "line", start: [40,60], end: [45,85], duration: 250, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [80,60], end: [75,85], duration: 250, weight: 1.5, opacity: 0.15, delay: 200 },
        { type: "line", start: [45,85], end: [75,85], duration: 200, weight: 1.5, opacity: 0.15, delay: 400 },
        { type: "line", start: [40,60], end: [80,60], duration: 200, weight: 1.5, opacity: 0.15, delay: 550 },
        // Stem
        { type: "line", start: [60,60], end: [60,40], duration: 200, weight: 1, opacity: 0.12, delay: 700 },
        // Leaves
        { type: "line", start: [60,50], end: [40,45], duration: 200, weight: 0.8, opacity: 0.1, delay: 900 },
        { type: "line", start: [40,45], end: [30,50], duration: 150, weight: 0.8, opacity: 0.1, delay: 1050 },
        { type: "line", start: [60,45], end: [80,40], duration: 200, weight: 0.8, opacity: 0.1, delay: 950 },
        { type: "line", start: [80,40], end: [90,45], duration: 150, weight: 0.8, opacity: 0.1, delay: 1100 },
        { type: "line", start: [60,40], end: [50,25], duration: 200, weight: 0.8, opacity: 0.1, delay: 1000 },
        { type: "line", start: [50,25], end: [40,30], duration: 150, weight: 0.8, opacity: 0.1, delay: 1150 },
        { type: "line", start: [60,40], end: [70,25], duration: 200, weight: 0.8, opacity: 0.1, delay: 1050 },
        { type: "line", start: [70,25], end: [80,30], duration: 150, weight: 0.8, opacity: 0.1, delay: 1200 },
        // Label
        { type: "text", point: [85,75], text: "Monstera", delay: 1400 }
    ],

    // === CAR (Side View) ===
    car: [
        // Ground line
        { type: "line", start: [10,80], end: [120,80], duration: 300, weight: 0.8, opacity: 0.1, dash: [4,4] },
        // Rear wheel
        { type: "arc", center: [30,65], radius: 18, startAngle: 0, endAngle: Math.PI, duration: 300, weight: 1.5, opacity: 0.15, delay: 200 },
        { type: "arc", center: [30,65], radius: 12, startAngle: 0, endAngle: Math.PI * 2, duration: 250, weight: 0.8, opacity: 0.1, delay: 450 },
        // Front wheel
        { type: "arc", center: [95,65], radius: 18, startAngle: 0, endAngle: Math.PI, duration: 300, weight: 1.5, opacity: 0.15, delay: 300 },
        { type: "arc", center: [95,65], radius: 12, startAngle: 0, endAngle: Math.PI * 2, duration: 250, weight: 0.8, opacity: 0.1, delay: 550 },
        // Body bottom
        { type: "line", start: [12,65], end: [113,65], duration: 350, weight: 1.5, opacity: 0.15, delay: 600 },
        // Rear bumper
        { type: "line", start: [10,55], end: [12,65], duration: 200, weight: 1.5, opacity: 0.15, delay: 800 },
        // Trunk
        { type: "line", start: [10,55], end: [35,50], duration: 250, weight: 1.5, opacity: 0.15, delay: 950 },
        // Rear window
        { type: "line", start: [35,50], end: [50,30], duration: 250, weight: 1.2, opacity: 0.12, delay: 1100 },
        // Roof
        { type: "line", start: [50,30], end: [90,28], duration: 300, weight: 1.5, opacity: 0.15, delay: 1250 },
        // Windshield
        { type: "line", start: [90,28], end: [105,50], duration: 250, weight: 1.2, opacity: 0.12, delay: 1400 },
        // Hood
        { type: "line", start: [105,50], end: [118,55], duration: 200, weight: 1.5, opacity: 0.15, delay: 1550 },
        // Front bumper
        { type: "line", start: [118,55], end: [120,65], duration: 200, weight: 1.5, opacity: 0.15, delay: 1700 },
        // Door line
        { type: "line", start: [55,30], end: [55,65], duration: 200, weight: 0.8, opacity: 0.1, delay: 1800 },
        // Handle
        { type: "line", start: [70,48], end: [80,48], duration: 100, weight: 0.8, opacity: 0.1, delay: 1950 },
        // Label
        { type: "text", point: [50,15], text: "Sedan", delay: 2200 }
    ],
    // === LEGO BRICK (2x2) ===
    legoBrick: [
        // Brick body
        { type: "line", start: [25,45], end: [95,45], duration: 300, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [95,45], end: [95,75], duration: 250, weight: 1.5, opacity: 0.15, delay: 250 },
        { type: "line", start: [95,75], end: [25,75], duration: 300, weight: 1.5, opacity: 0.15, delay: 450 },
        { type: "line", start: [25,75], end: [25,45], duration: 250, weight: 1.5, opacity: 0.15, delay: 700 },
        // Stud 1
        { type: "arc", center: [40,42], radius: 8, startAngle: 0, endAngle: Math.PI, duration: 200, weight: 1, opacity: 0.12, delay: 900 },
        { type: "line", start: [32,42], end: [32,35], duration: 100, weight: 0.8, opacity: 0.1, delay: 1050 },
        { type: "line", start: [48,42], end: [48,35], duration: 100, weight: 0.8, opacity: 0.1, delay: 1100 },
        { type: "line", start: [32,35], end: [48,35], duration: 100, weight: 0.8, opacity: 0.1, delay: 1200 },
        // Stud 2
        { type: "arc", center: [80,42], radius: 8, startAngle: 0, endAngle: Math.PI, duration: 200, weight: 1, opacity: 0.12, delay: 1000 },
        { type: "line", start: [72,42], end: [72,35], duration: 100, weight: 0.8, opacity: 0.1, delay: 1150 },
        { type: "line", start: [88,42], end: [88,35], duration: 100, weight: 0.8, opacity: 0.1, delay: 1200 },
        { type: "line", start: [72,35], end: [88,35], duration: 100, weight: 0.8, opacity: 0.1, delay: 1300 },
        // LEGO text hint
        { type: "text", point: [45,62], text: "LEGO", delay: 1500 }
    ],

    // === LEGO PIECE (1x1) ===
    legoPiece: [
        // Small brick body
        { type: "line", start: [40,50], end: [80,50], duration: 250, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [80,50], end: [80,75], duration: 200, weight: 1.5, opacity: 0.15, delay: 200 },
        { type: "line", start: [80,75], end: [40,75], duration: 250, weight: 1.5, opacity: 0.15, delay: 350 },
        { type: "line", start: [40,75], end: [40,50], duration: 200, weight: 1.5, opacity: 0.15, delay: 550 },
        // Single stud
        { type: "arc", center: [60,47], radius: 10, startAngle: 0, endAngle: Math.PI, duration: 250, weight: 1, opacity: 0.12, delay: 750 },
        { type: "line", start: [50,47], end: [50,38], duration: 150, weight: 0.8, opacity: 0.1, delay: 950 },
        { type: "line", start: [70,47], end: [70,38], duration: 150, weight: 0.8, opacity: 0.1, delay: 1050 },
        { type: "line", start: [50,38], end: [70,38], duration: 150, weight: 0.8, opacity: 0.1, delay: 1150 },
        // Label
        { type: "text", point: [75,88], text: "1x1", delay: 1400 }
    ],
    // === NEW: Floor Lamp ===
    floorLamp: [
        // Base
        { type: "line", start: [20,90], end: [80,90], duration: 400, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [20,90], end: [35,80], duration: 300, weight: 1.5, opacity: 0.15, delay: 300 },
        { type: "line", start: [80,90], end: [65,80], duration: 300, weight: 1.5, opacity: 0.15, delay: 400 },
        { type: "line", start: [35,80], end: [65,80], duration: 300, weight: 1.5, opacity: 0.15, delay: 600 },
        // Pole
        { type: "line", start: [50,80], end: [50,10], duration: 600, weight: 1.2, opacity: 0.15, delay: 800 },
        // Shade top
        { type: "line", start: [25,30], end: [75,30], duration: 400, weight: 1.5, opacity: 0.15, delay: 1200 },
        // Shade sides
        { type: "line", start: [25,30], end: [15,10], duration: 400, weight: 1.5, opacity: 0.15, delay: 1500 },
        { type: "line", start: [75,30], end: [85,10], duration: 400, weight: 1.5, opacity: 0.15, delay: 1600 },
        // Shade bottom (slight curve)
        { type: "arc", center: [50,10], radius: 35, startAngle: 0, endAngle: Math.PI, duration: 500, weight: 1.5, opacity: 0.15, delay: 1800 },
        // Light glow lines
        { type: "line", start: [15,10], end: [0,0], duration: 300, weight: 0.5, opacity: 0.06, dash: [2,3], delay: 2200 },
        { type: "line", start: [85,10], end: [100,0], duration: 300, weight: 0.5, opacity: 0.06, dash: [2,3], delay: 2300 },
        { type: "line", start: [50,10], end: [50,-5], duration: 200, weight: 0.5, opacity: 0.06, dash: [2,3], delay: 2400 },
        // Pull chain
        { type: "line", start: [65,25], end: [65,45], duration: 300, weight: 0.6, opacity: 0.1, delay: 2600 },
        // Label
        { type: "text", point: [90,50], text: "FL-02 Arc", delay: 2900 }
    ],
    // === NEW: Bookshelf Unit ===
    bookshelf: [
        // Outer frame
        { type: "line", start: [0,0], end: [0,100], duration: 500, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [80,0], end: [80,100], duration: 500, weight: 1.5, opacity: 0.15, delay: 200 },
        { type: "line", start: [0,0], end: [80,0], duration: 500, weight: 1.5, opacity: 0.15, delay: 500 },
        { type: "line", start: [0,100], end: [80,100], duration: 500, weight: 1.5, opacity: 0.15, delay: 700 },
        // Horizontal shelves
        { type: "line", start: [0,25], end: [80,25], duration: 400, weight: 1.2, opacity: 0.12, delay: 1000 },
        { type: "line", start: [0,50], end: [80,50], duration: 400, weight: 1.2, opacity: 0.12, delay: 1200 },
        { type: "line", start: [0,75], end: [80,75], duration: 400, weight: 1.2, opacity: 0.12, delay: 1400 },
        // Vertical divider
        { type: "line", start: [40,25], end: [40,50], duration: 300, weight: 1.2, opacity: 0.12, delay: 1600 },
        { type: "line", start: [40,75], end: [40,100], duration: 300, weight: 1.2, opacity: 0.12, delay: 1700 },
        // Books on top shelf (rectangles)
        { type: "line", start: [5,25], end: [5,8], duration: 200, weight: 1, opacity: 0.12, delay: 1800 },
        { type: "line", start: [12,25], end: [12,10], duration: 200, weight: 1, opacity: 0.12, delay: 1900 },
        { type: "line", start: [20,25], end: [20,5], duration: 200, weight: 1, opacity: 0.12, delay: 2000 },
        { type: "line", start: [5,8], end: [12,10], duration: 150, weight: 0.8, opacity: 0.1, delay: 2100 },
        // Decorative object on middle shelf
        { type: "arc", center: [60,37], radius: 8, startAngle: 0, endAngle: Math.PI, duration: 300, weight: 1, opacity: 0.12, delay: 2200 },
        { type: "line", start: [52,37], end: [52,50], duration: 200, weight: 1, opacity: 0.12, delay: 2400 },
        { type: "line", start: [68,37], end: [68,50], duration: 200, weight: 1, opacity: 0.12, delay: 2500 },
        // Label
        { type: "text", point: [85,50], text: "Unit 1800", delay: 2800 }
    ],
    // === NEW: Lounge Chair ===
    loungeChair: [
        // Seat base
        { type: "line", start: [20,60], end: [80,60], duration: 400, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [20,60], end: [15,80], duration: 300, weight: 1.5, opacity: 0.15, delay: 300 },
        { type: "line", start: [80,60], end: [85,80], duration: 300, weight: 1.5, opacity: 0.15, delay: 400 },
        // Seat cushion thickness
        { type: "line", start: [20,55], end: [80,55], duration: 400, weight: 1.2, opacity: 0.15, delay: 600 },
        { type: "line", start: [20,55], end: [20,60], duration: 100, weight: 1.2, opacity: 0.15, delay: 900 },
        { type: "line", start: [80,55], end: [80,60], duration: 100, weight: 1.2, opacity: 0.15, delay: 950 },
        // Backrest
        { type: "line", start: [20,55], end: [15,15], duration: 500, weight: 1.5, opacity: 0.15, delay: 1000 },
        { type: "line", start: [50,55], end: [50,10], duration: 500, weight: 1.5, opacity: 0.15, delay: 1100 },
        { type: "line", start: [15,15], end: [50,10], duration: 400, weight: 1.5, opacity: 0.15, delay: 1500 },
        // Armrest
        { type: "line", start: [60,55], end: [70,35], duration: 300, weight: 1.2, opacity: 0.15, delay: 1700 },
        { type: "line", start: [70,35], end: [85,35], duration: 200, weight: 1.2, opacity: 0.15, delay: 1900 },
        { type: "line", start: [85,35], end: [85,80], duration: 300, weight: 1.2, opacity: 0.15, delay: 2000 },
        // Legs
        { type: "line", start: [15,80], end: [10,95], duration: 300, weight: 1.2, opacity: 0.12, delay: 2200 },
        { type: "line", start: [85,80], end: [90,95], duration: 300, weight: 1.2, opacity: 0.12, delay: 2300 },
        // Back legs
        { type: "line", start: [25,60], end: [20,90], duration: 300, weight: 1, opacity: 0.1, dash: [3,3], delay: 2500 },
        // Label
        { type: "text", point: [95,70], text: "LC-07", delay: 2800 }
    ],
    // === NEW: Wall Mirror ===
    wallMirror: [
        // Outer frame - rectangle with slight perspective
        { type: "line", start: [10,20], end: [10,90], duration: 500, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [90,15], end: [90,85], duration: 500, weight: 1.5, opacity: 0.15, delay: 200 },
        { type: "line", start: [10,20], end: [90,15], duration: 500, weight: 1.5, opacity: 0.15, delay: 500 },
        { type: "line", start: [10,90], end: [90,85], duration: 500, weight: 1.5, opacity: 0.15, delay: 700 },
        // Inner frame
        { type: "line", start: [18,28], end: [18,82], duration: 400, weight: 1.2, opacity: 0.12, delay: 1000 },
        { type: "line", start: [82,23], end: [82,77], duration: 400, weight: 1.2, opacity: 0.12, delay: 1100 },
        { type: "line", start: [18,28], end: [82,23], duration: 400, weight: 1.2, opacity: 0.12, delay: 1400 },
        { type: "line", start: [18,82], end: [82,77], duration: 400, weight: 1.2, opacity: 0.12, delay: 1600 },
        // Mirror reflection lines (subtle)
        { type: "line", start: [25,35], end: [40,50], duration: 300, weight: 0.5, opacity: 0.06, dash: [3,5], delay: 1900 },
        { type: "line", start: [50,30], end: [65,45], duration: 300, weight: 0.5, opacity: 0.06, dash: [3,5], delay: 2100 },
        { type: "line", start: [30,60], end: [55,70], duration: 300, weight: 0.5, opacity: 0.06, dash: [3,5], delay: 2300 },
        // Frame detail
        { type: "line", start: [5,20], end: [10,20], duration: 200, weight: 1, opacity: 0.12, delay: 2500 },
        { type: "line", start: [90,15], end: [95,15], duration: 200, weight: 1, opacity: 0.12, delay: 2600 },
        // Label
        { type: "text", point: [95,50], text: "MR-900", delay: 2900 }
    ],
    // === NEW: Pendant Light ===
    pendantLight: [
        // Ceiling line
        { type: "line", start: [0,0], end: [100,0], duration: 400, weight: 1.5, opacity: 0.15 },
        // Cord
        { type: "line", start: [50,0], end: [50,40], duration: 500, weight: 0.8, opacity: 0.12, delay: 400 },
        // Canopy
        { type: "line", start: [42,0], end: [58,0], duration: 200, weight: 1.2, opacity: 0.15, delay: 800 },
        { type: "line", start: [42,0], end: [45,5], duration: 150, weight: 1.2, opacity: 0.15, delay: 900 },
        { type: "line", start: [58,0], end: [55,5], duration: 150, weight: 1.2, opacity: 0.15, delay: 950 },
        { type: "line", start: [45,5], end: [55,5], duration: 200, weight: 1.2, opacity: 0.15, delay: 1050 },
        // Shade outer
        { type: "line", start: [30,40], end: [70,40], duration: 400, weight: 1.5, opacity: 0.15, delay: 1200 },
        { type: "line", start: [30,40], end: [20,70], duration: 500, weight: 1.5, opacity: 0.15, delay: 1500 },
        { type: "line", start: [70,40], end: [80,70], duration: 500, weight: 1.5, opacity: 0.15, delay: 1600 },
        // Shade bottom curve
        { type: "arc", center: [50,70], radius: 30, startAngle: 0, endAngle: Math.PI, duration: 500, weight: 1.5, opacity: 0.15, delay: 1900 },
        // Inner shade (darker)
        { type: "line", start: [35,45], end: [65,45], duration: 300, weight: 1, opacity: 0.1, delay: 2200 },
        { type: "line", start: [35,45], end: [28,65], duration: 300, weight: 1, opacity: 0.1, delay: 2400 },
        { type: "line", start: [65,45], end: [72,65], duration: 300, weight: 1, opacity: 0.1, delay: 2500 },
        // Light rays
        { type: "line", start: [20,70], end: [5,95], duration: 300, weight: 0.4, opacity: 0.05, dash: [2,4], delay: 2800 },
        { type: "line", start: [50,100], end: [50,110], duration: 200, weight: 0.4, opacity: 0.05, dash: [2,4], delay: 3000 },
        { type: "line", start: [80,70], end: [95,95], duration: 300, weight: 0.4, opacity: 0.05, dash: [2,4], delay: 3100 },
        // Label
        { type: "text", point: [85,50], text: "P-03 Dome", delay: 3400 }
    ],
    // === NEW: Side Table ===
    sideTable: [
        // Top surface
        { type: "ellipse", center: [50,35], radiusX: 35, radiusY: 10, duration: 500, weight: 1.5, opacity: 0.15 },
        // Top thickness
        { type: "line", start: [15,35], end: [15,42], duration: 200, weight: 1.2, opacity: 0.15, delay: 400 },
        { type: "line", start: [85,35], end: [85,42], duration: 200, weight: 1.2, opacity: 0.15, delay: 500 },
        { type: "arc", center: [50,42], radius: 35, startAngle: 0, endAngle: Math.PI, duration: 400, weight: 1.2, opacity: 0.15, delay: 600 },
        // Central pedestal
        { type: "line", start: [40,42], end: [45,85], duration: 400, weight: 1.5, opacity: 0.15, delay: 900 },
        { type: "line", start: [60,42], end: [55,85], duration: 400, weight: 1.5, opacity: 0.15, delay: 1000 },
        // Base
        { type: "line", start: [30,85], end: [70,85], duration: 300, weight: 1.5, opacity: 0.15, delay: 1300 },
        { type: "line", start: [30,85], end: [25,92], duration: 200, weight: 1.5, opacity: 0.15, delay: 1500 },
        { type: "line", start: [70,85], end: [75,92], duration: 200, weight: 1.5, opacity: 0.15, delay: 1600 },
        { type: "line", start: [25,92], end: [75,92], duration: 300, weight: 1.5, opacity: 0.15, delay: 1700 },
        // Base curve
        { type: "arc", center: [50,92], radius: 25, startAngle: 0, endAngle: Math.PI, duration: 300, weight: 1.2, opacity: 0.12, delay: 1900 },
        // Decorative item on top (small bowl)
        { type: "arc", center: [50,30], radius: 8, startAngle: 0, endAngle: Math.PI, duration: 200, weight: 0.8, opacity: 0.1, delay: 2100 },
        { type: "line", start: [42,30], end: [42,25], duration: 150, weight: 0.8, opacity: 0.1, delay: 2300 },
        { type: "line", start: [58,30], end: [58,25], duration: 150, weight: 0.8, opacity: 0.1, delay: 2400 },
        // Label
        { type: "text", point: [90,60], text: "ST-Mini", delay: 2700 }
    ],
    // === NEW: Sports Car Side Profile ===
    sportsCar: [
        // Ground line
        { type: "line", start: [0,85], end: [160,85], duration: 400, weight: 1, opacity: 0.12, dash: [4,4] },
        // Front wheel
        { type: "arc", center: [35,70], radius: 18, startAngle: 0, endAngle: Math.PI, duration: 400, weight: 1.5, opacity: 0.15, delay: 200 },
        { type: "arc", center: [35,70], radius: 12, startAngle: 0, endAngle: Math.PI * 2, duration: 300, weight: 0.8, opacity: 0.1, delay: 500 },
        // Rear wheel
        { type: "arc", center: [125,70], radius: 20, startAngle: 0, endAngle: Math.PI, duration: 400, weight: 1.5, opacity: 0.15, delay: 300 },
        { type: "arc", center: [125,70], radius: 14, startAngle: 0, endAngle: Math.PI * 2, duration: 300, weight: 0.8, opacity: 0.1, delay: 600 },
        // Lower body line
        { type: "line", start: [17,70], end: [105,70], duration: 400, weight: 1.5, opacity: 0.15, delay: 700 },
        { type: "line", start: [145,70], end: [155,70], duration: 150, weight: 1.5, opacity: 0.15, delay: 900 },
        // Front bumper curve
        { type: "arc", center: [17,55], radius: 15, startAngle: Math.PI/2, endAngle: Math.PI, duration: 300, weight: 1.5, opacity: 0.15, delay: 800 },
        // Hood
        { type: "line", start: [2,55], end: [40,45], duration: 300, weight: 1.5, opacity: 0.15, delay: 1000 },
        // Windshield
        { type: "line", start: [40,45], end: [55,15], duration: 300, weight: 1.2, opacity: 0.12, delay: 1100 },
        // Roof
        { type: "line", start: [55,15], end: [110,12], duration: 400, weight: 1.5, opacity: 0.15, delay: 1200 },
        // Rear window
        { type: "line", start: [110,12], end: [135,30], duration: 300, weight: 1.2, opacity: 0.12, delay: 1400 },
        // Trunk deck
        { type: "line", start: [135,30], end: [155,45], duration: 300, weight: 1.5, opacity: 0.15, delay: 1500 },
        // Rear bumper
        { type: "line", start: [155,45], end: [155,70], duration: 200, weight: 1.5, opacity: 0.15, delay: 1600 },
        // Door line
        { type: "line", start: [50,45], end: [50,68], duration: 200, weight: 0.8, opacity: 0.1, delay: 1700 },
        { type: "line", start: [50,45], end: [100,42], duration: 250, weight: 0.8, opacity: 0.1, delay: 1800 },
        { type: "line", start: [100,42], end: [100,68], duration: 200, weight: 0.8, opacity: 0.1, delay: 1900 },
        // Handle
        { type: "line", start: [75,50], end: [85,49], duration: 150, weight: 0.8, opacity: 0.12, delay: 2000 },
        // Headlight hint
        { type: "arc", center: [12,50], radius: 5, startAngle: Math.PI/2, endAngle: Math.PI, duration: 150, weight: 0.6, opacity: 0.1, delay: 2100 },
        // Label
        { type: "text", point: [100,0], text: "GT Sport", delay: 2300 }
    ],
    // === NEW: Door Hinge Exploded View ===
    hingeDetail: [
        // Door frame (fixed part)
        { type: "line", start: [10,0], end: [10,100], duration: 400, weight: 2, opacity: 0.18 },
        { type: "line", start: [0,0], end: [10,0], duration: 150, weight: 2, opacity: 0.18, delay: 200 },
        { type: "line", start: [0,100], end: [10,100], duration: 150, weight: 2, opacity: 0.18, delay: 250 },
        // Frame hinge leaf
        { type: "line", start: [10,25], end: [30,25], duration: 200, weight: 1.5, opacity: 0.15, delay: 300 },
        { type: "line", start: [30,25], end: [30,40], duration: 150, weight: 1.5, opacity: 0.15, delay: 450 },
        { type: "line", start: [30,40], end: [10,40], duration: 200, weight: 1.5, opacity: 0.15, delay: 550 },
        // Top knuckle
        { type: "arc", center: [30,28], radius: 5, startAngle: 0, endAngle: Math.PI, duration: 200, weight: 1.2, opacity: 0.15, delay: 650 },
        // Bottom knuckle
        { type: "arc", center: [30,37], radius: 5, startAngle: Math.PI, endAngle: Math.PI * 2, duration: 200, weight: 1.2, opacity: 0.15, delay: 750 },
        // Pin (center line showing axis)
        { type: "line", start: [30,20], end: [30,45], duration: 200, weight: 0.8, opacity: 0.1, dash: [2,2], delay: 850 },
        // Door hinge leaf (offset to show exploded view)
        { type: "line", start: [50,20], end: [70,20], duration: 200, weight: 1.5, opacity: 0.15, delay: 1000 },
        { type: "line", start: [70,20], end: [70,45], duration: 200, weight: 1.5, opacity: 0.15, delay: 1150 },
        { type: "line", start: [70,45], end: [50,45], duration: 200, weight: 1.5, opacity: 0.15, delay: 1300 },
        { type: "line", start: [50,45], end: [50,20], duration: 200, weight: 1.5, opacity: 0.15, delay: 1450 },
        // Screw holes
        { type: "arc", center: [58,26], radius: 2, startAngle: 0, endAngle: Math.PI * 2, duration: 150, weight: 0.6, opacity: 0.1, delay: 1550 },
        { type: "arc", center: [58,39], radius: 2, startAngle: 0, endAngle: Math.PI * 2, duration: 150, weight: 0.6, opacity: 0.1, delay: 1650 },
        // Exploded view indicator lines
        { type: "line", start: [35,32], end: [45,32], duration: 200, weight: 0.5, opacity: 0.08, dash: [3,3], delay: 1750 },
        { type: "line", start: [42,30], end: [46,32], duration: 100, weight: 0.5, opacity: 0.08, delay: 1900 },
        { type: "line", start: [42,34], end: [46,32], duration: 100, weight: 0.5, opacity: 0.08, delay: 1950 },
        // Door panel (ghosted)
        { type: "line", start: [70,10], end: [70,90], duration: 300, weight: 0.8, opacity: 0.06, dash: [4,4], delay: 2000 },
        { type: "line", start: [70,10], end: [130,10], duration: 250, weight: 0.8, opacity: 0.06, dash: [4,4], delay: 2200 },
        { type: "line", start: [130,10], end: [130,90], duration: 300, weight: 0.8, opacity: 0.06, dash: [4,4], delay: 2400 },
        // Label
        { type: "text", point: [85,55], text: "Pivot Axis", delay: 2600 }
    ],
    // === NEW: Living Room Floor Plan ===
    livingRoom: [
        // Outer walls
        { type: "line", start: [0,0], end: [150,0], duration: 500, weight: 2, opacity: 0.18 },
        { type: "line", start: [150,0], end: [150,100], duration: 400, weight: 2, opacity: 0.18, delay: 400 },
        { type: "line", start: [150,100], end: [0,100], duration: 500, weight: 2, opacity: 0.18, delay: 700 },
        { type: "line", start: [0,100], end: [0,0], duration: 400, weight: 2, opacity: 0.18, delay: 1100 },
        // Entry door
        { type: "arc", center: [0,50], radius: 20, startAngle: -Math.PI/2, endAngle: 0, duration: 300, weight: 1, opacity: 0.12, delay: 1300 },
        // Sofa (L-shaped)
        { type: "line", start: [20,70], end: [70,70], duration: 300, weight: 1.5, opacity: 0.15, delay: 1400 },
        { type: "line", start: [70,70], end: [70,90], duration: 200, weight: 1.5, opacity: 0.15, delay: 1650 },
        { type: "line", start: [20,70], end: [20,85], duration: 200, weight: 1.5, opacity: 0.15, delay: 1800 },
        // Coffee table
        { type: "line", start: [35,50], end: [65,50], duration: 200, weight: 1.2, opacity: 0.12, delay: 1900 },
        { type: "line", start: [65,50], end: [65,65], duration: 150, weight: 1.2, opacity: 0.12, delay: 2050 },
        { type: "line", start: [65,65], end: [35,65], duration: 200, weight: 1.2, opacity: 0.12, delay: 2150 },
        { type: "line", start: [35,65], end: [35,50], duration: 150, weight: 1.2, opacity: 0.12, delay: 2300 },
        // TV console
        { type: "line", start: [130,30], end: [130,80], duration: 300, weight: 1.5, opacity: 0.15, delay: 2000 },
        { type: "line", start: [125,30], end: [125,80], duration: 300, weight: 1.5, opacity: 0.15, delay: 2200 },
        { type: "line", start: [125,30], end: [130,30], duration: 100, weight: 1.5, opacity: 0.15, delay: 2450 },
        { type: "line", start: [125,80], end: [130,80], duration: 100, weight: 1.5, opacity: 0.15, delay: 2500 },
        // Rug outline (dashed)
        { type: "line", start: [25,35], end: [110,35], duration: 300, weight: 0.8, opacity: 0.08, dash: [3,3], delay: 2400 },
        { type: "line", start: [110,35], end: [110,75], duration: 250, weight: 0.8, opacity: 0.08, dash: [3,3], delay: 2600 },
        { type: "line", start: [110,75], end: [25,75], duration: 300, weight: 0.8, opacity: 0.08, dash: [3,3], delay: 2800 },
        { type: "line", start: [25,75], end: [25,35], duration: 250, weight: 0.8, opacity: 0.08, dash: [3,3], delay: 3000 },
        // Window on top wall
        { type: "line", start: [40,-5], end: [110,-5], duration: 300, weight: 1, opacity: 0.12, delay: 2600 },
        { type: "line", start: [40,-5], end: [40,0], duration: 100, weight: 1, opacity: 0.12, delay: 2850 },
        { type: "line", start: [110,-5], end: [110,0], duration: 100, weight: 1, opacity: 0.12, delay: 2900 },
        // Label
        { type: "text", point: [70,-20], text: "Living Suite", delay: 3100 }
    ],
    // === NEW: Staircase Section ===
    staircaseSection: [
        // Ground floor
        { type: "line", start: [0,100], end: [50,100], duration: 300, weight: 2, opacity: 0.18 },
        // First floor landing
        { type: "line", start: [100,40], end: [150,40], duration: 300, weight: 2, opacity: 0.18, delay: 200 },
        { type: "line", start: [150,40], end: [150,100], duration: 250, weight: 2, opacity: 0.18, delay: 450 },
        // Stringer (diagonal support)
        { type: "line", start: [10,100], end: [110,40], duration: 500, weight: 1.5, opacity: 0.15, delay: 600 },
        { type: "line", start: [25,100], end: [125,40], duration: 500, weight: 1.5, opacity: 0.15, delay: 700 },
        // Steps
        { type: "line", start: [25,100], end: [25,92], duration: 150, weight: 1.2, opacity: 0.12, delay: 1100 },
        { type: "line", start: [25,92], end: [35,92], duration: 100, weight: 1.2, opacity: 0.12, delay: 1200 },
        { type: "line", start: [35,92], end: [35,84], duration: 150, weight: 1.2, opacity: 0.12, delay: 1280 },
        { type: "line", start: [35,84], end: [45,84], duration: 100, weight: 1.2, opacity: 0.12, delay: 1380 },
        { type: "line", start: [45,84], end: [45,76], duration: 150, weight: 1.2, opacity: 0.12, delay: 1460 },
        { type: "line", start: [45,76], end: [55,76], duration: 100, weight: 1.2, opacity: 0.12, delay: 1560 },
        { type: "line", start: [55,76], end: [55,68], duration: 150, weight: 1.2, opacity: 0.12, delay: 1640 },
        { type: "line", start: [55,68], end: [65,68], duration: 100, weight: 1.2, opacity: 0.12, delay: 1740 },
        { type: "line", start: [65,68], end: [65,60], duration: 150, weight: 1.2, opacity: 0.12, delay: 1820 },
        { type: "line", start: [65,60], end: [75,60], duration: 100, weight: 1.2, opacity: 0.12, delay: 1920 },
        { type: "line", start: [75,60], end: [75,52], duration: 150, weight: 1.2, opacity: 0.12, delay: 2000 },
        { type: "line", start: [75,52], end: [85,52], duration: 100, weight: 1.2, opacity: 0.12, delay: 2100 },
        { type: "line", start: [85,52], end: [85,44], duration: 150, weight: 1.2, opacity: 0.12, delay: 2180 },
        { type: "line", start: [85,44], end: [95,44], duration: 100, weight: 1.2, opacity: 0.12, delay: 2280 },
        { type: "line", start: [95,44], end: [95,40], duration: 100, weight: 1.2, opacity: 0.12, delay: 2360 },
        { type: "line", start: [95,40], end: [105,40], duration: 100, weight: 1.2, opacity: 0.12, delay: 2420 },
        // Railing posts
        { type: "line", start: [25,92], end: [25,75], duration: 200, weight: 0.8, opacity: 0.1, delay: 2000 },
        { type: "line", start: [45,84], end: [45,67], duration: 200, weight: 0.8, opacity: 0.1, delay: 2100 },
        { type: "line", start: [65,68], end: [65,55], duration: 200, weight: 0.8, opacity: 0.1, delay: 2200 },
        { type: "line", start: [85,52], end: [85,42], duration: 200, weight: 0.8, opacity: 0.1, delay: 2300 },
        // Handrail
        { type: "line", start: [25,75], end: [45,67], duration: 200, weight: 1, opacity: 0.12, delay: 2400 },
        { type: "line", start: [45,67], end: [65,55], duration: 200, weight: 1, opacity: 0.12, delay: 2500 },
        { type: "line", start: [65,55], end: [85,42], duration: 200, weight: 1, opacity: 0.12, delay: 2600 },
        { type: "line", start: [85,42], end: [110,35], duration: 200, weight: 1, opacity: 0.12, delay: 2700 },
        // Dimension line
        { type: "line", start: [0,110], end: [150,110], duration: 300, weight: 0.8, opacity: 0.1, dash: [4,4], delay: 2800 },
        { type: "tick", point: [0,110], delay: 3000 },
        { type: "tick", point: [150,110], delay: 3000 },
        { type: "text", point: [55,118], text: "3000mm Rise", delay: 3100 }
    ],
    // === NEW: Kitchen Island ===
    kitchenIsland: [
        // Island countertop
        { type: "line", start: [20,20], end: [120,20], duration: 400, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [120,20], end: [120,70], duration: 300, weight: 1.5, opacity: 0.15, delay: 350 },
        { type: "line", start: [120,70], end: [20,70], duration: 400, weight: 1.5, opacity: 0.15, delay: 600 },
        { type: "line", start: [20,70], end: [20,20], duration: 300, weight: 1.5, opacity: 0.15, delay: 950 },
        // Countertop overhang
        { type: "line", start: [15,25], end: [15,65], duration: 250, weight: 1.2, opacity: 0.12, delay: 1100 },
        { type: "line", start: [15,25], end: [20,20], duration: 100, weight: 1.2, opacity: 0.12, delay: 1300 },
        { type: "line", start: [15,65], end: [20,70], duration: 100, weight: 1.2, opacity: 0.12, delay: 1350 },
        // Sink outline
        { type: "line", start: [35,30], end: [75,30], duration: 250, weight: 1, opacity: 0.12, delay: 1200 },
        { type: "line", start: [75,30], end: [75,50], duration: 200, weight: 1, opacity: 0.12, delay: 1400 },
        { type: "line", start: [75,50], end: [35,50], duration: 250, weight: 1, opacity: 0.12, delay: 1550 },
        { type: "line", start: [35,50], end: [35,30], duration: 200, weight: 1, opacity: 0.12, delay: 1750 },
        // Faucet
        { type: "arc", center: [65,25], radius: 12, startAngle: Math.PI, endAngle: 0, duration: 250, weight: 0.8, opacity: 0.1, delay: 1800 },
        { type: "line", start: [65,25], end: [65,20], duration: 100, weight: 0.8, opacity: 0.1, delay: 2000 },
        // Stool 1
        { type: "line", start: [5,75], end: [5,95], duration: 200, weight: 1, opacity: 0.12, delay: 1600 },
        { type: "line", start: [15,75], end: [15,95], duration: 200, weight: 1, opacity: 0.12, delay: 1750 },
        { type: "line", start: [5,75], end: [15,75], duration: 100, weight: 1, opacity: 0.12, delay: 1900 },
        { type: "line", start: [3,80], end: [17,80], duration: 100, weight: 0.8, opacity: 0.1, delay: 2000 },
        // Stool 2
        { type: "line", start: [55,75], end: [55,95], duration: 200, weight: 1, opacity: 0.12, delay: 1700 },
        { type: "line", start: [65,75], end: [65,95], duration: 200, weight: 1, opacity: 0.12, delay: 1850 },
        { type: "line", start: [55,75], end: [65,75], duration: 100, weight: 1, opacity: 0.12, delay: 2000 },
        { type: "line", start: [53,80], end: [67,80], duration: 100, weight: 0.8, opacity: 0.1, delay: 2100 },
        // Stool 3
        { type: "line", start: [105,75], end: [105,95], duration: 200, weight: 1, opacity: 0.12, delay: 1800 },
        { type: "line", start: [115,75], end: [115,95], duration: 200, weight: 1, opacity: 0.12, delay: 1950 },
        { type: "line", start: [105,75], end: [115,75], duration: 100, weight: 1, opacity: 0.12, delay: 2100 },
        { type: "line", start: [103,80], end: [117,80], duration: 100, weight: 0.8, opacity: 0.1, delay: 2200 },
        // Cabinet detail lines
        { type: "line", start: [50,70], end: [50,20], duration: 200, weight: 0.6, opacity: 0.08, delay: 2200 },
        { type: "line", start: [90,70], end: [90,20], duration: 200, weight: 0.6, opacity: 0.08, delay: 2300 },
        // Handle
        { type: "line", start: [42,45], end: [48,45], duration: 100, weight: 0.6, opacity: 0.1, delay: 2400 },
        // Label
        { type: "text", point: [45,-10], text: "Kitchen Hub", delay: 2500 }
    ],
    // === NEW: Window Section Detail ===
    windowSection: [
        // Outer wall - left
        { type: "line", start: [0,20], end: [0,90], duration: 300, weight: 2, opacity: 0.18 },
        { type: "line", start: [0,20], end: [30,20], duration: 200, weight: 2, opacity: 0.18, delay: 250 },
        // Outer wall - right
        { type: "line", start: [130,20], end: [130,90], duration: 300, weight: 2, opacity: 0.18, delay: 300 },
        { type: "line", start: [100,20], end: [130,20], duration: 200, weight: 2, opacity: 0.18, delay: 550 },
        // Sill
        { type: "line", start: [30,75], end: [100,75], duration: 350, weight: 1.5, opacity: 0.15, delay: 600 },
        { type: "line", start: [30,75], end: [30,80], duration: 100, weight: 1.5, opacity: 0.15, delay: 900 },
        { type: "line", start: [30,80], end: [100,80], duration: 350, weight: 1.5, opacity: 0.15, delay: 950 },
        { type: "line", start: [100,80], end: [100,75], duration: 100, weight: 1.5, opacity: 0.15, delay: 1250 },
        // Head
        { type: "line", start: [30,35], end: [100,35], duration: 350, weight: 1.5, opacity: 0.15, delay: 700 },
        { type: "line", start: [30,35], end: [30,30], duration: 100, weight: 1.5, opacity: 0.15, delay: 1000 },
        { type: "line", start: [30,30], end: [100,30], duration: 350, weight: 1.5, opacity: 0.15, delay: 1050 },
        { type: "line", start: [100,30], end: [100,35], duration: 100, weight: 1.5, opacity: 0.15, delay: 1350 },
        // Left jamb
        { type: "line", start: [35,30], end: [35,75], duration: 300, weight: 1.2, opacity: 0.12, delay: 1100 },
        // Right jamb
        { type: "line", start: [95,30], end: [95,75], duration: 300, weight: 1.2, opacity: 0.12, delay: 1200 },
        // Glass panes (double glazing)
        { type: "line", start: [42,37], end: [42,68], duration: 250, weight: 0.6, opacity: 0.08, delay: 1400 },
        { type: "line", start: [48,37], end: [48,68], duration: 250, weight: 0.6, opacity: 0.08, delay: 1600 },
        { type: "line", start: [82,37], end: [82,68], duration: 250, weight: 0.6, opacity: 0.08, delay: 1500 },
        { type: "line", start: [88,37], end: [88,68], duration: 250, weight: 0.6, opacity: 0.08, delay: 1700 },
        // Center mullion
        { type: "line", start: [62,37], end: [62,68], duration: 200, weight: 1, opacity: 0.1, delay: 1800 },
        // Horizontal transom
        { type: "line", start: [42,50], end: [62,50], duration: 150, weight: 0.8, opacity: 0.1, delay: 1900 },
        { type: "line", start: [68,50], end: [88,50], duration: 150, weight: 0.8, opacity: 0.1, delay: 2000 },
        // Weatherstrip detail
        { type: "line", start: [35,40], end: [38,40], duration: 100, weight: 0.5, opacity: 0.08, dash: [2,2], delay: 2100 },
        { type: "line", start: [35,65], end: [38,65], duration: 100, weight: 0.5, opacity: 0.08, dash: [2,2], delay: 2200 },
        // Dimension lines
        { type: "line", start: [30,5], end: [100,5], duration: 250, weight: 0.8, opacity: 0.1, dash: [3,3], delay: 2300 },
        { type: "tick", point: [30,5], delay: 2500 },
        { type: "tick", point: [100,5], delay: 2500 },
        { type: "text", point: [50,0], text: "1200mm", delay: 2600 },
        // Label
        { type: "text", point: [110,55], text: "Sec A-A", delay: 2700 }
    ],
    // === NEW: Bicycle Frame Geometry ===
    bicycleFrame: [
        // Rear wheel
        { type: "arc", center: [25,70], radius: 25, startAngle: 0, endAngle: Math.PI * 2, duration: 400, weight: 1.2, opacity: 0.12 },
        { type: "arc", center: [25,70], radius: 20, startAngle: 0, endAngle: Math.PI * 2, duration: 300, weight: 0.8, opacity: 0.08, delay: 300 },
        // Front wheel
        { type: "arc", center: [125,70], radius: 25, startAngle: 0, endAngle: Math.PI * 2, duration: 400, weight: 1.2, opacity: 0.12, delay: 200 },
        { type: "arc", center: [125,70], radius: 20, startAngle: 0, endAngle: Math.PI * 2, duration: 300, weight: 0.8, opacity: 0.08, delay: 500 },
        // Chain stay (bottom rear to bottom bracket)
        { type: "line", start: [25,70], end: [60,70], duration: 300, weight: 1.2, opacity: 0.12, delay: 600 },
        // Seat stay (rear axle to seat cluster)
        { type: "line", start: [25,70], end: [55,35], duration: 350, weight: 1.2, opacity: 0.12, delay: 800 },
        // Seat tube (bottom bracket to seat cluster)
        { type: "line", start: [60,70], end: [55,25], duration: 350, weight: 1.5, opacity: 0.15, delay: 1000 },
        // Down tube (bottom bracket to head tube)
        { type: "line", start: [60,70], end: [110,30], duration: 400, weight: 1.5, opacity: 0.15, delay: 1200 },
        // Top tube (seat cluster to head tube)
        { type: "line", start: [55,35], end: [110,30], duration: 350, weight: 1.5, opacity: 0.15, delay: 1400 },
        // Head tube
        { type: "line", start: [108,22], end: [112,38], duration: 200, weight: 1.5, opacity: 0.15, delay: 1600 },
        // Fork (head tube to front axle)
        { type: "line", start: [110,30], end: [125,70], duration: 300, weight: 1.2, opacity: 0.12, delay: 1700 },
        // Handlebar stem
        { type: "line", start: [110,22], end: [108,10], duration: 150, weight: 1, opacity: 0.1, delay: 1900 },
        { type: "line", start: [100,8], end: [115,12], duration: 150, weight: 0.8, opacity: 0.1, delay: 2000 },
        // Seat post
        { type: "line", start: [55,35], end: [52,10], duration: 200, weight: 1, opacity: 0.1, delay: 1950 },
        // Seat
        { type: "line", start: [42,10], end: [62,8], duration: 150, weight: 1, opacity: 0.1, delay: 2100 },
        { type: "line", start: [55,10], end: [55,8], duration: 100, weight: 0.8, opacity: 0.1, delay: 2200 },
        // Crank/chainring hint
        { type: "arc", center: [60,70], radius: 8, startAngle: 0, endAngle: Math.PI * 2, duration: 200, weight: 0.8, opacity: 0.1, delay: 2150 },
        // Ground line
        { type: "line", start: [0,95], end: [150,95], duration: 300, weight: 0.8, opacity: 0.1, dash: [4,4], delay: 2300 },
        // Label
        { type: "text", point: [85,5], text: "Road Frame 54cm", delay: 2500 }
    ],
    // === NEW: Watch Movement Detail ===
    watchMovement: [
        // Main plate (outer circle)
        { type: "arc", center: [60,50], radius: 50, startAngle: 0, endAngle: Math.PI * 2, duration: 500, weight: 1.5, opacity: 0.15 },
        // Inner case ring
        { type: "arc", center: [60,50], radius: 45, startAngle: 0, endAngle: Math.PI * 2, duration: 400, weight: 1, opacity: 0.12, delay: 400 },
        // Main gear (center)
        { type: "arc", center: [60,50], radius: 15, startAngle: 0, endAngle: Math.PI * 2, duration: 300, weight: 1.2, opacity: 0.15, delay: 600 },
        // Gear teeth
        { type: "line", start: [60,32], end: [60,28], duration: 100, weight: 0.8, opacity: 0.1, delay: 850 },
        { type: "line", start: [60,68], end: [60,72], duration: 100, weight: 0.8, opacity: 0.1, delay: 900 },
        { type: "line", start: [42,50], end: [38,50], duration: 100, weight: 0.8, opacity: 0.1, delay: 950 },
        { type: "line", start: [78,50], end: [82,50], duration: 100, weight: 0.8, opacity: 0.1, delay: 1000 },
        { type: "line", start: [47,37], end: [44,34], duration: 80, weight: 0.8, opacity: 0.1, delay: 1050 },
        { type: "line", start: [73,37], end: [76,34], duration: 80, weight: 0.8, opacity: 0.1, delay: 1100 },
        { type: "line", start: [47,63], end: [44,66], duration: 80, weight: 0.8, opacity: 0.1, delay: 1150 },
        { type: "line", start: [73,63], end: [76,66], duration: 80, weight: 0.8, opacity: 0.1, delay: 1200 },
        // Secondary gear (smaller, upper right)
        { type: "arc", center: [85,35], radius: 10, startAngle: 0, endAngle: Math.PI * 2, duration: 250, weight: 1, opacity: 0.12, delay: 1000 },
        { type: "arc", center: [85,35], radius: 3, startAngle: 0, endAngle: Math.PI * 2, duration: 150, weight: 0.6, opacity: 0.1, delay: 1200 },
        // Third gear (lower left)
        { type: "arc", center: [35,65], radius: 12, startAngle: 0, endAngle: Math.PI * 2, duration: 280, weight: 1, opacity: 0.12, delay: 1100 },
        { type: "arc", center: [35,65], radius: 4, startAngle: 0, endAngle: Math.PI * 2, duration: 150, weight: 0.6, opacity: 0.1, delay: 1330 },
        // Bridge (holds gear)
        { type: "line", start: [75,50], end: [95,50], duration: 200, weight: 0.8, opacity: 0.1, delay: 1400 },
        { type: "arc", center: [85,50], radius: 3, startAngle: 0, endAngle: Math.PI * 2, duration: 100, weight: 0.6, opacity: 0.1, delay: 1550 },
        { type: "line", start: [30,50], end: [45,50], duration: 150, weight: 0.8, opacity: 0.1, delay: 1450 },
        // Screws
        { type: "arc", center: [30,30], radius: 3, startAngle: 0, endAngle: Math.PI * 2, duration: 120, weight: 0.6, opacity: 0.1, delay: 1600 },
        { type: "line", start: [28,30], end: [32,30], duration: 80, weight: 0.5, opacity: 0.08, delay: 1700 },
        { type: "line", start: [30,28], end: [30,32], duration: 80, weight: 0.5, opacity: 0.08, delay: 1750 },
        { type: "arc", center: [90,70], radius: 3, startAngle: 0, endAngle: Math.PI * 2, duration: 120, weight: 0.6, opacity: 0.1, delay: 1650 },
        { type: "line", start: [88,70], end: [92,70], duration: 80, weight: 0.5, opacity: 0.08, delay: 1750 },
        { type: "line", start: [90,68], end: [90,72], duration: 80, weight: 0.5, opacity: 0.08, delay: 1800 },
        // Balance wheel hint (partial arc)
        { type: "arc", center: [50,75], radius: 8, startAngle: Math.PI, endAngle: Math.PI * 1.8, duration: 200, weight: 0.8, opacity: 0.1, delay: 1800 },
        // Label
        { type: "text", point: [95,10], text: "Cal. 2824", delay: 2000 }
    ],
    // === NEW: Chair Joinery Exploded ===
    chairJoinery: [
        // Seat panel (floating)
        { type: "line", start: [30,30], end: [90,30], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [90,30], end: [90,50], duration: 200, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [90,50], end: [30,50], duration: 300, weight: 1.2, opacity: 0.12, delay: 400 },
        { type: "line", start: [30,50], end: [30,30], duration: 200, weight: 1.2, opacity: 0.12, delay: 650 },
        // Grain direction lines on seat
        { type: "line", start: [40,35], end: [50,45], duration: 150, weight: 0.5, opacity: 0.06, delay: 800 },
        { type: "line", start: [60,32], end: [70,42], duration: 150, weight: 0.5, opacity: 0.06, delay: 900 },
        { type: "line", start: [75,38], end: [85,48], duration: 150, weight: 0.5, opacity: 0.06, delay: 1000 },
        // Front left leg
        { type: "line", start: [35,70], end: [35,90], duration: 200, weight: 1.5, opacity: 0.15, delay: 600 },
        { type: "line", start: [40,70], end: [40,90], duration: 200, weight: 1.5, opacity: 0.15, delay: 750 },
        { type: "line", start: [35,70], end: [40,70], duration: 100, weight: 1.2, opacity: 0.12, delay: 900 },
        // Front right leg
        { type: "line", start: [80,70], end: [80,90], duration: 200, weight: 1.5, opacity: 0.15, delay: 700 },
        { type: "line", start: [85,70], end: [85,90], duration: 200, weight: 1.5, opacity: 0.15, delay: 850 },
        { type: "line", start: [80,70], end: [85,70], duration: 100, weight: 1.2, opacity: 0.12, delay: 1000 },
        // Dovetail detail on leg (seat connection)
        { type: "line", start: [33,65], end: [37,68], duration: 100, weight: 0.6, opacity: 0.1, delay: 1100 },
        { type: "line", start: [37,68], end: [33,70], duration: 100, weight: 0.6, opacity: 0.1, delay: 1180 },
        { type: "line", start: [33,70], end: [37,73], duration: 100, weight: 0.6, opacity: 0.1, delay: 1250 },
        // Backrest stile left
        { type: "line", start: [35,50], end: [30,15], duration: 350, weight: 1.2, opacity: 0.12, delay: 900 },
        { type: "line", start: [40,50], end: [35,15], duration: 350, weight: 1.2, opacity: 0.12, delay: 1000 },
        { type: "line", start: [30,15], end: [35,15], duration: 100, weight: 1.2, opacity: 0.12, delay: 1300 },
        // Backrest stile right
        { type: "line", start: [80,50], end: [80,15], duration: 350, weight: 1.2, opacity: 0.12, delay: 1000 },
        { type: "line", start: [85,50], end: [85,15], duration: 350, weight: 1.2, opacity: 0.12, delay: 1100 },
        { type: "line", start: [80,15], end: [85,15], duration: 100, weight: 1.2, opacity: 0.12, delay: 1400 },
        // Top rail
        { type: "line", start: [28,15], end: [87,15], duration: 300, weight: 1.2, opacity: 0.12, delay: 1200 },
        { type: "line", start: [28,15], end: [28,20], duration: 100, weight: 1.2, opacity: 0.12, delay: 1450 },
        { type: "line", start: [87,15], end: [87,20], duration: 100, weight: 1.2, opacity: 0.12, delay: 1500 },
        { type: "line", start: [28,20], end: [87,20], duration: 300, weight: 1.2, opacity: 0.12, delay: 1550 },
        // Screw detail
        { type: "arc", center: [37,40], radius: 2, startAngle: 0, endAngle: Math.PI * 2, duration: 80, weight: 0.5, opacity: 0.08, delay: 1600 },
        { type: "line", start: [36,40], end: [38,40], duration: 60, weight: 0.4, opacity: 0.06, delay: 1660 },
        // Exploded lines showing assembly
        { type: "line", start: [37,55], end: [37,65], duration: 150, weight: 0.4, opacity: 0.06, dash: [2,2], delay: 1700 },
        { type: "line", start: [82,55], end: [82,65], duration: 150, weight: 0.4, opacity: 0.06, dash: [2,2], delay: 1800 },
        { type: "line", start: [32,40], end: [32,30], duration: 150, weight: 0.4, opacity: 0.06, dash: [2,2], delay: 1900 },
        // Label
        { type: "text", point: [95,55], text: "Oak + Walnut", delay: 2100 }
    ],
    // === NEW: Wardrobe Cabinet ===
    wardrobeCabinet: [
        // Outer frame
        { type: "line", start: [10,10], end: [10,90], duration: 400, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [90,10], end: [90,90], duration: 400, weight: 1.5, opacity: 0.15, delay: 200 },
        { type: "line", start: [10,10], end: [90,10], duration: 400, weight: 1.5, opacity: 0.15, delay: 400 },
        { type: "line", start: [10,90], end: [90,90], duration: 400, weight: 1.5, opacity: 0.15, delay: 600 },
        // Vertical divider
        { type: "line", start: [50,10], end: [50,90], duration: 350, weight: 1.2, opacity: 0.12, delay: 800 },
        // Left door handle
        { type: "line", start: [45,45], end: [45,55], duration: 150, weight: 0.8, opacity: 0.1, delay: 1000 },
        // Right door handle
        { type: "line", start: [55,45], end: [55,55], duration: 150, weight: 0.8, opacity: 0.1, delay: 1100 },
        // Top shelf line
        { type: "line", start: [15,25], end: [45,25], duration: 200, weight: 0.6, opacity: 0.08, delay: 1200 },
        { type: "line", start: [55,25], end: [85,25], duration: 200, weight: 0.6, opacity: 0.08, delay: 1300 },
        // Middle shelf line
        { type: "line", start: [15,50], end: [45,50], duration: 200, weight: 0.6, opacity: 0.08, delay: 1400 },
        { type: "line", start: [55,50], end: [85,50], duration: 200, weight: 0.6, opacity: 0.08, delay: 1500 },
        // Bottom drawer line
        { type: "line", start: [15,75], end: [45,75], duration: 200, weight: 0.6, opacity: 0.08, delay: 1600 },
        { type: "line", start: [55,75], end: [85,75], duration: 200, weight: 0.6, opacity: 0.08, delay: 1700 },
        // Drawer handle
        { type: "line", start: [28,82], end: [32,82], duration: 80, weight: 0.6, opacity: 0.1, delay: 1800 },
        { type: "line", start: [68,82], end: [72,82], duration: 80, weight: 0.6, opacity: 0.1, delay: 1850 },
        // Label
        { type: "text", point: [95,50], text: "WR-01", delay: 2000 }
    ],
    // === NEW: Kitchen Sink Detail ===
    kitchenSink: [
        // Countertop edge
        { type: "line", start: [5,30], end: [95,30], duration: 400, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [5,30], end: [5,35], duration: 100, weight: 1.5, opacity: 0.15, delay: 350 },
        { type: "line", start: [95,30], end: [95,35], duration: 100, weight: 1.5, opacity: 0.15, delay: 400 },
        { type: "line", start: [5,35], end: [95,35], duration: 400, weight: 1.5, opacity: 0.15, delay: 450 },
        // Sink basin outer
        { type: "line", start: [25,35], end: [25,70], duration: 300, weight: 1.2, opacity: 0.12, delay: 700 },
        { type: "line", start: [75,35], end: [75,70], duration: 300, weight: 1.2, opacity: 0.12, delay: 800 },
        { type: "line", start: [25,70], end: [75,70], duration: 300, weight: 1.2, opacity: 0.12, delay: 1000 },
        // Sink bottom (slightly curved)
        { type: "arc", center: [50,72], radius: 25, startAngle: 0, endAngle: Math.PI, duration: 300, weight: 1.2, opacity: 0.12, delay: 1200 },
        // Faucet base
        { type: "line", start: [80,30], end: [80,15], duration: 200, weight: 1, opacity: 0.1, delay: 1300 },
        { type: "arc", center: [80,10], radius: 8, startAngle: 0, endAngle: Math.PI, duration: 200, weight: 1, opacity: 0.1, delay: 1450 },
        // Faucet spout
        { type: "arc", center: [70,5], radius: 12, startAngle: 0, endAngle: Math.PI/2, duration: 250, weight: 0.8, opacity: 0.1, delay: 1600 },
        { type: "line", start: [70,17], end: [65,17], duration: 100, weight: 0.8, opacity: 0.1, delay: 1800 },
        // Drain
        { type: "arc", center: [50,60], radius: 6, startAngle: 0, endAngle: Math.PI * 2, duration: 200, weight: 0.6, opacity: 0.08, delay: 1700 },
        // Water line (dashed)
        { type: "line", start: [30,55], end: [70,55], duration: 200, weight: 0.5, opacity: 0.06, dash: [2,2], delay: 1900 },
        // Label
        { type: "text", point: [100,45], text: "SS-700", delay: 2100 }
    ],
    // === NEW: Dining Table Set ===
    diningSet: [
        // Table top
        { type: "ellipse", center: [60,40], radiusX: 45, radiusY: 12, duration: 400, weight: 1.5, opacity: 0.15 },
        // Table thickness
        { type: "arc", center: [60,45], radius: 45, startAngle: 0, endAngle: Math.PI, duration: 300, weight: 1.2, opacity: 0.12, delay: 350 },
        // Central pedestal
        { type: "line", start: [50,45], end: [55,85], duration: 300, weight: 1.2, opacity: 0.12, delay: 500 },
        { type: "line", start: [70,45], end: [65,85], duration: 300, weight: 1.2, opacity: 0.12, delay: 600 },
        // Base
        { type: "line", start: [35,85], end: [85,85], duration: 250, weight: 1.2, opacity: 0.12, delay: 800 },
        { type: "arc", center: [60,85], radius: 25, startAngle: 0, endAngle: Math.PI, duration: 250, weight: 1, opacity: 0.1, delay: 1000 },
        // Chair 1 (left)
        { type: "line", start: [10,35], end: [10,60], duration: 200, weight: 1, opacity: 0.1, delay: 900 },
        { type: "line", start: [5,60], end: [15,60], duration: 100, weight: 1, opacity: 0.1, delay: 1050 },
        { type: "line", start: [10,50], end: [15,45], duration: 100, weight: 0.8, opacity: 0.1, delay: 1100 },
        // Chair 2 (right)
        { type: "line", start: [110,35], end: [110,60], duration: 200, weight: 1, opacity: 0.1, delay: 1000 },
        { type: "line", start: [105,60], end: [115,60], duration: 100, weight: 1, opacity: 0.1, delay: 1150 },
        { type: "line", start: [110,50], end: [105,45], duration: 100, weight: 0.8, opacity: 0.1, delay: 1200 },
        // Chair 3 (top)
        { type: "line", start: [45,20], end: [75,20], duration: 200, weight: 1, opacity: 0.1, delay: 1100 },
        { type: "line", start: [45,15], end: [45,25], duration: 100, weight: 1, opacity: 0.1, delay: 1250 },
        // Chair 4 (bottom)
        { type: "line", start: [45,90], end: [75,90], duration: 200, weight: 1, opacity: 0.1, delay: 1200 },
        // Label
        { type: "text", point: [95,70], text: "DT-1200", delay: 1400 }
    ],
    // === NEW: Bathroom Vanity ===
    bathroomVanity: [
        // Cabinet body
        { type: "line", start: [15,40], end: [15,90], duration: 300, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [85,40], end: [85,90], duration: 300, weight: 1.5, opacity: 0.15, delay: 200 },
        { type: "line", start: [15,90], end: [85,90], duration: 300, weight: 1.5, opacity: 0.15, delay: 400 },
        // Countertop
        { type: "line", start: [10,40], end: [90,40], duration: 350, weight: 1.5, opacity: 0.15, delay: 500 },
        { type: "line", start: [10,35], end: [90,35], duration: 350, weight: 1.5, opacity: 0.15, delay: 600 },
        { type: "line", start: [10,35], end: [10,40], duration: 100, weight: 1.5, opacity: 0.15, delay: 900 },
        { type: "line", start: [90,35], end: [90,40], duration: 100, weight: 1.5, opacity: 0.15, delay: 950 },
        // Sink basin
        { type: "ellipse", center: [50,37], radiusX: 15, radiusY: 4, duration: 250, weight: 1, opacity: 0.12, delay: 800 },
        // Faucet
        { type: "line", start: [50,35], end: [50,25], duration: 150, weight: 0.8, opacity: 0.1, delay: 1000 },
        { type: "arc", center: [50,22], radius: 5, startAngle: 0, endAngle: Math.PI, duration: 150, weight: 0.8, opacity: 0.1, delay: 1100 },
        { type: "line", start: [55,22], end: [58,25], duration: 80, weight: 0.6, opacity: 0.08, delay: 1200 },
        // Cabinet doors
        { type: "line", start: [50,45], end: [50,85], duration: 250, weight: 0.8, opacity: 0.1, delay: 1000 },
        // Door handles
        { type: "line", start: [40,60], end: [42,60], duration: 60, weight: 0.6, opacity: 0.1, delay: 1200 },
        { type: "line", start: [58,60], end: [60,60], duration: 60, weight: 0.6, opacity: 0.1, delay: 1250 },
        // Mirror above
        { type: "line", start: [20,5], end: [80,5], duration: 250, weight: 1, opacity: 0.12, delay: 1100 },
        { type: "line", start: [20,5], end: [20,28], duration: 200, weight: 1, opacity: 0.12, delay: 1300 },
        { type: "line", start: [80,5], end: [80,28], duration: 200, weight: 1, opacity: 0.12, delay: 1450 },
        { type: "line", start: [20,28], end: [80,28], duration: 250, weight: 1, opacity: 0.12, delay: 1600 },
        // Label
        { type: "text", point: [92,55], text: "BV-800", delay: 1800 }
    ],
    // === NEW: Bedroom Plan ===
    bedroomPlan: [
        // Room outline
        { type: "line", start: [0,0], end: [120,0], duration: 400, weight: 2, opacity: 0.18 },
        { type: "line", start: [120,0], end: [120,100], duration: 350, weight: 2, opacity: 0.18, delay: 300 },
        { type: "line", start: [120,100], end: [0,100], duration: 400, weight: 2, opacity: 0.18, delay: 600 },
        { type: "line", start: [0,100], end: [0,0], duration: 350, weight: 2, opacity: 0.18, delay: 900 },
        // Bed
        { type: "line", start: [60,20], end: [110,20], duration: 300, weight: 1.5, opacity: 0.15, delay: 1000 },
        { type: "line", start: [110,20], end: [110,60], duration: 250, weight: 1.5, opacity: 0.15, delay: 1250 },
        { type: "line", start: [110,60], end: [60,60], duration: 300, weight: 1.5, opacity: 0.15, delay: 1450 },
        { type: "line", start: [60,60], end: [60,20], duration: 250, weight: 1.5, opacity: 0.15, delay: 1700 },
        // Pillow
        { type: "line", start: [65,25], end: [105,25], duration: 200, weight: 0.8, opacity: 0.1, delay: 1800 },
        // Nightstand left
        { type: "line", start: [10,25], end: [30,25], duration: 150, weight: 1.2, opacity: 0.12, delay: 1200 },
        { type: "line", start: [30,25], end: [30,45], duration: 150, weight: 1.2, opacity: 0.12, delay: 1300 },
        { type: "line", start: [30,45], end: [10,45], duration: 150, weight: 1.2, opacity: 0.12, delay: 1400 },
        { type: "line", start: [10,45], end: [10,25], duration: 150, weight: 1.2, opacity: 0.12, delay: 1500 },
        // Lamp on nightstand
        { type: "arc", center: [20,18], radius: 6, startAngle: 0, endAngle: Math.PI, duration: 150, weight: 0.6, opacity: 0.08, delay: 1600 },
        // Wardrobe
        { type: "line", start: [10,60], end: [40,60], duration: 200, weight: 1.2, opacity: 0.12, delay: 1400 },
        { type: "line", start: [40,60], end: [40,95], duration: 200, weight: 1.2, opacity: 0.12, delay: 1550 },
        { type: "line", start: [40,95], end: [10,95], duration: 200, weight: 1.2, opacity: 0.12, delay: 1700 },
        { type: "line", start: [25,60], end: [25,95], duration: 150, weight: 0.8, opacity: 0.1, delay: 1800 },
        // Door
        { type: "arc", center: [0,75], radius: 15, startAngle: -Math.PI/2, endAngle: 0, duration: 200, weight: 1, opacity: 0.1, delay: 1600 },
        // Window
        { type: "line", start: [50,-5], end: [90,-5], duration: 200, weight: 1, opacity: 0.1, delay: 1500 },
        { type: "line", start: [50,-5], end: [50,0], duration: 80, weight: 1, opacity: 0.1, delay: 1650 },
        { type: "line", start: [90,-5], end: [90,0], duration: 80, weight: 1, opacity: 0.1, delay: 1700 },
        // Label
        { type: "text", point: [60,105], text: "Master Bed", delay: 1900 }
    ],
    // === NEW: Kitchen Counter ===
    kitchenCounter: [
        // L-shape horizontal
        { type: "line", start: [10,30], end: [70,30], duration: 350, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [10,30], end: [10,35], duration: 100, weight: 1.5, opacity: 0.15, delay: 300 },
        { type: "line", start: [70,30], end: [70,35], duration: 100, weight: 1.5, opacity: 0.15, delay: 350 },
        { type: "line", start: [10,35], end: [70,35], duration: 350, weight: 1.5, opacity: 0.15, delay: 400 },
        // L-shape vertical
        { type: "line", start: [70,35], end: [70,80], duration: 300, weight: 1.5, opacity: 0.15, delay: 600 },
        { type: "line", start: [70,80], end: [75,80], duration: 100, weight: 1.5, opacity: 0.15, delay: 850 },
        { type: "line", start: [75,35], end: [75,80], duration: 300, weight: 1.5, opacity: 0.15, delay: 900 },
        { type: "line", start: [70,35], end: [75,35], duration: 100, weight: 1.5, opacity: 0.15, delay: 1150 },
        // Stove area
        { type: "line", start: [20,32], end: [40,32], duration: 150, weight: 0.8, opacity: 0.1, delay: 1000 },
        { type: "line", start: [20,33], end: [40,33], duration: 150, weight: 0.8, opacity: 0.1, delay: 1100 },
        { type: "arc", center: [25,32], radius: 3, startAngle: 0, endAngle: Math.PI * 2, duration: 100, weight: 0.6, opacity: 0.08, delay: 1200 },
        { type: "arc", center: [35,32], radius: 3, startAngle: 0, endAngle: Math.PI * 2, duration: 100, weight: 0.6, opacity: 0.08, delay: 1250 },
        // Sink area
        { type: "line", start: [55,32], end: [68,32], duration: 120, weight: 0.6, opacity: 0.1, dash: [2,2], delay: 1100 },
        { type: "line", start: [55,33], end: [68,33], duration: 120, weight: 0.6, opacity: 0.1, dash: [2,2], delay: 1200 },
        // Upper cabinets
        { type: "line", start: [10,10], end: [65,10], duration: 300, weight: 1.2, opacity: 0.12, delay: 900 },
        { type: "line", start: [10,10], end: [10,25], duration: 200, weight: 1.2, opacity: 0.12, delay: 1150 },
        { type: "line", start: [65,10], end: [65,25], duration: 200, weight: 1.2, opacity: 0.12, delay: 1300 },
        { type: "line", start: [10,25], end: [65,25], duration: 300, weight: 1.2, opacity: 0.12, delay: 1450 },
        // Cabinet divisions
        { type: "line", start: [30,10], end: [30,25], duration: 150, weight: 0.6, opacity: 0.08, delay: 1500 },
        { type: "line", start: [50,10], end: [50,25], duration: 150, weight: 0.6, opacity: 0.08, delay: 1600 },
        // Handles
        { type: "line", start: [15,18], end: [17,18], duration: 60, weight: 0.5, opacity: 0.08, delay: 1700 },
        { type: "line", start: [35,18], end: [37,18], duration: 60, weight: 0.5, opacity: 0.08, delay: 1750 },
        { type: "line", start: [55,18], end: [57,18], duration: 60, weight: 0.5, opacity: 0.08, delay: 1800 },
        // Label
        { type: "text", point: [80,55], text: "L-Kitchen", delay: 1900 }
    ],
    // === NEW: Bookshelf ===
    bookshelfUnit: [
        // Outer frame
        { type: "line", start: [20,10], end: [20,90], duration: 350, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [80,10], end: [80,90], duration: 350, weight: 1.5, opacity: 0.15, delay: 200 },
        { type: "line", start: [20,10], end: [80,10], duration: 350, weight: 1.5, opacity: 0.15, delay: 400 },
        { type: "line", start: [20,90], end: [80,90], duration: 350, weight: 1.5, opacity: 0.15, delay: 600 },
        // Shelves
        { type: "line", start: [20,25], end: [80,25], duration: 300, weight: 1.2, opacity: 0.12, delay: 800 },
        { type: "line", start: [20,40], end: [80,40], duration: 300, weight: 1.2, opacity: 0.12, delay: 950 },
        { type: "line", start: [20,55], end: [80,55], duration: 300, weight: 1.2, opacity: 0.12, delay: 1100 },
        { type: "line", start: [20,70], end: [80,70], duration: 300, weight: 1.2, opacity: 0.12, delay: 1250 },
        // Books on top shelf
        { type: "line", start: [25,25], end: [25,15], duration: 100, weight: 0.8, opacity: 0.1, delay: 1400 },
        { type: "line", start: [30,25], end: [30,17], duration: 100, weight: 0.8, opacity: 0.1, delay: 1480 },
        { type: "line", start: [35,25], end: [35,14], duration: 100, weight: 0.8, opacity: 0.1, delay: 1560 },
        { type: "line", start: [40,25], end: [40,16], duration: 100, weight: 0.8, opacity: 0.1, delay: 1640 },
        // Books on second shelf (varied heights)
        { type: "line", start: [50,40], end: [50,28], duration: 120, weight: 0.8, opacity: 0.1, delay: 1450 },
        { type: "line", start: [55,40], end: [55,30], duration: 100, weight: 0.8, opacity: 0.1, delay: 1540 },
        { type: "line", start: [60,40], end: [60,26], duration: 140, weight: 0.8, opacity: 0.1, delay: 1620 },
        // Plant on third shelf
        { type: "arc", center: [35,48], radius: 5, startAngle: 0, endAngle: Math.PI, duration: 150, weight: 0.8, opacity: 0.1, delay: 1500 },
        { type: "line", start: [35,48], end: [35,55], duration: 80, weight: 0.6, opacity: 0.08, delay: 1620 },
        { type: "line", start: [30,42], end: [35,48], duration: 80, weight: 0.5, opacity: 0.06, delay: 1680 },
        { type: "line", start: [40,42], end: [35,48], duration: 80, weight: 0.5, opacity: 0.06, delay: 1740 },
        // Bottom drawer
        { type: "line", start: [25,90], end: [25,82], duration: 100, weight: 0.8, opacity: 0.1, delay: 1400 },
        { type: "line", start: [75,90], end: [75,82], duration: 100, weight: 0.8, opacity: 0.1, delay: 1480 },
        { type: "line", start: [25,82], end: [75,82], duration: 300, weight: 0.8, opacity: 0.1, delay: 1520 },
        // Drawer handle
        { type: "line", start: [47,86], end: [53,86], duration: 80, weight: 0.6, opacity: 0.08, delay: 1650 },
        // Label
        { type: "text", point: [85,50], text: "BK-180", delay: 1800 }
    ],
    // === NEW: TV Unit ===
    tvUnit: [
        // Main console
        { type: "line", start: [10,60], end: [110,60], duration: 400, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [10,60], end: [10,85], duration: 250, weight: 1.5, opacity: 0.15, delay: 350 },
        { type: "line", start: [110,60], end: [110,85], duration: 250, weight: 1.5, opacity: 0.15, delay: 450 },
        { type: "line", start: [10,85], end: [110,85], duration: 400, weight: 1.5, opacity: 0.15, delay: 650 },
        // Legs
        { type: "line", start: [15,85], end: [15,95], duration: 150, weight: 1, opacity: 0.1, delay: 900 },
        { type: "line", start: [105,85], end: [105,95], duration: 150, weight: 1, opacity: 0.1, delay: 1000 },
        // Cabinet divisions
        { type: "line", start: [40,60], end: [40,85], duration: 200, weight: 0.8, opacity: 0.1, delay: 800 },
        { type: "line", start: [80,60], end: [80,85], duration: 200, weight: 0.8, opacity: 0.1, delay: 950 },
        // Drawer fronts
        { type: "line", start: [15,70], end: [35,70], duration: 150, weight: 0.6, opacity: 0.08, delay: 1100 },
        { type: "line", start: [45,70], end: [75,70], duration: 200, weight: 0.6, opacity: 0.08, delay: 1150 },
        { type: "line", start: [85,70], end: [105,70], duration: 150, weight: 0.6, opacity: 0.08, delay: 1300 },
        // Handles
        { type: "line", start: [23,68], end: [27,68], duration: 60, weight: 0.5, opacity: 0.08, delay: 1250 },
        { type: "line", start: [58,68], end: [62,68], duration: 60, weight: 0.5, opacity: 0.08, delay: 1300 },
        { type: "line", start: [93,68], end: [97,68], duration: 60, weight: 0.5, opacity: 0.08, delay: 1400 },
        // TV screen (above)
        { type: "line", start: [30,15], end: [90,15], duration: 300, weight: 1.2, opacity: 0.12, delay: 700 },
        { type: "line", start: [30,15], end: [30,50], duration: 250, weight: 1.2, opacity: 0.12, delay: 950 },
        { type: "line", start: [90,15], end: [90,50], duration: 250, weight: 1.2, opacity: 0.12, delay: 1150 },
        { type: "line", start: [30,50], end: [90,50], duration: 300, weight: 1.2, opacity: 0.12, delay: 1350 },
        // Screen inner
        { type: "line", start: [35,20], end: [85,20], duration: 250, weight: 0.6, opacity: 0.08, delay: 1200 },
        { type: "line", start: [35,20], end: [35,45], duration: 200, weight: 0.6, opacity: 0.08, delay: 1400 },
        { type: "line", start: [85,20], end: [85,45], duration: 200, weight: 0.6, opacity: 0.08, delay: 1550 },
        { type: "line", start: [35,45], end: [85,45], duration: 250, weight: 0.6, opacity: 0.08, delay: 1700 },
        // Label
        { type: "text", point: [115,72], text: "TV-200", delay: 1900 }
    ],
    // === NEW: Ottoman / Pouf ===
    ottoman: [
        // Top surface (rounded rectangle)
        { type: "ellipse", center: [50,35], radiusX: 35, radiusY: 12, duration: 350, weight: 1.5, opacity: 0.15 },
        // Side curves
        { type: "arc", center: [15,50], radius: 15, startAngle: Math.PI/2, endAngle: Math.PI * 1.5, duration: 250, weight: 1.2, opacity: 0.12, delay: 300 },
        { type: "arc", center: [85,50], radius: 15, startAngle: -Math.PI/2, endAngle: Math.PI/2, duration: 250, weight: 1.2, opacity: 0.12, delay: 500 },
        // Bottom
        { type: "arc", center: [50,65], radius: 35, startAngle: 0, endAngle: Math.PI, duration: 350, weight: 1.2, opacity: 0.12, delay: 700 },
        // Vertical lines connecting top to bottom
        { type: "line", start: [15,42], end: [15,58], duration: 150, weight: 1, opacity: 0.1, delay: 600 },
        { type: "line", start: [85,42], end: [85,58], duration: 150, weight: 1, opacity: 0.1, delay: 750 },
        // Tufting buttons on top
        { type: "arc", center: [35,35], radius: 2, startAngle: 0, endAngle: Math.PI * 2, duration: 80, weight: 0.5, opacity: 0.08, delay: 900 },
        { type: "arc", center: [50,32], radius: 2, startAngle: 0, endAngle: Math.PI * 2, duration: 80, weight: 0.5, opacity: 0.08, delay: 950 },
        { type: "arc", center: [65,35], radius: 2, startAngle: 0, endAngle: Math.PI * 2, duration: 80, weight: 0.5, opacity: 0.08, delay: 1000 },
        { type: "arc", center: [42,40], radius: 2, startAngle: 0, endAngle: Math.PI * 2, duration: 80, weight: 0.5, opacity: 0.08, delay: 1050 },
        { type: "arc", center: [58,40], radius: 2, startAngle: 0, endAngle: Math.PI * 2, duration: 80, weight: 0.5, opacity: 0.08, delay: 1100 },
        // Shadow
        { type: "line", start: [10,75], end: [90,75], duration: 250, weight: 0.5, opacity: 0.06, dash: [3,3], delay: 1200 },
        // Label
        { type: "text", point: [95,50], text: "Pouf", delay: 1400 }
    ],
    // === NEW: Entryway Console ===
    entrywayConsole: [
        // Table top
        { type: "line", start: [5,35], end: [95,35], duration: 350, weight: 1.5, opacity: 0.15 },
        { type: "line", start: [5,35], end: [5,40], duration: 100, weight: 1.5, opacity: 0.15, delay: 300 },
        { type: "line", start: [95,35], end: [95,40], duration: 100, weight: 1.5, opacity: 0.15, delay: 350 },
        { type: "line", start: [5,40], end: [95,40], duration: 350, weight: 1.5, opacity: 0.15, delay: 400 },
        // Tapered legs
        { type: "line", start: [10,40], end: [8,80], duration: 250, weight: 1.2, opacity: 0.12, delay: 600 },
        { type: "line", start: [20,40], end: [22,80], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        { type: "line", start: [80,40], end: [78,80], duration: 250, weight: 1.2, opacity: 0.12, delay: 800 },
        { type: "line", start: [90,40], end: [92,80], duration: 250, weight: 1.2, opacity: 0.12, delay: 900 },
        // Lower shelf
        { type: "line", start: [15,65], end: [85,65], duration: 250, weight: 1, opacity: 0.1, delay: 1000 },
        { type: "line", start: [15,65], end: [15,70], duration: 80, weight: 1, opacity: 0.1, delay: 1200 },
        { type: "line", start: [85,65], end: [85,70], duration: 80, weight: 1, opacity: 0.1, delay: 1250 },
        { type: "line", start: [15,70], end: [85,70], duration: 250, weight: 1, opacity: 0.1, delay: 1300 },
        // Decorative items on top
        // Vase
        { type: "line", start: [25,35], end: [22,20], duration: 150, weight: 0.6, opacity: 0.08, delay: 1100 },
        { type: "line", start: [35,35], end: [38,20], duration: 150, weight: 0.6, opacity: 0.08, delay: 1200 },
        { type: "line", start: [22,20], end: [38,20], duration: 100, weight: 0.6, opacity: 0.08, delay: 1300 },
        // Round bowl
        { type: "arc", center: [70,32], radius: 8, startAngle: 0, endAngle: Math.PI, duration: 150, weight: 0.6, opacity: 0.08, delay: 1150 },
        // Frame on wall above
        { type: "line", start: [35,5], end: [65,5], duration: 200, weight: 0.8, opacity: 0.1, delay: 1000 },
        { type: "line", start: [35,5], end: [35,25], duration: 150, weight: 0.8, opacity: 0.1, delay: 1150 },
        { type: "line", start: [65,5], end: [65,25], duration: 150, weight: 0.8, opacity: 0.1, delay: 1250 },
        { type: "line", start: [35,25], end: [65,25], duration: 200, weight: 0.8, opacity: 0.1, delay: 1350 },
        // Label
        { type: "text", point: [100,50], text: "Console", delay: 1500 }
    ],
    // === STATS: PRECISION FORMULA ===
    formulaPrecision: [
        // Box border
        { type: "line", start: [10,10], end: [120,10], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [120,10], end: [120,70], duration: 250, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [120,70], end: [10,70], duration: 300, weight: 1.2, opacity: 0.12, delay: 450 },
        { type: "line", start: [10,70], end: [10,10], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        // Title
        { type: "text", point: [15,25], text: "Precision", delay: 800 },
        // Formula: P = TP / (TP + FP)
        { type: "text", point: [15,42], text: "P = TP / (TP + FP)", delay: 1200 },
        // Explanation
        { type: "text", point: [15,58], text: "True Pos / All Pos", delay: 1800 },
        // Visual - confusion matrix hint
        { type: "line", start: [85,30], end: [115,30], duration: 150, weight: 0.6, opacity: 0.08, delay: 1400 },
        { type: "line", start: [85,30], end: [85,55], duration: 150, weight: 0.6, opacity: 0.08, delay: 1500 },
        { type: "line", start: [115,30], end: [115,55], duration: 150, weight: 0.6, opacity: 0.08, delay: 1600 },
        { type: "line", start: [85,55], end: [115,55], duration: 150, weight: 0.6, opacity: 0.08, delay: 1700 },
        { type: "line", start: [100,30], end: [100,55], duration: 100, weight: 0.5, opacity: 0.06, delay: 1800 },
        { type: "line", start: [85,42], end: [115,42], duration: 100, weight: 0.5, opacity: 0.06, delay: 1900 }
    ],

    // === STATS: RECALL FORMULA ===
    formulaRecall: [
        // Box border
        { type: "line", start: [10,10], end: [120,10], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [120,10], end: [120,70], duration: 250, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [120,70], end: [10,70], duration: 300, weight: 1.2, opacity: 0.12, delay: 450 },
        { type: "line", start: [10,70], end: [10,10], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        // Title
        { type: "text", point: [15,25], text: "Recall", delay: 800 },
        // Formula: R = TP / (TP + FN)
        { type: "text", point: [15,42], text: "R = TP / (TP + FN)", delay: 1200 },
        // Explanation
        { type: "text", point: [15,58], text: "True Pos / Actual Pos", delay: 1800 },
        // Visual - small chart
        { type: "line", start: [85,35], end: [115,35], duration: 150, weight: 0.6, opacity: 0.08, delay: 1400 },
        { type: "line", start: [85,50], end: [95,50], duration: 100, weight: 0.6, opacity: 0.08, delay: 1600 },
        { type: "line", start: [95,50], end: [95,35], duration: 100, weight: 0.6, opacity: 0.08, delay: 1700 }
    ],

    // === STATS: LOGIT FUNCTION ===
    formulaLogit: [
        // Box border
        { type: "line", start: [10,10], end: [125,10], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [125,10], end: [125,75], duration: 250, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [125,75], end: [10,75], duration: 300, weight: 1.2, opacity: 0.12, delay: 450 },
        { type: "line", start: [10,75], end: [10,10], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        // Title
        { type: "text", point: [15,25], text: "Logit", delay: 800 },
        // Formula: logit(p) = ln(p/(1-p))
        { type: "text", point: [15,42], text: "logit(p) = ln(p/1-p)", delay: 1200 },
        // Alternative
        { type: "text", point: [15,58], text: "ln(odds)", delay: 1800 },
        // Sigmoid curve hint
        { type: "arc", center: [95,55], radius: 20, startAngle: -Math.PI/3, endAngle: Math.PI/3, duration: 300, weight: 0.6, opacity: 0.08, delay: 1500 }
    ],

    // === STATS: BACKPROPAGATION ===
    formulaBackprop: [
        // Box border
        { type: "line", start: [10,10], end: [130,10], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [130,10], end: [130,75], duration: 250, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [130,75], end: [10,75], duration: 300, weight: 1.2, opacity: 0.12, delay: 450 },
        { type: "line", start: [10,75], end: [10,10], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        // Title
        { type: "text", point: [15,25], text: "Backprop", delay: 800 },
        // Chain rule
        { type: "text", point: [15,42], text: "dL/dw = dL/da . da/dz . dz/dw", delay: 1300 },
        // Gradient descent
        { type: "text", point: [15,58], text: "w = w - lr * grad", delay: 2000 },
        // Neural network nodes hint
        { type: "arc", center: [100,30], radius: 6, startAngle: 0, endAngle: Math.PI * 2, duration: 150, weight: 0.6, opacity: 0.08, delay: 1600 },
        { type: "arc", center: [115,50], radius: 6, startAngle: 0, endAngle: Math.PI * 2, duration: 150, weight: 0.6, opacity: 0.08, delay: 1700 },
        { type: "arc", center: [100,70], radius: 6, startAngle: 0, endAngle: Math.PI * 2, duration: 150, weight: 0.6, opacity: 0.08, delay: 1800 },
        // Connections
        { type: "line", start: [100,36], end: [115,44], duration: 100, weight: 0.5, opacity: 0.06, delay: 1900 },
        { type: "line", start: [100,64], end: [115,56], duration: 100, weight: 0.5, opacity: 0.06, delay: 2000 }
    ],
    // === NEW: Unit Conversion - meters to feet ===
    unitConversion_m_ft: [
        // Box border
        { type: "line", start: [10,10], end: [110,10], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [110,10], end: [110,60], duration: 250, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [110,60], end: [10,60], duration: 300, weight: 1.2, opacity: 0.12, delay: 450 },
        { type: "line", start: [10,60], end: [10,10], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        // Title
        { type: "text", point: [15,25], text: "Height", delay: 800 },
        // Formula
        { type: "text", point: [15,42], text: "1 m = 3.28 ft", delay: 1200 },
        { type: "text", point: [15,55], text: "1 ft = 12 in", delay: 1800 },
        // Visual - small ruler marks
        { type: "line", start: [15,70], end: [15,75], duration: 80, weight: 0.5, opacity: 0.08, delay: 1500 },
        { type: "line", start: [35,70], end: [35,75], duration: 80, weight: 0.5, opacity: 0.08, delay: 1600 },
        { type: "line", start: [55,70], end: [55,75], duration: 80, weight: 0.5, opacity: 0.08, delay: 1700 },
        { type: "line", start: [75,70], end: [75,75], duration: 80, weight: 0.5, opacity: 0.08, delay: 1800 },
        { type: "line", start: [95,70], end: [95,75], duration: 80, weight: 0.5, opacity: 0.08, delay: 1900 },
        { type: "line", start: [15,70], end: [95,70], duration: 200, weight: 0.5, opacity: 0.08, delay: 2000 }
    ],
    // === NEW: Unit Conversion - sq meters to acres ===
    unitConversion_area: [
        // Box border
        { type: "line", start: [10,10], end: [120,10], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [120,10], end: [120,70], duration: 250, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [120,70], end: [10,70], duration: 300, weight: 1.2, opacity: 0.12, delay: 450 },
        { type: "line", start: [10,70], end: [10,10], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        // Title
        { type: "text", point: [15,25], text: "Area", delay: 800 },
        // Formula
        { type: "text", point: [15,42], text: "1 acre = 4047 m", delay: 1200 },
        { type: "text", point: [70,38], text: "2", delay: 1600 },
        { type: "text", point: [15,58], text: "1 ha = 10000 m", delay: 2000 },
        { type: "text", point: [82,54], text: "2", delay: 2400 },
        // Small square representation
        { type: "line", start: [90,25], end: [110,25], duration: 100, weight: 0.5, opacity: 0.08, delay: 1400 },
        { type: "line", start: [110,25], end: [110,45], duration: 100, weight: 0.5, opacity: 0.08, delay: 1500 },
        { type: "line", start: [110,45], end: [90,45], duration: 100, weight: 0.5, opacity: 0.08, delay: 1600 },
        { type: "line", start: [90,45], end: [90,25], duration: 100, weight: 0.5, opacity: 0.08, delay: 1700 }
    ],
    // === NEW: Unit Conversion - inches to feet ===
    unitConversion_in_ft: [
        // Box border
        { type: "line", start: [10,10], end: [100,10], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [100,10], end: [100,55], duration: 250, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [100,55], end: [10,55], duration: 300, weight: 1.2, opacity: 0.12, delay: 450 },
        { type: "line", start: [10,55], end: [10,10], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        // Title
        { type: "text", point: [15,25], text: "Inches", delay: 800 },
        // Formula
        { type: "text", point: [15,42], text: "12 in = 1 ft", delay: 1200 },
        { type: "text", point: [15,52], text: "36 in = 1 yd", delay: 1700 },
        // Visual - inch marks
        { type: "line", start: [15,65], end: [85,65], duration: 200, weight: 0.6, opacity: 0.08, delay: 1400 },
        { type: "line", start: [15,65], end: [15,72], duration: 60, weight: 0.5, opacity: 0.08, delay: 1600 },
        { type: "line", start: [35,65], end: [35,70], duration: 40, weight: 0.5, opacity: 0.08, delay: 1700 },
        { type: "line", start: [55,65], end: [55,70], duration: 40, weight: 0.5, opacity: 0.08, delay: 1800 },
        { type: "line", start: [75,65], end: [75,72], duration: 60, weight: 0.5, opacity: 0.08, delay: 1900 }
    ],
    // === NEW: Area Formula - Rectangle ===
    formulaAreaRect: [
        // Box border
        { type: "line", start: [5,5], end: [110,5], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [110,5], end: [110,75], duration: 250, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [110,75], end: [5,75], duration: 300, weight: 1.2, opacity: 0.12, delay: 450 },
        { type: "line", start: [5,75], end: [5,5], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        // Title
        { type: "text", point: [10,20], text: "Rectangle", delay: 800 },
        // Formula
        { type: "text", point: [10,38], text: "A = l", delay: 1200 },
        { type: "text", point: [35,34], text: "2", delay: 1500 },
        { type: "text", point: [42,38], text: "= w x h", delay: 1700 },
        // Visual rectangle
        { type: "line", start: [65,50], end: [100,50], duration: 150, weight: 0.8, opacity: 0.1, delay: 1400 },
        { type: "line", start: [100,50], end: [100,70], duration: 120, weight: 0.8, opacity: 0.1, delay: 1550 },
        { type: "line", start: [100,70], end: [65,70], duration: 150, weight: 0.8, opacity: 0.1, delay: 1670 },
        { type: "line", start: [65,70], end: [65,50], duration: 120, weight: 0.8, opacity: 0.1, delay: 1820 },
        // Dimension labels
        { type: "line", start: [60,60], end: [63,60], duration: 50, weight: 0.5, opacity: 0.08, delay: 1900 },
        { type: "text", point: [52,62], text: "w", delay: 2000 },
        { type: "line", start: [82,45], end: [82,48], duration: 50, weight: 0.5, opacity: 0.08, delay: 1950 },
        { type: "text", point: [84,50], text: "h", delay: 2050 }
    ],
    // === NEW: Area Formula - Circle ===
    formulaAreaCircle: [
        // Box border
        { type: "line", start: [5,5], end: [105,5], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [105,5], end: [105,75], duration: 250, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [105,75], end: [5,75], duration: 300, weight: 1.2, opacity: 0.12, delay: 450 },
        { type: "line", start: [5,75], end: [5,5], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        // Title
        { type: "text", point: [10,20], text: "Circle", delay: 800 },
        // Formula
        { type: "text", point: [10,38], text: "A =", delay: 1200 },
        { type: "text", point: [30,34], text: "2", delay: 1500 },
        { type: "text", point: [35,38], text: "r", delay: 1700 },
        { type: "text", point: [30,30], text: "2", delay: 1900 },
        // Visual circle
        { type: "arc", center: [75,50], radius: 18, startAngle: 0, endAngle: Math.PI * 2, duration: 300, weight: 0.8, opacity: 0.1, delay: 1400 },
        // Radius line
        { type: "line", start: [75,50], end: [93,50], duration: 120, weight: 0.6, opacity: 0.08, delay: 1800 },
        { type: "text", point: [80,45], text: "r", delay: 2000 },
        // Pi symbol hint
        { type: "text", point: [42,38], text: "3.14 x", delay: 2100 }
    ],
    // === NEW: Volume Formula - Box ===
    formulaVolumeBox: [
        // Box border
        { type: "line", start: [5,5], end: [115,5], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [115,5], end: [115,80], duration: 250, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [115,80], end: [5,80], duration: 300, weight: 1.2, opacity: 0.12, delay: 450 },
        { type: "line", start: [5,80], end: [5,5], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        // Title
        { type: "text", point: [10,20], text: "Volume", delay: 800 },
        // Formula
        { type: "text", point: [10,38], text: "V = l x w x h", delay: 1300 },
        { type: "text", point: [10,55], text: "V = Area x h", delay: 1900 },
        // Visual cube (isometric)
        { type: "line", start: [70,45], end: [90,35], duration: 100, weight: 0.6, opacity: 0.08, delay: 1600 },
        { type: "line", start: [90,35], end: [110,45], duration: 100, weight: 0.6, opacity: 0.08, delay: 1700 },
        { type: "line", start: [110,45], end: [90,55], duration: 100, weight: 0.6, opacity: 0.08, delay: 1800 },
        { type: "line", start: [90,55], end: [70,45], duration: 100, weight: 0.6, opacity: 0.08, delay: 1900 },
        // Vertical edges
        { type: "line", start: [70,45], end: [70,65], duration: 100, weight: 0.6, opacity: 0.08, delay: 2000 },
        { type: "line", start: [90,55], end: [90,75], duration: 100, weight: 0.6, opacity: 0.08, delay: 2100 },
        { type: "line", start: [110,45], end: [110,65], duration: 100, weight: 0.6, opacity: 0.08, delay: 2200 },
        // Top
        { type: "line", start: [70,65], end: [90,75], duration: 100, weight: 0.6, opacity: 0.08, delay: 2300 },
        { type: "line", start: [90,75], end: [110,65], duration: 100, weight: 0.6, opacity: 0.08, delay: 2400 }
    ],
    // === NEW: Pythagorean Theorem ===
    formulaPythagoras: [
        // Box border
        { type: "line", start: [5,5], end: [105,5], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [105,5], end: [105,75], duration: 250, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [105,75], end: [5,75], duration: 300, weight: 1.2, opacity: 0.12, delay: 450 },
        { type: "line", start: [5,75], end: [5,5], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        // Title
        { type: "text", point: [10,20], text: "Triangle", delay: 800 },
        // Formula
        { type: "text", point: [10,38], text: "c", delay: 1200 },
        { type: "text", point: [18,34], text: "2", delay: 1400 },
        { type: "text", point: [25,38], text: "= a", delay: 1600 },
        { type: "text", point: [42,34], text: "2", delay: 1800 },
        { type: "text", point: [48,38], text: "+ b", delay: 2000 },
        { type: "text", point: [65,34], text: "2", delay: 2200 },
        // Visual right triangle
        { type: "line", start: [70,60], end: [70,30], duration: 150, weight: 0.8, opacity: 0.1, delay: 1400 },
        { type: "line", start: [70,60], end: [100,60], duration: 150, weight: 0.8, opacity: 0.1, delay: 1550 },
        { type: "line", start: [70,30], end: [100,60], duration: 200, weight: 0.8, opacity: 0.1, delay: 1700 },
        // Right angle marker
        { type: "line", start: [70,55], end: [75,55], duration: 60, weight: 0.5, opacity: 0.08, delay: 1900 },
        { type: "line", start: [75,55], end: [75,60], duration: 60, weight: 0.5, opacity: 0.08, delay: 1960 },
        // Labels
        { type: "text", point: [82,45], text: "c", delay: 2100 },
        { type: "text", point: [82,70], text: "a", delay: 2200 },
        { type: "text", point: [65,45], text: "b", delay: 2300 }
    ],
    // === NEW: Conversion - Celsius to Fahrenheit ===
    unitConversion_temp: [
        // Box border
        { type: "line", start: [10,10], end: [115,10], duration: 300, weight: 1.2, opacity: 0.12 },
        { type: "line", start: [115,10], end: [115,60], duration: 250, weight: 1.2, opacity: 0.12, delay: 250 },
        { type: "line", start: [115,60], end: [10,60], duration: 300, weight: 1.2, opacity: 0.12, delay: 450 },
        { type: "line", start: [10,60], end: [10,10], duration: 250, weight: 1.2, opacity: 0.12, delay: 700 },
        // Title
        { type: "text", point: [15,25], text: "Temp", delay: 800 },
        // Formula
        { type: "text", point: [15,42], text: "F = (C x 9/5) + 32", delay: 1300 },
        { type: "text", point: [15,55], text: "C = (F - 32) x 5/9", delay: 2000 },
        // Small thermometer hint
        { type: "line", start: [95,20], end: [95,50], duration: 150, weight: 0.5, opacity: 0.08, delay: 1600 },
        { type: "line", start: [92,20], end: [98,20], duration: 60, weight: 0.5, opacity: 0.08, delay: 1750 },
        { type: "line", start: [92,50], end: [98,50], duration: 60, weight: 0.5, opacity: 0.08, delay: 1820 },
        { type: "arc", center: [95,55], radius: 4, startAngle: 0, endAngle: Math.PI, duration: 100, weight: 0.5, opacity: 0.08, delay: 1900 }
    ],
    // === NEW: Roof Truss Diagram ===
    roofTruss: [
        // Bottom chord
        { type: "line", start: [10,70], end: [130,70], duration: 400, weight: 1.5, opacity: 0.15 },
        // Top left chord
        { type: "line", start: [10,70], end: [70,10], duration: 450, weight: 1.5, opacity: 0.15, delay: 300 },
        // Top right chord
        { type: "line", start: [70,10], end: [130,70], duration: 450, weight: 1.5, opacity: 0.15, delay: 500 },
        // Center vertical (king post)
        { type: "line", start: [70,10], end: [70,40], duration: 250, weight: 1.2, opacity: 0.12, delay: 800 },
        { type: "line", start: [70,40], end: [70,70], duration: 250, weight: 1.2, opacity: 0.12, delay: 1000 },
        // Left diagonal (web)
        { type: "line", start: [10,70], end: [70,40], duration: 350, weight: 1, opacity: 0.12, delay: 900 },
        // Right diagonal (web)
        { type: "line", start: [130,70], end: [70,40], duration: 350, weight: 1, opacity: 0.12, delay: 1100 },
        // Gusset plates at joints (circles)
        { type: "arc", center: [10,70], radius: 5, startAngle: 0, endAngle: Math.PI * 2, duration: 150, weight: 0.8, opacity: 0.1, delay: 1200 },
        { type: "arc", center: [70,10], radius: 6, startAngle: 0, endAngle: Math.PI * 2, duration: 150, weight: 0.8, opacity: 0.1, delay: 1300 },
        { type: "arc", center: [130,70], radius: 5, startAngle: 0, endAngle: Math.PI * 2, duration: 150, weight: 0.8, opacity: 0.1, delay: 1350 },
        { type: "arc", center: [70,40], radius: 5, startAngle: 0, endAngle: Math.PI * 2, duration: 150, weight: 0.8, opacity: 0.1, delay: 1400 },
        // Bolt symbols
        { type: "arc", center: [10,70], radius: 2, startAngle: 0, endAngle: Math.PI * 2, duration: 100, weight: 0.6, opacity: 0.1, delay: 1350 },
        { type: "arc", center: [70,10], radius: 2, startAngle: 0, endAngle: Math.PI * 2, duration: 100, weight: 0.6, opacity: 0.1, delay: 1450 },
        { type: "arc", center: [130,70], radius: 2, startAngle: 0, endAngle: Math.PI * 2, duration: 100, weight: 0.6, opacity: 0.1, delay: 1480 },
        // Load arrows (downward)
        { type: "line", start: [40,0], end: [40,10], duration: 150, weight: 0.6, opacity: 0.08, delay: 1500 },
        { type: "line", start: [40,10], end: [37,6], duration: 80, weight: 0.6, opacity: 0.08, delay: 1600 },
        { type: "line", start: [40,10], end: [43,6], duration: 80, weight: 0.6, opacity: 0.08, delay: 1650 },
        { type: "line", start: [70,0], end: [70,10], duration: 150, weight: 0.6, opacity: 0.08, delay: 1550 },
        { type: "line", start: [70,10], end: [67,6], duration: 80, weight: 0.6, opacity: 0.08, delay: 1650 },
        { type: "line", start: [70,10], end: [73,6], duration: 80, weight: 0.6, opacity: 0.08, delay: 1700 },
        { type: "line", start: [100,0], end: [100,10], duration: 150, weight: 0.6, opacity: 0.08, delay: 1600 },
        { type: "line", start: [100,10], end: [97,6], duration: 80, weight: 0.6, opacity: 0.08, delay: 1700 },
        { type: "line", start: [100,10], end: [103,6], duration: 80, weight: 0.6, opacity: 0.08, delay: 1750 },
        // Support symbols at bottom
        { type: "line", start: [5,75], end: [15,75], duration: 100, weight: 0.8, opacity: 0.1, delay: 1800 },
        { type: "line", start: [5,75], end: [0,82], duration: 100, weight: 0.8, opacity: 0.1, delay: 1880 },
        { type: "line", start: [15,75], end: [20,82], duration: 100, weight: 0.8, opacity: 0.1, delay: 1950 },
        { type: "line", start: [125,75], end: [135,75], duration: 100, weight: 0.8, opacity: 0.1, delay: 1850 },
        { type: "line", start: [125,75], end: [120,82], duration: 100, weight: 0.8, opacity: 0.1, delay: 1930 },
        { type: "line", start: [135,75], end: [140,82], duration: 100, weight: 0.8, opacity: 0.1, delay: 2000 },
        // Span dimension
        { type: "line", start: [10,90], end: [130,90], duration: 250, weight: 0.8, opacity: 0.1, dash: [3,3], delay: 2000 },
        { type: "tick", point: [10,90], delay: 2200 },
        { type: "tick", point: [130,90], delay: 2200 },
        { type: "text", point: [55,95], text: "6000mm Span", delay: 2300 },
        // Label
        { type: "text", point: [85,40], text: "Fink Truss", delay: 2400 }
    ]
};

function animateVignettes() {
    drawGrid(); // Base grid is always redrawn
    
    bgCtx.lineCap = 'round';
    bgCtx.lineJoin = 'round';
    const now = Date.now();

    for (let i = activeVignettes.length - 1; i >= 0; i--) {
        const vig = activeVignettes[i];
        const age = now - vig.startTime;
        
        // Figure out max duration + fade time
        const maxSequenceTime = Math.max(...vig.sequence.map(s => (s.delay || 0) + (s.duration || 0)));
        const totalLife = maxSequenceTime + 3000 + VANISH_TIME; // 3 secs hold before fading
        
        // Global opacity for the fade out ending
        let globalAlpha = 1;
        if (age > maxSequenceTime + 3000) {
            const fadeAge = age - (maxSequenceTime + 3000);
            if (fadeAge > VANISH_TIME) {
                // Remove from active types tracking
                activeDrawingTypes.delete(vig.key);
                activeVignettes.splice(i, 1);
                continue; // this vig is totally faded out, skip rendering
            }
            globalAlpha = 1 - (fadeAge / VANISH_TIME);
        }

        // Render each step in the sequence
        vig.sequence.forEach(step => {
            const stepAge = age - (step.delay || 0);
            if (stepAge < 0) return; // Hasn't started yet
            
            // For step progression 0 to 1
            // Text steps get default 800ms duration for writing animation
            const stepDuration = step.duration || (step.type === "text" ? 800 : 0);
            const progress = stepDuration ? Math.min(1, stepAge / stepDuration) : 1;
            const easedProgress = easeOutExpo(progress);

            // Positioning offsets (so the drawing happens where it was spawned)
            const oX = vig.origin[0];
            const oY = vig.origin[1];
            
            bgCtx.globalAlpha = globalAlpha * (step.opacity || 1);
            bgCtx.lineWidth = step.weight || 1;
            bgCtx.strokeStyle = '#000000';
            bgCtx.fillStyle = '#000000';
            
            if (step.dash) {
                bgCtx.setLineDash(step.dash);
            } else {
                bgCtx.setLineDash([]);
            }

            if (step.type === "erase" && progress > 0) {
                // Erasing logic (draw white over the line with 100% opacity)
                bgCtx.globalAlpha = globalAlpha; 
                bgCtx.strokeStyle = '#fdfdfc'; // Match background
                bgCtx.lineWidth = 3; // Thicker to ensure complete erasure
                bgCtx.beginPath();
                bgCtx.moveTo(oX + step.start[0], oY + step.start[1]);
                const curX = step.start[0] + (step.end[0] - step.start[0]) * easedProgress;
                const curY = step.start[1] + (step.end[1] - step.start[1]) * easedProgress;
                bgCtx.lineTo(oX + curX, oY + curY);
                bgCtx.stroke();
            } 
            else if (step.type === "line") {
                bgCtx.beginPath();
                bgCtx.moveTo(oX + step.start[0], oY + step.start[1]);
                const curX = step.start[0] + (step.end[0] - step.start[0]) * easedProgress;
                const curY = step.start[1] + (step.end[1] - step.start[1]) * easedProgress;
                bgCtx.lineTo(oX + curX, oY + curY);
                bgCtx.stroke();
            } 
            else if (step.type === "arc") {
                bgCtx.beginPath();
                const curEndAngle = step.startAngle + (step.endAngle - step.startAngle) * easedProgress;
                bgCtx.arc(oX + step.center[0], oY + step.center[1], step.radius, step.startAngle, curEndAngle);
                bgCtx.stroke();
            }
            else if (step.type === "ellipse") {
                bgCtx.beginPath();
                bgCtx.ellipse(
                    oX + step.center[0], 
                    oY + step.center[1], 
                    step.radiusX, 
                    step.radiusY, 
                    0, 
                    0, 
                    Math.PI * 2 * easedProgress
                );
                bgCtx.stroke();
            }
            else if (step.type === "text") {
                // Animate text as if being written character by character
                const text = step.text;
                // Use eased progress for smooth writing animation
                const textProgress = easedProgress;
                
                if (textProgress > 0) {
                    const charsToShow = Math.floor(text.length * textProgress);
                    const visibleText = text.substring(0, charsToShow);
                    
                    // Light pencil-style text rendering
                    bgCtx.font = "300 16px 'Shadows Into Light', cursive";
                    bgCtx.fillStyle = '#888888';
                    bgCtx.globalAlpha = globalAlpha * 0.6;
                    
                    // Draw characters with slight random offset for hand-drawn feel
                    let xOffset = oX + step.point[0];
                    const yOffset = oY + step.point[1];
                    
                    for (let c = 0; c < visibleText.length; c++) {
                        const char = visibleText[c];
                        // Slight wobble for each character (handwritten effect)
                        const wobbleX = (Math.sin(c * 0.5) * 0.5);
                        const wobbleY = (Math.cos(c * 0.7) * 0.5);
                        
                        bgCtx.fillText(char, xOffset + wobbleX, yOffset + wobbleY);
                        
                        // Advance x position (approximate character width)
                        const charWidth = bgCtx.measureText(char).width;
                        xOffset += charWidth * 0.9; // Slight overlap for cursive feel
                    }
                }
            }
            else if (step.type === "tick" && progress > 0.5) { // Architectural notation tick
                bgCtx.beginPath();
                bgCtx.moveTo(oX + step.point[0] - 4, oY + step.point[1] - 4);
                bgCtx.lineTo(oX + step.point[0] + 4, oY + step.point[1] + 4);
                bgCtx.stroke();
            }
        });
        
        // Reset Alpha for other drawing operations
        bgCtx.globalAlpha = 1;
        bgCtx.setLineDash([]);
    }
}

// Estimated dimensions for each vignette type [width, height] in pixels
const VIGNETTE_DIMENSIONS = {
    // Personal interests
    footballPitch: [140, 95],
    chelseaLogo: [120, 90],
    keyboard: [120, 70],
    mouse: [100, 90],
    pcCase: [90, 85],
    gpu: [110, 75],
    watch: [110, 100],
    dumbbell: [115, 75],
    plant: [100, 95],
    car: [130, 90],
    legoBrick: [105, 65],
    legoPiece: [90, 60],
    // Stats formulas
    formulaPrecision: [130, 80],
    formulaRecall: [130, 80],
    formulaLogit: [135, 85],
    formulaBackprop: [140, 85]
};

// Track active drawing types to prevent duplicates
const activeDrawingTypes = new Set();

function checkOverlap(x, y, dimensions) {
    const [dimW, dimH] = dimensions;
    const padding = 40; // Minimum space between drawings
    
    for (const vig of activeVignettes) {
        const [vigX, vigY] = vig.origin;
        const vigKey = vig.key;
        const [vigW, vigH] = VIGNETTE_DIMENSIONS[vigKey] || [100, 100];
        
        // Check if rectangles overlap with padding
        const overlapX = (x < vigX + vigW + padding) && (x + dimW + padding > vigX);
        const overlapY = (y < vigY + vigH + padding) && (y + dimH + padding > vigY);
        
        if (overlapX && overlapY) {
            return true; // Overlap detected
        }
    }
    return false; // No overlap
}

function getActiveDrawingCount() {
    return activeVignettes.length;
}

function spawnRandomVignette() {
    const keys = Object.keys(VIGNETTES);
    
    // Filter out types that are currently active (prevent duplicates)
    const availableKeys = keys.filter(key => !activeDrawingTypes.has(key));
    
    // If all types are active, use any key (fallback)
    const keysToUse = availableKeys.length > 0 ? availableKeys : keys;
    
    const randomKey = keysToUse[Math.floor(Math.random() * keysToUse.length)];
    const sequence = VIGNETTES[randomKey];
    const dimensions = VIGNETTE_DIMENSIONS[randomKey] || [100, 100];
    const [dimW, dimH] = dimensions;
    
    let spawnX, spawnY;
    let attempts = 0;
    const maxAttempts = 30;
    let foundPosition = false;
    
    // Try to find a non-overlapping position
    while (attempts < maxAttempts) {
        attempts++;
        
        // Define safe spawn zones (avoiding center area with main content)
        const safeZones = [
            { xMin: 0.02, xMax: 0.25, yMin: 0.05, yMax: 0.95 }, // Left side
            { xMin: 0.75, xMax: 0.98, yMin: 0.05, yMax: 0.95 }, // Right side
            { xMin: 0.25, xMax: 0.75, yMin: 0.05, yMax: 0.12 }, // Top strip
            { xMin: 0.25, xMax: 0.75, yMin: 0.75, yMax: 0.95 }  // Bottom strip
        ];
        
        // Pick a random zone
        const zone = safeZones[Math.floor(Math.random() * safeZones.length)];
        
        // Generate position within zone
        spawnX = width * (zone.xMin + Math.random() * (zone.xMax - zone.xMin));
        spawnY = height * (zone.yMin + Math.random() * (zone.yMax - zone.yMin));
        
        // Ensure position stays within canvas bounds with margin
        spawnX = Math.max(20, Math.min(spawnX, width - dimW - 20));
        spawnY = Math.max(20, Math.min(spawnY, height - dimH - 20));
        
        // Snap spawn to grid coordinates
        spawnX = Math.floor(spawnX / GRID_SIZE) * GRID_SIZE;
        spawnY = Math.floor(spawnY / GRID_SIZE) * GRID_SIZE;
        
        // Check for overlap
        if (!checkOverlap(spawnX, spawnY, dimensions)) {
            foundPosition = true;
            break;
        }
    }
    
    // Only spawn if we found a valid position
    if (foundPosition) {
        activeDrawingTypes.add(randomKey);
        activeVignettes.push({
            sequence: sequence,
            origin: [spawnX, spawnY],
            startTime: Date.now(),
            key: randomKey
        });
    }
}

// Global array to hold individual drawing segments
function animateDrawings() {
    bgCtx.lineCap = 'round';
    bgCtx.lineWidth = 1.2;
    bgCtx.strokeStyle = DRAWING_COLOR;
    
    drawings.forEach(d => {
        bgCtx.beginPath();
        bgCtx.moveTo(d.startX, d.startY);
        
        // Easing the progress of the drawing
        const currentX = d.startX + (d.endX - d.startX) * easeOutExpo(d.progress);
        const currentY = d.startY + (d.endY - d.startY) * easeOutExpo(d.progress);
        
        bgCtx.lineTo(currentX, currentY);
        bgCtx.stroke();
        
        // Advance progress if not complete
        if (d.progress < 1) {
            d.progress += d.speed;
            if (d.progress > 1) d.progress = 1;
        }
    });

    // Cleanup very old drawings to maintain performance
    if (drawings.length > 50) {
        drawings.shift(); 
    }
}

function addRandomDrawing() {
    const types = ['horizontal', 'vertical', 'diagonal'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Snap starting points to grid intersections for realism
    const startX = Math.floor(Math.random() * (width / GRID_SIZE)) * GRID_SIZE;
    const startY = Math.floor(Math.random() * (height / GRID_SIZE)) * GRID_SIZE;
    
    let endX, endY;
    // Length in multiples of grid cells (1 to 6 cells)
    const length = (Math.floor(Math.random() * 6) + 1) * GRID_SIZE; 
    
    if (type === 'horizontal') {
        endX = startX + (Math.random() > 0.5 ? length : -length);
        endY = startY;
    } else if (type === 'vertical') {
        endX = startX;
        endY = startY + (Math.random() > 0.5 ? length : -length);
    } else {
        // Diagonal must maintain 45deg ratio so length applies to both axes
        const signX = Math.random() > 0.5 ? 1 : -1;
        const signY = Math.random() > 0.5 ? 1 : -1;
        endX = startX + (length * signX);
        endY = startY + (length * signY);
    }
    
    drawings.push({
        type: 'line',
        startX, startY,
        endX, endY,
        progress: 0,
        speed: 0.005 + Math.random() * 0.015 // Random slow progression
    });
}

// Simple easing function for smooth drawing strokes
function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

function updateUI() {
    uiCtx.clearRect(0, 0, width, height);
    
    // Smooth trailing interpolation for the tracking crosshairs
    mouseX += (targetMouseX - mouseX) * 0.4;
    mouseY += (targetMouseY - mouseY) * 0.4;

    // Custom Cursor Logic
    if (isMagnetic) {
        // Apple Liquid Glass: Snap to center but allow 15% parallax based on mouse distance
        const pullX = magneticCenter.x + (targetMouseX - magneticCenter.x) * 0.15;
        const pullY = magneticCenter.y + (targetMouseY - magneticCenter.y) * 0.15;
        
        visualCursorX += (pullX - visualCursorX) * 0.4;
        visualCursorY += (pullY - visualCursorY) * 0.4;
    } else {
        // Without lag so pencil tip perfectly matches interaction point
        visualCursorX = targetMouseX;
        visualCursorY = targetMouseY;
    }
    
    // Hide cursor if it's off screen
    if (targetMouseX < 0 || targetMouseY < 0) {
        customCursor.style.opacity = '0';
    } else {
        customCursor.style.opacity = '1';
        customCursor.style.transform = `translate(${visualCursorX}px, ${visualCursorY}px)`;
    }
    
    // Only render crosshairs if mouse is inside window bounds roughly
    if (mouseX > 0 && mouseY > 0 && mouseX < width + 10 && mouseY < height + 10) {
        uiCtx.beginPath();
        uiCtx.setLineDash([4, 4]); // Dashed lines for the measuring tool aesthetic
        uiCtx.strokeStyle = CROSSHAIR_COLOR;
        uiCtx.lineWidth = 1;

        // Ensure crisp line drawing by snapping to half pixels
        let renderX = Math.round(mouseX) + 0.5;
        let renderY = Math.round(mouseY) + 0.5;
        
        // Vertical line
        uiCtx.moveTo(renderX, 0);
        uiCtx.lineTo(renderX, height);
        
        // Horizontal line
        uiCtx.moveTo(0, renderY);
        uiCtx.lineTo(width, renderY);
        
        uiCtx.stroke();
        uiCtx.setLineDash([]); // Reset line dash
        
        // Update DOM tooltip
        coordTooltip.style.transform = `translate(${targetMouseX - 20}px, ${targetMouseY + 28}px)`;
        // Convert mouse position to fake GPS coordinates
        const nDeg = 17;
        const nMin = 22 + Math.floor((targetMouseY / height) * 60);
        const nSec = Math.floor(((targetMouseY / height) * 60 % 1) * 100);
        const eDeg = 78;
        const eMin = 29 + Math.floor((targetMouseX / width) * 60);
        const eSec = Math.floor(((targetMouseX / width) * 60 % 1) * 100);
        
        nCoordSpan.textContent = `${nDeg}°${nMin.toString().padStart(2, '0')}.${nSec.toString().padStart(2, '0')}'`;
        eCoordSpan.textContent = `${eDeg}°${eMin.toString().padStart(2, '0')}.${eSec.toString().padStart(2, '0')}'`;
    } else {
        // Just hide the tooltip completely if it's out of bounds
        coordTooltip.style.opacity = '0';
    }
}



function animateUserDrawings() {
    const now = Date.now();
    
    bgCtx.lineCap = 'round';
    bgCtx.lineJoin = 'round';
    bgCtx.lineWidth = 2.5;

    for (let i = userDrawings.length - 1; i >= 0; i--) {
        const drawing = userDrawings[i];
        let allExpired = true;

        if (drawing.length > 1) {
            // Calculate opacity based on first point's age
            const age = now - drawing[0].t;
            
            if (age < VANISH_TIME) {
                allExpired = false;
                const lifeRatio = 1 - (age / VANISH_TIME);
                const opacity = Math.max(0, lifeRatio * 0.6);
                
                // Aesthetic muted red color
                bgCtx.strokeStyle = `rgba(200, 70, 70, ${opacity})`;
                bgCtx.beginPath();
                bgCtx.moveTo(drawing[0].x, drawing[0].y);
                
                // Draw smooth curves through points using quadratic bezier
                for (let j = 1; j < drawing.length - 1; j++) {
                    const p0 = drawing[j - 1];
                    const p1 = drawing[j];
                    const p2 = drawing[j + 1];
                    
                    // Control point is the current point, end at midpoint to next
                    const endX = (p1.x + p2.x) / 2;
                    const endY = (p1.y + p2.y) / 2;
                    
                    bgCtx.quadraticCurveTo(p1.x, p1.y, endX, endY);
                }
                
                // Draw final segment to last point
                const last = drawing[drawing.length - 1];
                bgCtx.lineTo(last.x, last.y);
                bgCtx.stroke();
            }
        } else if (drawing.length === 1) {
            // Single point (click without drag)
            const p0 = drawing[0];
            const age = now - p0.t;
            if (age < VANISH_TIME) {
                allExpired = false;
                const lifeRatio = 1 - (age / VANISH_TIME);
                const opacity = Math.max(0, lifeRatio * 0.6);

                bgCtx.beginPath();
                bgCtx.arc(p0.x, p0.y, 0.75, 0, Math.PI * 2);
                // Aesthetic muted red color
                bgCtx.fillStyle = `rgba(200, 70, 70, ${opacity})`;
                bgCtx.fill();
            }
        }
        
        // Remove completely invisible lines from the array
        if (allExpired && drawing !== currentDrawing) {
            userDrawings.splice(i, 1);
        }
    }
}

// Generative Doodle Arrow Math
function generateDoodlePath() {
    // The navigation dot (button) is roughly at Top-Right of the SVG space.
    // The text is roughly at Bottom-Left.
    // We want the arrow to flow FROM the button TO the text.
    
    // Start area roughly near the button: x: 75-95, y: 5-25
    const startX = 75 + Math.random() * 20;
    const startY = 5 + Math.random() * 20;
    
    // End area roughly near the text: x: 5-25, y: 75-95
    const endX = 5 + Math.random() * 20;
    const endY = 75 + Math.random() * 20;
    
    // Control points for a natural hand-drawn C or S curve
    function randWobble() { return (Math.random() - 0.5) * 30; }
    
    // CP1 pulls the curve outwards near the start
    const cp1X = startX - 20 + randWobble();
    const cp1Y = startY + 30 + randWobble();
    
    // CP2 pulls the curve outwards near the end
    const cp2X = endX + 30 + randWobble();
    const cp2Y = endY - 20 + randWobble();
    
    // Generate the arrow head lines at the end point (pointing at the text)
    // Angle of the main line arriving at the end point
    const angle = Math.atan2(endY - cp2Y, endX - cp2X);
    
    // Randomize arrowhead length and splay angle slightly for hand-drawn feel
    const headLen = 15 + Math.random() * 8;
    const headAngle1 = angle - Math.PI/6 + (Math.random()-0.5)*0.2;
    const headAngle2 = angle + Math.PI/6 + (Math.random()-0.5)*0.2;
    
    const head1X = endX - headLen * Math.cos(headAngle1);
    const head1Y = endY - headLen * Math.sin(headAngle1);
    
    const head2X = endX - headLen * Math.cos(headAngle2);
    const head2Y = endY - headLen * Math.sin(headAngle2);
    
    // M = Move to start (button)
    // C = Cubic Bezier Curve to end (text)
    // M = Move to end
    // L = Line to arrowhead side 1
    // M = Move to end
    // L = Line to arrowhead side 2
    return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY} M ${endX} ${endY} L ${head1X} ${head1Y} M ${endX} ${endY} L ${head2X} ${head2Y}`;
}

// Event Listeners
window.addEventListener('resize', resize);

// Handle mobile viewport changes (keyboard, browser chrome)
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        // Small delay to let the browser settle
        setTimeout(resize, 100);
    });
}

document.querySelectorAll('.nav-item').forEach(item => {
    const pathElement = item.querySelector('.arrow-path');
    
    const activateNavItem = () => {
        isMagnetic = true;
        cursorIcon.classList.add('magnetic');
        
        // Find exact center of the visual dot
        const rect = item.querySelector('.nav-dot').getBoundingClientRect();
        magneticCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        
        // Generate a fresh unique doodle path mathematically
        if (pathElement) {
            const newPath = generateDoodlePath();
            pathElement.setAttribute('d', newPath);
            
            // Re-trigger the CSS animation by removing and re-adding the class
            // This forces the "stroke-draw" animation to play from scratch
            pathElement.style.animation = 'none';
            // Force browser reflow to apply the animation reset
            void pathElement.offsetWidth; 
            pathElement.style.animation = 'drawPath 0.6s ease-out forwards 0.1s';
        }
    };
    
    const deactivateNavItem = () => {
        isMagnetic = false;
        cursorIcon.classList.remove('magnetic');
    };
    
    item.addEventListener('mouseenter', activateNavItem);
    item.addEventListener('mouseleave', deactivateNavItem);
    
    // Mobile touch support for nav items
    item.addEventListener('touchstart', (e) => {
        e.preventDefault();
        activateNavItem();
        
        // Trigger click after short delay for visual feedback
        setTimeout(() => {
            const dot = item.querySelector('.nav-dot');
            if (dot) dot.click();
        }, 100);
    }, { passive: false });
});

// Smooth a path using multiple passes of weighted moving averages
function smoothPath(points) {
    if (points.length < 3) return points;
    
    let smoothed = [...points];
    
    // Multiple passes with increasing window sizes for progressive smoothing
    const passes = [
        { window: 2, weight: 'linear' },    // Light smoothing
        { window: 3, weight: 'gaussian' },  // Medium smoothing  
        { window: 4, weight: 'gaussian' },  // Heavy smoothing
        { window: 3, weight: 'gaussian' }   // Final polish
    ];
    
    for (const pass of passes) {
        const newPoints = [];
        const w = pass.window;
        
        for (let i = 0; i < smoothed.length; i++) {
            let sumX = 0;
            let sumY = 0;
            let weightSum = 0;
            
            for (let j = -w; j <= w; j++) {
                const idx = i + j;
                if (idx >= 0 && idx < smoothed.length) {
                    let weight;
                    
                    if (pass.weight === 'gaussian') {
                        // Gaussian bell curve weighting
                        weight = Math.exp(-(j * j) / (2 * w));
                    } else {
                        // Linear falloff
                        weight = 1 - Math.abs(j) / (w + 1);
                    }
                    
                    sumX += smoothed[idx].x * weight;
                    sumY += smoothed[idx].y * weight;
                    weightSum += weight;
                }
            }
            
            newPoints.push({
                x: sumX / weightSum,
                y: sumY / weightSum,
                t: smoothed[i].t
            });
        }
        
        smoothed = newPoints;
    }
    
    return smoothed;
}

let drawStartPoint = null;
let rawDrawingPoints = []; // Stores raw points while drawing

window.addEventListener('mousedown', (e) => {
    isDrawing = true;
    drawStartPoint = { x: e.clientX, y: e.clientY, t: Date.now() };
    rawDrawingPoints = [drawStartPoint];
    // Create drawing with raw points initially
    currentDrawing = rawDrawingPoints;
    userDrawings.push(currentDrawing);
});

window.addEventListener('mousemove', (e) => {
    targetMouseX = e.clientX;
    targetMouseY = e.clientY;
    
    if (isDrawing && rawDrawingPoints) {
        // Collect raw points while drawing (freehand path visible)
        rawDrawingPoints.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    }
    
    // Hide UI numbers when hovering the navigation/header
    const isInteractive = e.target.closest('.glass-header');
    if (!isInteractive && coordTooltip.style.opacity !== '1') {
        coordTooltip.style.opacity = '1';
    } else if (isInteractive && coordTooltip.style.opacity !== '0') {
        coordTooltip.style.opacity = '0';
    }
});

window.addEventListener('mouseup', (e) => {
    if (isDrawing && currentDrawing && rawDrawingPoints.length > 0) {
        // Add final point
        rawDrawingPoints.push({ x: e.clientX, y: e.clientY, t: Date.now() });
        
        // Smooth the path
        const smoothed = smoothPath(rawDrawingPoints);
        
        // Replace raw points with smoothed points
        currentDrawing.length = 0;
        smoothed.forEach(p => currentDrawing.push(p));
    }
    
    isDrawing = false;
    currentDrawing = null;
    drawStartPoint = null;
    rawDrawingPoints = [];
});

// Touch support for mobile drawing
window.addEventListener('touchstart', (e) => {
    // Prevent default to avoid scrolling while drawing
    if (e.target.closest('.glass-header') || e.target.closest('.glass-nav')) {
        return; // Allow interaction with nav
    }
    
    const touch = e.touches[0];
    isDrawing = true;
    drawStartPoint = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    rawDrawingPoints = [drawStartPoint];
    currentDrawing = rawDrawingPoints;
    userDrawings.push(currentDrawing);
    
    targetMouseX = touch.clientX;
    targetMouseY = touch.clientY;
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent scrolling
    
    const touch = e.touches[0];
    targetMouseX = touch.clientX;
    targetMouseY = touch.clientY;
    
    if (isDrawing && rawDrawingPoints) {
        rawDrawingPoints.push({ x: touch.clientX, y: touch.clientY, t: Date.now() });
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    if (isDrawing && currentDrawing && rawDrawingPoints.length > 0) {
        // Add final point
        const touch = e.changedTouches[0];
        rawDrawingPoints.push({ x: touch.clientX, y: touch.clientY, t: Date.now() });
        
        // Smooth the path
        const smoothed = smoothPath(rawDrawingPoints);
        
        // Replace raw points with smoothed points
        currentDrawing.length = 0;
        smoothed.forEach(p => currentDrawing.push(p));
    }
    
    isDrawing = false;
    currentDrawing = null;
    drawStartPoint = null;
    rawDrawingPoints = [];
});

// Hide crosshairs/tooltip when mouse leaves document
document.addEventListener('mouseleave', () => {
    targetMouseX = -100;
    targetMouseY = -100;
    coordTooltip.style.opacity = '0';
});

// Logo Video Animation Controller
const logoVideo = document.getElementById('logoVideo');
const logoText = document.getElementById('logoText');
const VIDEO_HOLD_DURATION = 7000; // 7 seconds hold on final frame (milliseconds)
const TEXT_DISPLAY_DURATION = 7000; // 7 seconds showing text between animations

// Check if browser supports transparent WebM
function checkTransparencySupport() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1;
    canvas.height = 1;
    
    // Fill with red
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 1, 1);
    
    // Try to draw video frame
    try {
        ctx.drawImage(logoVideo, 0, 0, 1, 1);
        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        // If alpha is not 255, transparency is working
        return pixel[3] < 255;
    } catch (e) {
        return false;
    }
}

// Add event listeners for video debugging
if (logoVideo) {
    logoVideo.addEventListener('error', (e) => {
        console.error('Video error:', e);
    });
    logoVideo.addEventListener('loadeddata', () => {
        console.log('Video loaded, readyState:', logoVideo.readyState);
        // Check if we need CSS masking fallback
        setTimeout(() => {
            if (!checkTransparencySupport()) {
                console.log('Transparency not detected, using CSS fallback');
                logoVideo.style.mixBlendMode = 'multiply';
            }
        }, 500);
    });
}

async function runLogoCycle() {
    if (!logoVideo || !logoText) return;
    
    // Check if video has a valid source
    if (logoVideo.readyState === 0) {
        console.log('No video loaded, skipping animation');
        return;
    }
    
    const videoDuration = logoVideo.duration || 4; // Default to 4s if unknown
    
    // ========== PHASE 1: TEXT TO VIDEO ==========
    // Hide text, show video
    logoText.classList.add('hidden');
    
    // Small delay for text to start fading
    await new Promise(r => setTimeout(r, 200));
    
    // Show video container
    logoVideo.classList.add('visible');
    
    // Play video forward to end
    logoVideo.currentTime = 0;
    logoVideo.playbackRate = 1;
    
    try {
        await logoVideo.play();
    } catch (e) {
        // If video fails to play, revert to text
        logoVideo.classList.remove('visible');
        logoText.classList.remove('hidden');
        return;
    }
    
    // Wait for video to reach the end
    await new Promise(resolve => {
        const checkEnd = setInterval(() => {
            // Check if we're very close to the end or video ended
            if (logoVideo.currentTime >= videoDuration - 0.05 || logoVideo.ended) {
                clearInterval(checkEnd);
                logoVideo.pause();
                // Ensure we're exactly at the end - use a tiny offset to ensure last frame renders
                logoVideo.currentTime = Math.max(0, videoDuration - 0.02);
                resolve();
            }
        }, 30);
    });
    
    // Small delay to ensure the final frame is fully rendered
    await new Promise(r => setTimeout(r, 100));
    
    // ========== PHASE 2: HOLD ON FINAL FRAME for 20 seconds ==========
    await new Promise(r => setTimeout(r, VIDEO_HOLD_DURATION));
    
    // ========== PHASE 3: REVERSE VIDEO BACK TO START ==========
    const reverseInterval = 50; // Update every 50ms
    const reverseDuration = videoDuration * 1000; // Reverse over same duration as forward
    const reverseSteps = reverseDuration / reverseInterval;
    const timeStep = videoDuration / reverseSteps;
    
    for (let i = 0; i <= reverseSteps; i++) {
        logoVideo.currentTime = videoDuration - (i * timeStep);
        await new Promise(r => setTimeout(r, reverseInterval));
    }
    
    // Ensure we're exactly at the start
    logoVideo.currentTime = 0;
    
    // Hide video, show text sliding back in
    logoVideo.classList.remove('visible');
    
    await new Promise(r => setTimeout(r, 300));
    
    logoText.classList.remove('hidden');
    
    // ========== PHASE 4: HOLD ON TEXT for 20 seconds ==========
    await new Promise(r => setTimeout(r, TEXT_DISPLAY_DURATION));
}

// Start the continuous cycle
async function startLogoVideoCycle() {
    // Wait 10 seconds on page load before starting
    await new Promise(r => setTimeout(r, 10000));
    
    // Run the cycle continuously
    while (true) {
        await runLogoCycle();
    }
}

// Initialization
resize();

// Start the video cycle if video element exists
if (logoVideo && logoText) {
    startLogoVideoCycle();
}

// Logo language cycler — cycles full name across English, Telugu, Hindi every 5s
const LOGO_LABELS = [
    'Aushak Anuj',
    'ఔషక్ అనుజ్',
    'औशक अनुज'
];
let logoLabelIndex = 0;

function cycleLogoLabel() {
    if (!logoText) return;
    // Fade out
    logoText.classList.add('hidden');
    setTimeout(() => {
        logoLabelIndex = (logoLabelIndex + 1) % LOGO_LABELS.length;
        logoText.textContent = LOGO_LABELS[logoLabelIndex];
        // Fade in
        logoText.classList.remove('hidden');
    }, 450); // Slightly less than the 0.6s CSS transition so it feels snappy
}

// Set initial full name and start cycle
if (logoText) {
    logoText.textContent = LOGO_LABELS[0];
    setInterval(cycleLogoLabel, 5000);
}

// The Main Animation Loop
function animate() {
    animateVignettes(); // Draws the grid + actively choreographed architectural elements
    animateDrawings(); // Draws the random scattered background lines
    animateUserDrawings(); // Draws the user's interactive, vanishing sketches
    updateUI();        // Draws the animated crosshair overlay
    
    requestAnimationFrame(animate);
}

// Detect mobile device
const isMobile = window.matchMedia('(pointer: coarse)').matches || 
                 window.matchMedia('(max-width: 480px)').matches ||
                 'ontouchstart' in window;

animate();

// Spawn a new complex architectural vignette periodically
// Slower rate on mobile for better performance
const vignetteInterval = isMobile ? 2500 : 1800;
setInterval(spawnRandomVignette, vignetteInterval);

// Populate several initially to start with a fuller canvas
const initialVignettes = isMobile ? 2 : 4;
for(let i=0; i<initialVignettes; i++) {
    setTimeout(() => spawnRandomVignette(), i * 200);
}

// Add random lines frequently to fill out the empty spaces
const drawingInterval = isMobile ? 2000 : 1500;
setInterval(addRandomDrawing, drawingInterval);

// Populate a few initial random lines
const initialDrawings = isMobile ? 8 : 15;
for(let i=0; i<initialDrawings; i++) {
    addRandomDrawing();
    drawings[i].progress = 1; // instantly drawn
}
