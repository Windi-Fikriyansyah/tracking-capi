const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Base SVG with TrackCapi brand telemetry pulse
function getSvg(isMaskable = false) {
  // If maskable, safe zone is inner 80% (padding around it)
  const padding = isMaskable ? 80 : 40;
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a122a" />
        <stop offset="50%" stop-color="#060c1d" />
        <stop offset="100%" stop-color="#02050e" />
      </linearGradient>
      <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#4edea3" />
        <stop offset="40%" stop-color="#4cd7f6" />
        <stop offset="100%" stop-color="#38bdf8" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="12" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Background -->
    ${
      isMaskable
        ? `<rect width="512" height="512" fill="url(#bgGrad)" />`
        : `<rect width="512" height="512" rx="110" fill="url(#bgGrad)" stroke="#1e293b" stroke-width="4" />`
    }

    <!-- Concentric radar grid hint -->
    <circle cx="256" cy="256" r="160" fill="none" stroke="#4cd7f6" stroke-opacity="0.08" stroke-width="2" stroke-dasharray="6,6" />
    <circle cx="256" cy="256" r="110" fill="none" stroke="#4cd7f6" stroke-opacity="0.12" stroke-width="2" />
    
    <!-- Central Glow Pulse -->
    <circle cx="256" cy="256" r="70" fill="#4cd7f6" fill-opacity="0.1" filter="url(#glow)" />

    <!-- Waveform / Activity Icon -->
    <g transform="translate(${isMaskable ? 40 : 20}, ${isMaskable ? 40 : 20}) scale(${isMaskable ? 0.84 : 0.92})">
      <!-- Glow duplicate -->
      <polyline
        points="70,256 140,256 190,140 240,360 290,200 330,280 370,256 440,256"
        fill="none"
        stroke="#4cd7f6"
        stroke-width="32"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-opacity="0.4"
        filter="url(#glow)"
      />
      <!-- Sharp foreground pulse line -->
      <polyline
        points="70,256 140,256 190,140 240,360 290,200 330,280 370,256 440,256"
        fill="none"
        stroke="url(#cyanGrad)"
        stroke-width="24"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- Telemetry Points -->
      <circle cx="190" cy="140" r="9" fill="#ffffff" />
      <circle cx="240" cy="360" r="9" fill="#4edea3" />
      <circle cx="290" cy="200" r="9" fill="#4cd7f6" />
    </g>

    <!-- Brand Label Hint -->
    <text x="256" y="445" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700" fill="#94a3b8" letter-spacing="6" text-anchor="middle">
      TRACKCAPI
    </text>
  </svg>
  `;
}

async function generate() {
  console.log('Generating PWA icons...');

  const standardSvg = Buffer.from(getSvg(false));
  const maskableSvg = Buffer.from(getSvg(true));

  // Save SVG directly
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), standardSvg);

  // 192x192 PNG
  await sharp(standardSvg)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192x192.png'));
  console.log('✓ icon-192x192.png created');

  // 512x512 PNG
  await sharp(standardSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512x512.png'));
  console.log('✓ icon-512x512.png created');

  // 512x512 Maskable PNG
  await sharp(maskableSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));
  console.log('✓ icon-maskable-512x512.png created');

  // 180x180 Apple Touch Icon
  await sharp(standardSvg)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png created');

  console.log('All PWA icons generated successfully!');
}

generate().catch(err => {
  console.error('Failed generating icons:', err);
  process.exit(1);
});
