/**
 * gate-validator.mjs
 * Hard gate checks for VIDEO HARNESS PRO pipeline.
 * Each gate returns { passed, score, total, errors }.
 */

import { readFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { validateScript as schemaValidateScript } from './schema-validator.mjs';

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');

// ---------------------------------------------------------------------------
// Constants from STYLE_RULES.md and CHARACTER_GUIDE.md
// ---------------------------------------------------------------------------

const FORBIDDEN_WORDS = ['대박', '완전히', '엄청난', '놀랍게도'];

const STYLE_COLORS = {
  opening:  { bg: '#0D1F35', accent: '#60A5FA' },
  headline: { bg: '#1F0D0D', accent: '#EF4444' },
  data:     { bg: '#0D1F14', accent: '#10B981' },
  analysis: { bg: '#1A0D2E', accent: '#A78BFA' },
  expert:   { bg: '#1F1A0D', accent: '#F59E0B' },
  field:    { bg: '#0D1A1F', accent: '#34D399' },
  closing:  { bg: '#0D0D1F', accent: '#E8C547' },
};

/**
 * Transition rules from STYLE_RULES.md:
 *   opening->*     : fade
 *   *->headline    : wipe-left
 *   *->data        : zoom-in
 *   *->closing     : fade
 */
function expectedTransition(prevType, currentType) {
  if (prevType === null) {
    // First scene (opening) uses fade
    return 'fade';
  }
  // Specific target-type rules take priority over source-type rules
  if (currentType === 'headline') return 'wipe-left';
  if (currentType === 'data') return 'zoom-in';
  if (currentType === 'closing') return 'fade';
  if (prevType === 'opening') return 'fade';
  return null; // default: any transition allowed
}

// ---------------------------------------------------------------------------
// Helper: check file existence
// ---------------------------------------------------------------------------

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// GATE_01 — Script Validation
// ---------------------------------------------------------------------------

export async function gate01(scenesOrPath) {
  const errors = [];
  let scenes;

  if (typeof scenesOrPath === 'string') {
    try {
      scenes = await readJson(scenesOrPath);
    } catch (err) {
      return { passed: false, score: 0, total: 9, errors: [`Failed to read scene file: ${err.message}`] };
    }
  } else {
    scenes = scenesOrPath;
  }

  let score = 0;
  const total = 9;

  // 1. JSON Schema compliance
  const schemaResult = await schemaValidateScript(scenes);
  if (schemaResult.valid) {
    score += 1;
  } else {
    errors.push(`[Schema] JSON Schema validation failed:`);
    schemaResult.errors.forEach((e) => errors.push(`  ${e}`));
  }

  if (!Array.isArray(scenes)) {
    return { passed: false, score, total, errors: [...errors, 'Scenes is not an array'] };
  }

  // 2. Scene count 6-8
  if (scenes.length >= 6 && scenes.length <= 8) {
    score += 1;
  } else {
    errors.push(`[SceneCount] Expected 6-8 scenes, got ${scenes.length}`);
  }

  // 3. Narration length 40-300 chars each
  {
    let allPass = true;
    for (const scene of scenes) {
      const len = (scene.narration || '').length;
      if (len < 40 || len > 300) {
        allPass = false;
        errors.push(`[Narration] ${scene.id}: narration length ${len} out of range [40,300]`);
      }
    }
    if (allPass) score += 1;
  }

  // 4. Lower third <= 32 chars
  {
    let allPass = true;
    for (const scene of scenes) {
      const len = (scene.lower_third || '').length;
      if (len > 32) {
        allPass = false;
        errors.push(`[LowerThird] ${scene.id}: lower_third length ${len} exceeds 32`);
      }
    }
    if (allPass) score += 1;
  }

  // 5. Title <= 40 chars
  {
    let allPass = true;
    for (const scene of scenes) {
      const len = (scene.title || '').length;
      if (len > 40) {
        allPass = false;
        errors.push(`[Title] ${scene.id}: title length ${len} exceeds 40`);
      }
    }
    if (allPass) score += 1;
  }

  // 6. No forbidden words in narration
  {
    let allPass = true;
    for (const scene of scenes) {
      const narration = scene.narration || '';
      for (const word of FORBIDDEN_WORDS) {
        if (narration.includes(word)) {
          allPass = false;
          errors.push(`[ForbiddenWord] ${scene.id}: narration contains "${word}"`);
        }
      }
    }
    if (allPass) score += 1;
  }

  // 7. Scene types must include opening and closing
  {
    const types = new Set(scenes.map((s) => s.type));
    const hasOpening = types.has('opening');
    const hasClosing = types.has('closing');
    if (hasOpening && hasClosing) {
      score += 1;
    } else {
      if (!hasOpening) errors.push('[SceneTypes] Missing "opening" scene type');
      if (!hasClosing) errors.push('[SceneTypes] Missing "closing" scene type');
    }
  }

  // 8. Accent/bg colors match STYLE_RULES per scene type
  {
    let allPass = true;
    for (const scene of scenes) {
      const expected = STYLE_COLORS[scene.type];
      if (!expected) continue;

      if (scene.accent && scene.accent.toUpperCase() !== expected.accent.toUpperCase()) {
        allPass = false;
        errors.push(
          `[StyleColor] ${scene.id}: accent ${scene.accent} != expected ${expected.accent} for type "${scene.type}"`
        );
      }
      if (scene.bg && scene.bg.toUpperCase() !== expected.bg.toUpperCase()) {
        allPass = false;
        errors.push(
          `[StyleColor] ${scene.id}: bg ${scene.bg} != expected ${expected.bg} for type "${scene.type}"`
        );
      }
    }
    if (allPass) score += 1;
  }

  // 9. Transitions match rules
  {
    let allPass = true;
    for (let i = 0; i < scenes.length; i++) {
      const prevType = i === 0 ? null : scenes[i - 1].type;
      const scene = scenes[i];
      const expected = expectedTransition(prevType, scene.type);
      if (expected && scene.transition !== expected) {
        allPass = false;
        errors.push(
          `[Transition] ${scene.id}: transition "${scene.transition}" != expected "${expected}" ` +
          `(prev=${prevType || 'none'} -> current=${scene.type})`
        );
      }
    }
    if (allPass) score += 1;
  }

  return { passed: errors.length === 0, score, total, errors };
}

// ---------------------------------------------------------------------------
// GATE_02 — Visual Validation
// ---------------------------------------------------------------------------

export async function gate02(prefix, outputDir) {
  const errors = [];
  let score = 0;
  const total = 4;

  const baseDir = resolve(outputDir || join(PROJECT_ROOT, 'output'));

  // Locate files by prefix convention
  const srtPath = join(baseDir, 'subtitles', `${prefix}.srt`);
  const scenePath = join(baseDir, 'scripts', `${prefix}_script.json`);
  const voicePath = join(baseDir, 'scripts', `${prefix}_voice.json`);

  // 1. SRT file exists and has valid format
  {
    let srtValid = true;
    if (!(await fileExists(srtPath))) {
      srtValid = false;
      errors.push(`[SRT] File not found: ${srtPath}`);
    } else {
      try {
        const srtContent = await readFile(srtPath, 'utf-8');
        const cueBlocks = srtContent.trim().split(/\n\s*\n/).filter(Boolean);
        let prevNum = 0;
        for (const block of cueBlocks) {
          const lines = block.trim().split('\n');
          if (lines.length < 3) {
            srtValid = false;
            errors.push(`[SRT] Malformed cue block (< 3 lines): "${lines[0]}"`);
            break;
          }
          const num = parseInt(lines[0], 10);
          if (isNaN(num) || num !== prevNum + 1) {
            srtValid = false;
            errors.push(`[SRT] Non-sequential cue number: expected ${prevNum + 1}, got "${lines[0]}"`);
            break;
          }
          const tsRegex = /^\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}$/;
          if (!tsRegex.test(lines[1].trim())) {
            srtValid = false;
            errors.push(`[SRT] Invalid timestamp format at cue ${num}: "${lines[1]}"`);
            break;
          }
          prevNum = num;
        }

        // 2. SRT cue count >= scene count * 3
        if (srtValid && (await fileExists(scenePath))) {
          try {
            const scenes = await readJson(scenePath);
            const cueCount = cueBlocks.length;
            const minCues = scenes.length * 3;
            if (cueCount >= minCues) {
              score += 1; // cue count check passes
            } else {
              errors.push(`[SRTCount] Cue count ${cueCount} < scene count ${scenes.length} * 3 = ${minCues}`);
            }
          } catch (err) {
            errors.push(`[SRTCount] Could not read scenes for cue count check: ${err.message}`);
          }
        } else if (!srtValid) {
          errors.push('[SRTCount] Skipped cue count check due to invalid SRT');
        }
      } catch (err) {
        srtValid = false;
        errors.push(`[SRT] Failed to read SRT: ${err.message}`);
      }
    }
    if (srtValid) score += 1;
  }

  // 3. Voice direction JSON has matching scene count
  {
    if (!(await fileExists(voicePath))) {
      errors.push(`[Voice] File not found: ${voicePath}`);
    } else if (!(await fileExists(scenePath))) {
      errors.push(`[Voice] Scene file not found for comparison: ${scenePath}`);
    } else {
      try {
        const voice = await readJson(voicePath);
        const scenes = await readJson(scenePath);
        const voiceScenes = voice.scenes || (Array.isArray(voice) ? voice : []);
        const voiceCount = voiceScenes.length;
        if (voiceCount === scenes.length) {
          score += 1;
        } else {
          errors.push(`[Voice] Voice direction count ${voiceCount} != scene count ${scenes.length}`);
        }
      } catch (err) {
        errors.push(`[Voice] Failed to compare voice/scene: ${err.message}`);
      }
    }
  }

  // 4. All scene IDs match between script and voice
  {
    if ((await fileExists(voicePath)) && (await fileExists(scenePath))) {
      try {
        const voice = await readJson(voicePath);
        const scenes = await readJson(scenePath);
        // Normalize IDs: strip EP prefix (e.g., "EP01-SC01" → "SC01")
        const normalizeId = (id) => (id || '').replace(/^EP\d+-/, '');
        const sceneIds = new Set(scenes.map((s) => normalizeId(s.id)));
        const voiceScenes2 = voice.scenes || (Array.isArray(voice) ? voice : []);
        const voiceIds = new Set(voiceScenes2.map((v) => normalizeId(v.id || v.scene_id)));

        const missingInVoice = [...sceneIds].filter((id) => !voiceIds.has(id));
        const extraInVoice = [...voiceIds].filter((id) => !sceneIds.has(id));

        if (missingInVoice.length === 0 && extraInVoice.length === 0) {
          score += 1;
        } else {
          if (missingInVoice.length > 0) {
            errors.push(`[IDMatch] Scene IDs missing in voice: ${missingInVoice.join(', ')}`);
          }
          if (extraInVoice.length > 0) {
            errors.push(`[IDMatch] Extra IDs in voice not in scenes: ${extraInVoice.join(', ')}`);
          }
        }
      } catch (err) {
        errors.push(`[IDMatch] Failed to compare IDs: ${err.message}`);
      }
    } else {
      errors.push('[IDMatch] Skipped: required files missing');
    }
  }

  return { passed: errors.length === 0, score, total, errors };
}

