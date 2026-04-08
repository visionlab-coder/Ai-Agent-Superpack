/**
 * render-episode.mjs
 *
 * Programmatic Remotion renderer for VIDEO HARNESS PRO episodes.
 *
 * Usage:
 *   node src/remotion/render-episode.mjs rc_ep01
 *
 * Reads:  output/scripts/{prefix}_script.json
 * Writes: output/render/{prefix}.mp4
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

async function main() {
  const prefix = process.argv[2];
  if (!prefix) {
    console.error('Usage: node src/remotion/render-episode.mjs <episode_prefix>');
    console.error('Example: node src/remotion/render-episode.mjs rc_ep01');
    process.exit(1);
  }

  const scriptPath = path.join(PROJECT_ROOT, 'output', 'scripts', `${prefix}_script.json`);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    process.exit(1);
  }

  const scriptData = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));

  // Support both { scenes, topic, anchor } wrapper and raw scene array
  const scenes = Array.isArray(scriptData) ? scriptData : scriptData.scenes;
  const topic = scriptData.topic || prefix;
  const anchor = scriptData.anchor || 'Anchor';

  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
    console.error('Invalid script: no scenes found');
    process.exit(1);
  }

  const outputDir = path.join(PROJECT_ROOT, 'output', 'render');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, `${prefix}.mp4`);

  console.log(`Bundling Remotion project...`);
  const entryPoint = path.join(PROJECT_ROOT, 'src', 'remotion', 'index.ts');
  const bundleLocation = await bundle({ entryPoint });

  console.log(`Selecting composition "NewsVideo"...`);
  const inputProps = { scenes, topic, anchor };
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'NewsVideo',
    inputProps,
  });

  console.log(`Rendering ${scenes.length} scenes (${composition.durationInFrames} frames @ ${composition.fps}fps)...`);
  console.log(`Output: ${outputPath}`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      process.stdout.write(`\rRendering: ${pct}%`);
    },
  });

  console.log(`\nRender complete: ${outputPath}`);
}

main().catch((err) => {
  console.error('Render failed:', err);
  process.exit(1);
});
