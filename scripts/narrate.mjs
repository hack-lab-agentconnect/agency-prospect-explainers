import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).filter(Boolean).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }));
const KEY = env.DEEPGRAM_API_KEY;
const VOICE = process.env.VOICE || 'aura-asteria-en';

// Parse the 5 narration sections out of agency-prospects.txt
const raw = readFileSync(path.join(__dirname, '..', 'agency-prospects.txt'), 'utf8');
const blocks = raw.split(/\n(?=\[\d\]\s)/).filter(b => /^\[\d\]/.test(b.trim()));
const sections = blocks.map(b => {
  const lines = b.split('\n');
  const head = lines[0].replace(/^\[\d\]\s*/, '').trim();
  // find first blank line after header, then keep indented narration lines
  let i = 1;
  while (i < lines.length && lines[i].trim() !== '') i++;
  const body = lines.slice(i + 1).map(l => l.replace(/^\s{0,4}/, '')).join('\n').trim();
  return { head, text: body.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ') };
});
console.log('sections:', sections.length, sections.map(s => s.head + ' (' + s.text.split(/\s+/).length + 'w)').join(' | '));

function chunk(text, max = 1800) {
  const parts = []; let cur = '';
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    if ((cur + ' ' + s).length > max && cur) { parts.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s;
  }
  if (cur) parts.push(cur);
  return parts;
}

mkdirSync(path.join(__dirname, 'out', 'vo'), { recursive: true });
const results = [];
for (let i = 0; i < sections.length; i++) {
  const bufs = [];
  for (const part of chunk(sections[i].text)) {
    const res = await fetch(`https://api.deepgram.com/v1/speak?model=${VOICE}&encoding=mp3`, {
      method: 'POST',
      headers: { Authorization: `Token ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: part }),
    });
    if (!res.ok) { console.error('Deepgram error', res.status, (await res.text()).slice(0, 300)); process.exit(1); }
    bufs.push(Buffer.from(await res.arrayBuffer()));
  }
  const buf = Buffer.concat(bufs);
  const f = path.join(__dirname, 'out', 'vo', `sec${i + 1}.mp3`);
  writeFileSync(f, buf);
  console.log(`sec${i + 1} -> ${f} (${(buf.length / 1024).toFixed(0)} KB)`);
  results.push(f);
}
writeFileSync(path.join(__dirname, 'out', 'vo', 'files.json'), JSON.stringify(results));