// ---------------------------------------------------------------------------
// GATE_03 — QA Validation
// ---------------------------------------------------------------------------

export async function gate03(prefix, outputDir) {
  const errors = [];
  let score = 0;
  const total = 4;

  const baseDir = resolve(outputDir || join(PROJECT_ROOT, 'output'));

  const renderConfigPath = join(baseDir, 'reports', `${prefix}_render_config.json`);
  const scenePath = join(baseDir, 'scripts', `${prefix}_script.json`);

  // 1. Render config exists with correct specs
  {
    if (!(await fileExists(renderConfigPath))) {
      errors.push(`[RenderConfig] File not found: ${renderConfigPath}`);
    } else {
      try {
        const config = await readJson(renderConfigPath);
        const specErrors = [];
        const specs = config.specs || config;
        const res = specs.resolution || `${specs.width}x${specs.height}`;
        const fps = specs.fps || config.fps;

        if (res !== '1920x1080') specErrors.push(`resolution=${res} (expected 1920x1080)`);
        if (fps !== 30) specErrors.push(`fps=${fps} (expected 30)`);

        if (specErrors.length === 0) {
          score += 1;
        } else {
          errors.push(`[RenderConfig] Incorrect specs: ${specErrors.join(', ')}`);
        }
      } catch (err) {
        errors.push(`[RenderConfig] Failed to read: ${err.message}`);
      }
    }
  }

  // 2. Timeline frame continuity (no gaps)
  {
    if (!(await fileExists(renderConfigPath))) {
      errors.push('[Timeline] Skipped: render config missing');
    } else {
      try {
        const config = await readJson(renderConfigPath);
        const timeline = config.timeline || config.scenes || [];

        if (!Array.isArray(timeline) || timeline.length === 0) {
          errors.push('[Timeline] No timeline/scenes array in render config');
        } else {
          let hasGap = false;
          for (let i = 1; i < timeline.length; i++) {
            const prevEnd = (timeline[i - 1].start_sec ?? timeline[i - 1].start ?? 0) + (timeline[i - 1].duration || 0);
            const currStart = timeline[i].start_sec ?? timeline[i].start ?? 0;
            const gap = Math.abs(currStart - prevEnd);
            if (gap > 0.01) {
              hasGap = true;
              errors.push(
                `[Timeline] Gap between scene ${i - 1} and ${i}: ` +
                `prevEnd=${prevEnd.toFixed(3)}, currStart=${currStart.toFixed(3)}, gap=${gap.toFixed(3)}s`
              );
            }
          }
          if (!hasGap) score += 1;
        }
      } catch (err) {
        errors.push(`[Timeline] Failed to check continuity: ${err.message}`);
      }
    }
  }

  // 3. Total duration matches sum of scene durations
  {
    if (!(await fileExists(scenePath))) {
      errors.push('[Duration] Scene file not found');
    } else if (!(await fileExists(renderConfigPath))) {
      errors.push('[Duration] Render config not found');
    } else {
      try {
        const scenes = await readJson(scenePath);
        const config = await readJson(renderConfigPath);

        const sumDuration = scenes.reduce((acc, s) => acc + (s.duration || 0), 0);
        const configDuration = config.specs?.total_duration_sec || config.total_duration || config.duration || 0;

        if (configDuration === 0) {
          errors.push('[Duration] Render config has no total_duration field');
        } else if (Math.abs(sumDuration - configDuration) <= 0.5) {
          score += 1;
        } else {
          errors.push(
            `[Duration] Sum of scene durations (${sumDuration}s) != ` +
            `render config total (${configDuration}s), diff=${Math.abs(sumDuration - configDuration).toFixed(2)}s`
          );
        }
      } catch (err) {
        errors.push(`[Duration] Failed to check: ${err.message}`);
      }
    }
  }

  // 4. All file references in render config exist on disk
  {
    if (!(await fileExists(renderConfigPath))) {
      errors.push('[FileRefs] Render config missing');
    } else {
      try {
        const config = await readJson(renderConfigPath);
        const refs = extractFileRefs(config);

        if (refs.length === 0) {
          // No file references to check; pass by default
          score += 1;
        } else {
          let allExist = true;
          for (const ref of refs) {
            // refs may start with "output/" so resolve from project root
            const absPath = ref.startsWith('output/') ? resolve(PROJECT_ROOT, ref) : resolve(baseDir, ref);
            if (!(await fileExists(absPath))) {
              allExist = false;
              errors.push(`[FileRefs] Referenced file not found: ${ref}`);
            }
          }
          if (allExist) score += 1;
        }
      } catch (err) {
        errors.push(`[FileRefs] Failed to check: ${err.message}`);
      }
    }
  }

  return { passed: errors.length === 0, score, total, errors };
}

/**
 * Recursively extract file path references from a config object.
 * Looks for string values ending in common media/data extensions.
 */
function extractFileRefs(obj, refs = []) {
  if (typeof obj === 'string') {
    const fileExtPattern = /\.(mp4|mp3|wav|srt|json|png|jpg|jpeg|webp|svg|gif|webm)$/i;
    if (fileExtPattern.test(obj)) {
      refs.push(obj);
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      extractFileRefs(item, refs);
    }
  } else if (obj && typeof obj === 'object') {
    for (const val of Object.values(obj)) {
      extractFileRefs(val, refs);
    }
  }
  return refs;
}
