const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const toIco = require('to-ico');

(async function() {
    try {
        const repoRoot = path.join(__dirname, '..');
        const assetsDir = path.join(repoRoot, 'assets');
        const svgPath = path.join(assetsDir, 'icon.svg');
        const outPng = path.join(assetsDir, 'icon.png');
        const outIco = path.join(assetsDir, 'icon.ico');
        const tmpDir = path.join(assetsDir, 'icon-tmp');

        if (!fs.existsSync(svgPath)) {
            console.warn('No assets/icon.svg found. Skipping icon generation. Add an SVG to assets/icon.svg and re-run `npm run icon:generate`.');
            return;
        }

        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir);
        }

        const sizes = [256, 128, 64, 48, 32, 16];

        console.log('Generating PNGs from SVG...');
        for (const size of sizes) {
            const out = path.join(tmpDir, `icon-${size}.png`);
            await sharp(svgPath)
                .resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png()
                .toFile(out);
        }

        // copy largest PNG as assets/icon.png
        const largest = path.join(tmpDir, 'icon-256.png');
        if (fs.existsSync(largest)) {
            fs.copyFileSync(largest, outPng);
            console.log(`Wrote ${outPng}`);
        }

        console.log('Generating ICO (256,48,32,16)...');
        const icoPngs = [path.join(tmpDir, 'icon-256.png'), path.join(tmpDir, 'icon-48.png'), path.join(tmpDir, 'icon-32.png'), path.join(tmpDir, 'icon-16.png')]
            .filter(p => fs.existsSync(p));

        if (icoPngs.length === 0) {
            console.warn('No suitable PNGs found for ICO generation. Skipping ICO creation.');
            return;
        }

        // Read PNGs into buffers and convert to ICO using to-ico
        const pngBuffers = icoPngs.map(p => fs.readFileSync(p));
        const icoBuffer = await toIco(pngBuffers);
        fs.writeFileSync(outIco, icoBuffer);
        console.log(`Wrote ${outIco}`);

        // cleanup tmp
        // keep tmp for debugging; remove if you prefer
        // fs.rmSync(tmpDir, { recursive: true, force: true });

        console.log('Icon generation complete.');
    } catch (err) {
        console.error('Icon generation failed:', err);
        process.exit(1);
    }
})();