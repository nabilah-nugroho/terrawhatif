import * as THREE from 'three';

export interface ObservatoryTextures {
  deckColor: THREE.CanvasTexture;
  deckBump: THREE.CanvasTexture;
  deckNormal: THREE.CanvasTexture;
  deckRoughness: THREE.CanvasTexture;
  rockColor: THREE.CanvasTexture;
  rockBump: THREE.CanvasTexture;
  rockNormal: THREE.CanvasTexture;
  rockRoughness: THREE.CanvasTexture;
  iceColor: THREE.CanvasTexture;
  iceBump: THREE.CanvasTexture;
  iceNormal: THREE.CanvasTexture;
  iceRoughness: THREE.CanvasTexture;
  metalNormal: THREE.CanvasTexture;
  metalRoughness: THREE.CanvasTexture;
  oceanNormal: THREE.CanvasTexture;
  earthColor: THREE.CanvasTexture;
  earthClouds: THREE.CanvasTexture;
  earthNight: THREE.CanvasTexture;
  radialGlow: THREE.CanvasTexture;
  vaporPuff: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  compassDecal: THREE.CanvasTexture;
  dispose: () => void;
}

function seeded(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function heightCanvasToNormalCanvas(
  src: HTMLCanvasElement,
  strength: number
): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const srcCtx = src.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, w, h).data;
  const [outCanvas, outCtx] = makeCanvas(w, h);
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return srcData[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hL = sample(x - 1, y);
      const hR = sample(x + 1, y);
      const hD = sample(x, y - 1);
      const hU = sample(x, y + 1);

      const dx = (hL - hR) * strength;
      const dy = (hD - hU) * strength;
      const dz = 1.0;
      const invLen = 1 / Math.hypot(dx, dy, dz);

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((dx * invLen * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((dy * invLen * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}

function configureColorTex(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAniso: number
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

function configureDataTex(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAniso: number
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

export function createObservatoryTextures(maxAniso: number): ObservatoryTextures {
  // 1. Brushed Observatory Deck Metal & Seam Plates (Color + Bump + Normal + Roughness)
  const [deckColC, deckColCtx] = makeCanvas(512, 512);
  const [deckBmpC, deckBmpCtx] = makeCanvas(512, 512);
  const [deckRghC, deckRghCtx] = makeCanvas(512, 512);
  deckColCtx.fillStyle = '#1c2638';
  deckColCtx.fillRect(0, 0, 512, 512);
  deckBmpCtx.fillStyle = '#808080';
  deckBmpCtx.fillRect(0, 0, 512, 512);
  deckRghCtx.fillStyle = '#8a8a8a';
  deckRghCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 750; i++) {
    const y = seeded(i * 3) * 512;
    const shade = 26 + Math.floor(seeded(i * 3 + 1) * 18);
    deckColCtx.fillStyle = `rgba(${shade + 6}, ${shade + 14}, ${shade + 28}, 0.28)`;
    deckColCtx.fillRect(0, y, 512, 1.5);
    const bShade = 115 + Math.floor(seeded(i * 3 + 2) * 32);
    deckBmpCtx.fillStyle = `rgb(${bShade},${bShade},${bShade})`;
    deckBmpCtx.fillRect(0, y, 512, 1);

    const rShade = 95 + Math.floor(seeded(i * 3 + 7) * 75);
    deckRghCtx.fillStyle = `rgba(${rShade},${rShade},${rShade},0.35)`;
    deckRghCtx.fillRect(seeded(i * 4) * 260, y, 120 + seeded(i * 5) * 240, 1.5);
  }
  // Subtle specular wear patches across plate centers
  for (let i = 0; i < 48; i++) {
    const wx = seeded(i * 9 + 1) * 512;
    const wy = seeded(i * 9 + 2) * 512;
    const wr = 18 + seeded(i * 9 + 3) * 44;
    const wg = deckRghCtx.createRadialGradient(wx, wy, 2, wx, wy, wr);
    wg.addColorStop(0, 'rgba(65,65,65,0.36)');
    wg.addColorStop(1, 'rgba(135,135,135,0)');
    deckRghCtx.fillStyle = wg;
    deckRghCtx.beginPath();
    deckRghCtx.arc(wx, wy, wr, 0, Math.PI * 2);
    deckRghCtx.fill();
  }
  // Panel grid seams + corner rivets
  deckColCtx.strokeStyle = '#0e1522';
  deckColCtx.lineWidth = 4;
  deckBmpCtx.strokeStyle = '#2a2a2a';
  deckBmpCtx.lineWidth = 5;
  deckRghCtx.strokeStyle = '#dcdcdc';
  deckRghCtx.lineWidth = 5;
  for (let gx = 0; gx <= 512; gx += 128) {
    deckColCtx.beginPath();
    deckColCtx.moveTo(gx, 0);
    deckColCtx.lineTo(gx, 512);
    deckColCtx.stroke();
    deckBmpCtx.beginPath();
    deckBmpCtx.moveTo(gx, 0);
    deckBmpCtx.lineTo(gx, 512);
    deckBmpCtx.stroke();
    deckRghCtx.beginPath();
    deckRghCtx.moveTo(gx, 0);
    deckRghCtx.lineTo(gx, 512);
    deckRghCtx.stroke();
  }
  for (let gy = 0; gy <= 512; gy += 128) {
    deckColCtx.beginPath();
    deckColCtx.moveTo(0, gy);
    deckColCtx.lineTo(512, gy);
    deckColCtx.stroke();
    deckBmpCtx.beginPath();
    deckBmpCtx.moveTo(0, gy);
    deckBmpCtx.lineTo(512, gy);
    deckBmpCtx.stroke();
    deckRghCtx.beginPath();
    deckRghCtx.moveTo(0, gy);
    deckRghCtx.lineTo(512, gy);
    deckRghCtx.stroke();
  }
  for (let gx = 0; gx < 512; gx += 128) {
    for (let gy = 0; gy < 512; gy += 128) {
      const pts = [
        [gx + 10, gy + 10],
        [gx + 118, gy + 10],
        [gx + 10, gy + 118],
        [gx + 118, gy + 118],
      ];
      for (const [rx, ry] of pts) {
        deckColCtx.fillStyle = '#334563';
        deckColCtx.beginPath();
        deckColCtx.arc(rx, ry, 2.8, 0, Math.PI * 2);
        deckColCtx.fill();
        deckBmpCtx.fillStyle = '#d8d8d8';
        deckBmpCtx.beginPath();
        deckBmpCtx.arc(rx, ry, 2.8, 0, Math.PI * 2);
        deckBmpCtx.fill();
        deckRghCtx.fillStyle = '#5c5c5c';
        deckRghCtx.beginPath();
        deckRghCtx.arc(rx, ry, 3.0, 0, Math.PI * 2);
        deckRghCtx.fill();
      }
    }
  }
  const deckColor = configureColorTex(deckColC, 4, 3, maxAniso);
  const deckBump = configureDataTex(deckBmpC, 4, 3, maxAniso);
  const deckNormal = configureDataTex(heightCanvasToNormalCanvas(deckBmpC, 2.6), 4, 3, maxAniso);
  const deckRoughness = configureDataTex(deckRghC, 4, 3, maxAniso);

  // 2. Volcanic Basalt Rock (Color + Bump + Normal + Roughness)
  const [rockColC, rockColCtx] = makeCanvas(512, 512);
  const [rockBmpC, rockBmpCtx] = makeCanvas(512, 512);
  const [rockRghC, rockRghCtx] = makeCanvas(512, 512);
  rockColCtx.fillStyle = '#1b2230';
  rockColCtx.fillRect(0, 0, 512, 512);
  rockBmpCtx.fillStyle = '#7c7c7c';
  rockBmpCtx.fillRect(0, 0, 512, 512);
  rockRghCtx.fillStyle = '#c8c8c8';
  rockRghCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 460; i++) {
    const x = seeded(i * 5 + 1) * 512;
    const y = seeded(i * 5 + 2) * 512;
    const w = 18 + seeded(i * 5 + 3) * 65;
    const h = 10 + seeded(i * 5 + 4) * 32;
    const v = 18 + Math.floor(seeded(i * 5 + 5) * 28);
    rockColCtx.fillStyle = `rgba(${v}, ${v + 7}, ${v + 18}, 0.45)`;
    rockColCtx.fillRect(x, y, w, h);
    const bv = 70 + Math.floor(seeded(i * 5 + 5) * 120);
    rockBmpCtx.fillStyle = `rgba(${bv},${bv},${bv},0.46)`;
    rockBmpCtx.fillRect(x, y, w, h);
    const rv = 155 + Math.floor(seeded(i * 5 + 8) * 85);
    rockRghCtx.fillStyle = `rgba(${rv},${rv},${rv},0.42)`;
    rockRghCtx.fillRect(x, y, w, h);
  }
  const rockColor = configureColorTex(rockColC, 3, 2, maxAniso);
  const rockBump = configureDataTex(rockBmpC, 3, 2, maxAniso);
  const rockNormal = configureDataTex(heightCanvasToNormalCanvas(rockBmpC, 3.2), 3, 2, maxAniso);
  const rockRoughness = configureDataTex(rockRghC, 3, 2, maxAniso);

  // 3. Glacial Crystalline Ice (Color + Bump + Normal + Roughness)
  const [iceColC, iceColCtx] = makeCanvas(512, 512);
  const [iceBmpC, iceBmpCtx] = makeCanvas(512, 512);
  const [iceRghC, iceRghCtx] = makeCanvas(512, 512);
  const iceGrad = iceColCtx.createLinearGradient(0, 0, 512, 512);
  iceGrad.addColorStop(0, '#eef7ff');
  iceGrad.addColorStop(0.5, '#cfe8fa');
  iceGrad.addColorStop(1, '#a9d4f2');
  iceColCtx.fillStyle = iceGrad;
  iceColCtx.fillRect(0, 0, 512, 512);
  iceBmpCtx.fillStyle = '#888888';
  iceBmpCtx.fillRect(0, 0, 512, 512);
  iceRghCtx.fillStyle = '#555555';
  iceRghCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 180; i++) {
    const x1 = seeded(i * 4 + 1) * 512;
    const y1 = seeded(i * 4 + 2) * 512;
    const x2 = x1 + (seeded(i * 4 + 3) - 0.5) * 130;
    const y2 = y1 + (seeded(i * 4 + 4) - 0.5) * 130;
    iceColCtx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(94, 165, 218, 0.35)';
    iceColCtx.lineWidth = 1.5 + seeded(i) * 2.5;
    iceColCtx.beginPath();
    iceColCtx.moveTo(x1, y1);
    iceColCtx.lineTo(x2, y2);
    iceColCtx.stroke();

    iceBmpCtx.strokeStyle = i % 2 === 0 ? '#e0e0e0' : '#3a3a3a';
    iceBmpCtx.lineWidth = 2.2;
    iceBmpCtx.beginPath();
    iceBmpCtx.moveTo(x1, y1);
    iceBmpCtx.lineTo(x2, y2);
    iceBmpCtx.stroke();

    iceRghCtx.strokeStyle = i % 2 === 0 ? 'rgba(180,180,180,0.45)' : 'rgba(42,42,42,0.55)';
    iceRghCtx.lineWidth = 3;
    iceRghCtx.beginPath();
    iceRghCtx.moveTo(x1, y1);
    iceRghCtx.lineTo(x2, y2);
    iceRghCtx.stroke();
  }
  const iceColor = configureColorTex(iceColC, 2, 2, maxAniso);
  const iceBump = configureDataTex(iceBmpC, 2, 2, maxAniso);
  const iceNormal = configureDataTex(heightCanvasToNormalCanvas(iceBmpC, 2.8), 2, 2, maxAniso);
  const iceRoughness = configureDataTex(iceRghC, 2, 2, maxAniso);

  // 3b. Brushed Instrument Metal Micro-Surface (Normal + Roughness)
  const [metalBmpC, metalBmpCtx] = makeCanvas(256, 256);
  const [metalRghC, metalRghCtx] = makeCanvas(256, 256);
  metalBmpCtx.fillStyle = '#808080';
  metalBmpCtx.fillRect(0, 0, 256, 256);
  metalRghCtx.fillStyle = '#787878';
  metalRghCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    const y = seeded(i * 6 + 1) * 256;
    const x = seeded(i * 6 + 2) * 256;
    const len = 36 + seeded(i * 6 + 3) * 140;
    const bVal = 112 + Math.floor(seeded(i * 6 + 4) * 34);
    const rVal = 84 + Math.floor(seeded(i * 6 + 5) * 70);
    metalBmpCtx.fillStyle = `rgba(${bVal},${bVal},${bVal},0.48)`;
    metalBmpCtx.fillRect(x, y, len, 1);
    metalRghCtx.fillStyle = `rgba(${rVal},${rVal},${rVal},0.38)`;
    metalRghCtx.fillRect(x, y, len, 1.5);
  }
  const metalNormal = configureDataTex(heightCanvasToNormalCanvas(metalBmpC, 1.6), 2, 2, maxAniso);
  const metalRoughness = configureDataTex(metalRghC, 2, 2, maxAniso);

  // 4. Seamless Ocean Normal Map (sine wave derivative field)
  const [oceanC, oceanCtx] = makeCanvas(256, 256);
  const img = oceanCtx.createImageData(256, 256);
  const data = img.data;
  for (let y = 0; y < 256; y++) {
    const v = (y / 256) * Math.PI * 2;
    for (let x = 0; x < 256; x++) {
      const u = (x / 256) * Math.PI * 2;
      const dx =
        Math.cos(u * 3 + v * 2) * 0.25 +
        Math.cos(u * 7 - v * 5) * 0.14 +
        Math.cos(u * 13 + v * 9) * 0.08;
      const dy =
        Math.sin(u * 2 - v * 4) * 0.25 +
        Math.sin(u * 6 + v * 7) * 0.14 +
        Math.sin(u * 11 - v * 12) * 0.08;
      const idx = (y * 256 + x) * 4;
      data[idx] = Math.round((dx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((dy * 0.5 + 0.5) * 255);
      data[idx + 2] = 242;
      data[idx + 3] = 255;
    }
  }
  oceanCtx.putImageData(img, 0, 0);
  const oceanNormal = configureDataTex(oceanC, 24, 24, maxAniso);

  // 5. Distant 3D Earth Equirectangular Map (Ocean + Continents + Clouds + Night Lights)
  const [earthColC, earthColCtx] = makeCanvas(1024, 512);
  earthColCtx.fillStyle = '#1557a8';
  earthColCtx.fillRect(0, 0, 1024, 512);

  // Deep ocean bathymetry variance
  for (let i = 0; i < 60; i++) {
    const x = seeded(i * 6 + 1) * 1024;
    const y = seeded(i * 6 + 2) * 512;
    const r = 40 + seeded(i * 6 + 3) * 120;
    const g = earthColCtx.createRadialGradient(x, y, 5, x, y, r);
    g.addColorStop(0, 'rgba(32, 114, 198, 0.32)');
    g.addColorStop(1, 'rgba(13, 62, 130, 0)');
    earthColCtx.fillStyle = g;
    earthColCtx.beginPath();
    earthColCtx.arc(x, y, r, 0, Math.PI * 2);
    earthColCtx.fill();
  }

  // Stylized recognizable continents (Americas, Europe/Africa, Eurasia, Australia)
  const blobs = [
    // Americas
    [255, 165, 76, 62, -0.35],
    [305, 225, 38, 34, 0.2],
    [335, 315, 52, 74, 0.18],
    // Africa & Europe
    [545, 145, 72, 42, -0.15],
    [555, 255, 62, 72, 0.1],
    // Eurasia & India
    [685, 155, 128, 66, 0.08],
    [795, 215, 64, 48, -0.25],
    // Australia & Islands
    [835, 345, 52, 34, -0.1],
    [435, 92, 48, 28, -0.2], // Greenland
  ];
  for (const [bx, by, rx, ry, rot] of blobs) {
    earthColCtx.save();
    earthColCtx.translate(bx, by);
    earthColCtx.rotate(rot);
    const lg = earthColCtx.createRadialGradient(0, 0, 4, 0, 0, Math.max(rx, ry));
    lg.addColorStop(0, '#4f9959');
    lg.addColorStop(0.65, '#3b7d4e');
    lg.addColorStop(1, '#6f8750');
    earthColCtx.fillStyle = lg;
    earthColCtx.beginPath();
    earthColCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    earthColCtx.fill();
    // Arid desert patch
    earthColCtx.fillStyle = 'rgba(176, 152, 92, 0.45)';
    earthColCtx.beginPath();
    earthColCtx.ellipse(rx * 0.15, ry * 0.12, rx * 0.42, ry * 0.32, 0.3, 0, Math.PI * 2);
    earthColCtx.fill();
    earthColCtx.restore();
  }
  const earthColor = new THREE.CanvasTexture(earthColC);
  earthColor.colorSpace = THREE.SRGBColorSpace;
  earthColor.wrapS = THREE.RepeatWrapping;
  earthColor.wrapT = THREE.ClampToEdgeWrapping;
  earthColor.anisotropy = maxAniso;
  earthColor.needsUpdate = true;

  // Clouds layer
  const [cloudC, cloudCtx] = makeCanvas(1024, 512);
  cloudCtx.clearRect(0, 0, 1024, 512);
  for (let i = 0; i < 165; i++) {
    const cx = seeded(i * 7 + 11) * 1024;
    const cy = 48 + seeded(i * 7 + 12) * 416;
    const rx = 28 + seeded(i * 7 + 13) * 95;
    const ry = 8 + seeded(i * 7 + 14) * 20;
    const g = cloudCtx.createRadialGradient(cx, cy, 2, cx, cy, rx);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
    g.addColorStop(0.6, 'rgba(244, 249, 255, 0.34)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    cloudCtx.fillStyle = g;
    cloudCtx.save();
    cloudCtx.translate(cx, cy);
    cloudCtx.scale(1, ry / rx);
    cloudCtx.beginPath();
    cloudCtx.arc(0, 0, rx, 0, Math.PI * 2);
    cloudCtx.fill();
    cloudCtx.restore();
  }
  const earthClouds = new THREE.CanvasTexture(cloudC);
  earthClouds.colorSpace = THREE.SRGBColorSpace;
  earthClouds.wrapS = THREE.RepeatWrapping;
  earthClouds.wrapT = THREE.ClampToEdgeWrapping;
  earthClouds.anisotropy = maxAniso;
  earthClouds.needsUpdate = true;

  // Night city lights map
  const [nightC, nightCtx] = makeCanvas(512, 256);
  nightCtx.fillStyle = '#000000';
  nightCtx.fillRect(0, 0, 512, 256);
  for (const [bx, by, rx, ry] of blobs) {
    for (let k = 0; k < 22; k++) {
      const lx = (bx / 2) + (seeded(bx + k * 3) - 0.5) * rx * 0.75;
      const ly = (by / 2) + (seeded(by + k * 5) - 0.5) * ry * 0.75;
      const rad = 1 + seeded(k + bx) * 2.2;
      const g = nightCtx.createRadialGradient(lx, ly, 0, lx, ly, rad * 2);
      g.addColorStop(0, 'rgba(255, 214, 110, 0.95)');
      g.addColorStop(1, 'rgba(255, 180, 60, 0)');
      nightCtx.fillStyle = g;
      nightCtx.beginPath();
      nightCtx.arc(lx, ly, rad * 2, 0, Math.PI * 2);
      nightCtx.fill();
    }
  }
  const earthNight = new THREE.CanvasTexture(nightC);
  earthNight.colorSpace = THREE.SRGBColorSpace;
  earthNight.wrapS = THREE.RepeatWrapping;
  earthNight.wrapT = THREE.ClampToEdgeWrapping;
  earthNight.needsUpdate = true;

  // 6. Soft Radial Glow Sprite (Star Corona)
  const [glowC, glowCtx] = makeCanvas(256, 256);
  const rg = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(255, 255, 255, 1)');
  rg.addColorStop(0.22, 'rgba(255, 255, 255, 0.65)');
  rg.addColorStop(0.55, 'rgba(255, 255, 255, 0.16)');
  rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
  glowCtx.fillStyle = rg;
  glowCtx.fillRect(0, 0, 256, 256);
  const radialGlow = new THREE.CanvasTexture(glowC);
  radialGlow.colorSpace = THREE.SRGBColorSpace;
  radialGlow.needsUpdate = true;

  // 7. Vapor Puff Sprite
  const [vapC, vapCtx] = makeCanvas(128, 128);
  const vg = vapCtx.createRadialGradient(64, 64, 4, 64, 64, 62);
  vg.addColorStop(0, 'rgba(245, 238, 230, 0.62)');
  vg.addColorStop(0.55, 'rgba(232, 224, 216, 0.24)');
  vg.addColorStop(1, 'rgba(232, 224, 216, 0)');
  vapCtx.fillStyle = vg;
  vapCtx.fillRect(0, 0, 128, 128);
  const vaporPuff = new THREE.CanvasTexture(vapC);
  vaporPuff.colorSpace = THREE.SRGBColorSpace;
  vaporPuff.needsUpdate = true;

  // 8. Soft Contact Shadow Radial Vignette (for actors & instruments)
  const [csC, csCtx] = makeCanvas(128, 128);
  const csg = csCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
  csg.addColorStop(0, 'rgba(3, 7, 16, 0.72)');
  csg.addColorStop(0.42, 'rgba(4, 10, 22, 0.42)');
  csg.addColorStop(0.78, 'rgba(4, 10, 22, 0.12)');
  csg.addColorStop(1, 'rgba(4, 10, 22, 0)');
  csCtx.fillStyle = csg;
  csCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(csC);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;

  // 9. Engraved Observatory Deck Orbital Medallion Decal
  const [cmpC, cmpCtx] = makeCanvas(1024, 1024);
  cmpCtx.clearRect(0, 0, 1024, 1024);
  const cx = 512;
  const cy = 512;

  // Subtle dark slate inner medallion disc wash
  const discGrad = cmpCtx.createRadialGradient(cx, cy, 40, cx, cy, 470);
  discGrad.addColorStop(0, 'rgba(14, 24, 42, 0.52)');
  discGrad.addColorStop(0.72, 'rgba(18, 30, 52, 0.32)');
  discGrad.addColorStop(1, 'rgba(18, 30, 52, 0)');
  cmpCtx.fillStyle = discGrad;
  cmpCtx.beginPath();
  cmpCtx.arc(cx, cy, 470, 0, Math.PI * 2);
  cmpCtx.fill();

  // Concentric orbital gold & cyan hairline rings
  const ringSpecs: [number, string, number, number[]][] = [
    [456, 'rgba(125, 211, 252, 0.42)', 4, []],
    [438, 'rgba(251, 191, 36, 0.34)', 2, [10, 8]],
    [352, 'rgba(148, 163, 184, 0.34)', 2.5, []],
    [258, 'rgba(56, 189, 248, 0.36)', 2.5, [16, 10]],
    [146, 'rgba(251, 191, 36, 0.38)', 2, []],
    [68, 'rgba(125, 211, 252, 0.45)', 3, []],
  ];
  for (const [rad, col, lw, dash] of ringSpecs) {
    cmpCtx.save();
    cmpCtx.strokeStyle = col;
    cmpCtx.lineWidth = lw;
    cmpCtx.setLineDash(dash);
    cmpCtx.beginPath();
    cmpCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    cmpCtx.stroke();
    cmpCtx.restore();
  }

  // Degree tick marks around outer azimuth ring
  for (let deg = 0; deg < 360; deg += 5) {
    const a = (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const isMid = deg % 15 === 0;
    const r0 = isMajor ? 412 : isMid ? 424 : 430;
    const r1 = 448;
    cmpCtx.strokeStyle = isMajor
      ? 'rgba(251, 191, 36, 0.58)'
      : 'rgba(148, 163, 184, 0.36)';
    cmpCtx.lineWidth = isMajor ? 3 : 1.5;
    cmpCtx.beginPath();
    cmpCtx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    cmpCtx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    cmpCtx.stroke();
  }

  // Crosshair & diagonal sightlines
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 4;
    cmpCtx.strokeStyle = k % 2 === 0 ? 'rgba(125, 211, 252, 0.28)' : 'rgba(148, 163, 184, 0.16)';
    cmpCtx.lineWidth = k % 2 === 0 ? 2.5 : 1.5;
    cmpCtx.beginPath();
    cmpCtx.moveTo(cx + Math.cos(a) * 82, cy + Math.sin(a) * 82);
    cmpCtx.lineTo(cx + Math.cos(a) * 405, cy + Math.sin(a) * 405);
    cmpCtx.stroke();
  }

  // Miniature stylized planet nodes along orbital rings
  const orbNodes: [number, number, string][] = [
    [258, -0.55, '#38bdf8'],
    [352, 2.25, '#fbbf24'],
    [146, 1.15, '#34d399'],
  ];
  for (const [nr, ang, col] of orbNodes) {
    const nx = cx + Math.cos(ang) * nr;
    const ny = cy + Math.sin(ang) * nr;
    cmpCtx.fillStyle = col;
    cmpCtx.beginPath();
    cmpCtx.arc(nx, ny, 8, 0, Math.PI * 2);
    cmpCtx.fill();
  }

  const compassDecal = new THREE.CanvasTexture(cmpC);
  compassDecal.colorSpace = THREE.SRGBColorSpace;
  compassDecal.anisotropy = maxAniso;
  compassDecal.needsUpdate = true;

  const all = [
    deckColor,
    deckBump,
    deckNormal,
    deckRoughness,
    rockColor,
    rockBump,
    rockNormal,
    rockRoughness,
    iceColor,
    iceBump,
    iceNormal,
    iceRoughness,
    metalNormal,
    metalRoughness,
    oceanNormal,
    earthColor,
    earthClouds,
    earthNight,
    radialGlow,
    vaporPuff,
    contactShadow,
    compassDecal,
  ];

  return {
    deckColor,
    deckBump,
    deckNormal,
    deckRoughness,
    rockColor,
    rockBump,
    rockNormal,
    rockRoughness,
    iceColor,
    iceBump,
    iceNormal,
    iceRoughness,
    metalNormal,
    metalRoughness,
    oceanNormal,
    earthColor,
    earthClouds,
    earthNight,
    radialGlow,
    vaporPuff,
    contactShadow,
    compassDecal,
    dispose: () => {
      for (const tex of all) tex.dispose();
    },
  };
}
