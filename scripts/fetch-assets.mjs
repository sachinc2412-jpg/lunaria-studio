import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

const assets = JSON.parse(await readFile(new URL('../assets-manifest.json', import.meta.url), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let next = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (next < assets.length) {
    const asset = assets[next++];
    try { if (hash(await readFile(asset.path)) === asset.sha256) continue; } catch {}
    let failure;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(asset.url, { signal: AbortSignal.timeout(120000) });
        if (!response.ok) throw new Error(`${response.status}: ${asset.path}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length !== asset.size || hash(bytes) !== asset.sha256) throw new Error(`Asset verification failed: ${asset.path}`);
        await mkdir(dirname(asset.path), { recursive: true });
        await writeFile(asset.path, bytes);
        failure = null;
        break;
      } catch (error) { failure = error; }
    }
    if (failure) throw failure;
  }
}));
console.log(`Verified ${assets.length} Lunaria media assets.`);
