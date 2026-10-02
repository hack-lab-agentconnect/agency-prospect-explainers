import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FPS = Number(arg('fps', 30));
const DUR = [37, 35, 35.8, 36.1, 57.6];
const W = 1920, H = 1080;
mkdirSync(path.join(__dirname, 'out', 'sections'), { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(__dirname, 'src', 'index.html'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

async function renderScene(i) {
  const dur = DUR[i];
  const out = path.join(__dirname, 'out', 'sections', `silent${i + 1}.mp4`);
  const ff = spawn(ffmpegPath, ['-y', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', String(FPS),
    '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'ignore', 'ignore'] });
  const total = Math.round(dur * FPS);
  for (let f = 0; f < total; f++) {
    const dataUrl = await page.evaluate(([sc, tt]) => { window.seekScene(sc, tt); return document.getElementById('c').toDataURL('image/jpeg', 0.9); }, [i, f / FPS]);
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const buf = Buffer.from(b64, 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (FPS * 5) === 0) console.log(`scene ${i + 1}: ${(f / FPS).toFixed(0)}s / ${dur}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('done scene', i + 1, '->', out);
}
const only = arg('scene', null);
if (only !== null) await renderScene(Number(only));
else for (let i = 0; i < 5; i++) await renderScene(i);
await browser.close();
