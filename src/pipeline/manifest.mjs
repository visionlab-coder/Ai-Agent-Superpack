#!/usr/bin/env node
/**
 * manifest.mjs
 * VIDEO HARNESS PRO -- Generate a manifest of all available episodes
 *
 * Usage:
 *   node src/pipeline/manifest.mjs
 *
 * Scans output/scripts/ for *_script.json files, checks supporting assets,
 * and outputs a summary table + output/manifest.json.
 */

import { readdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

// -- Colors ------------------------------------------------------------------
const C = {
  reset:  '\x1b[0m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
}

const YES = `${C.green}YES${C.reset}`
const NO  = `${C.red} NO${C.reset}`

// -- Resolve project root ----------------------------------------------------
const __filename = fileURLToPath(import.meta.url)
const ROOT = resolve(__filename, '..', '..', '..')

// -- Helpers -----------------------------------------------------------------
function padRight(str, len) {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '')
  return str + ' '.repeat(Math.max(0, len - stripped.length))
}

function padLeft(str, len) {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '')
  return ' '.repeat(Math.max(0, len - stripped.length)) + str
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

// -- Main --------------------------------------------------------------------
function main() {
  const scriptsDir = resolve(ROOT, 'output', 'scripts')

  if (!existsSync(scriptsDir)) {
    console.error(`${C.red}[FAIL]${C.reset} output/scripts/ directory not found`)
    process.exit(1)
  }

  // Find all *_script.json files
  const scriptFiles = readdirSync(scriptsDir)
    .filter(f => f.endsWith('_script.json'))
    .sort()

  if (scriptFiles.length === 0) {
    console.log(`${C.yellow}[WARN]${C.reset} No script files found in output/scripts/`)
    process.exit(0)
  }

  console.log(`\n${C.bold}${C.cyan}VIDEO HARNESS PRO -- Episode Manifest${C.reset}`)
  console.log(`${C.dim}Scanning output/ for generated assets...${C.reset}\n`)

  const episodes = []

  for (const scriptFile of scriptFiles) {
    const prefix = scriptFile.replace('_script.json', '')

    const scriptPath       = resolve(ROOT, 'output', 'scripts',   `${prefix}_script.json`)
    const voicePath        = resolve(ROOT, 'output', 'scripts',   `${prefix}_voice.json`)
    const srtPath          = resolve(ROOT, 'output', 'subtitles', `${prefix}.srt`)
    const renderConfigPath = resolve(ROOT, 'output', 'reports',   `${prefix}_render_config.json`)
    const qaReportPath     = resolve(ROOT, 'output', 'reports',   `${prefix}_qa_report.json`)
    const remotionPath     = resolve(ROOT, 'output', 'scenes',    `${prefix}_remotion.tsx`)

    const scriptData = readJsonSafe(scriptPath)
    const sceneCount = Array.isArray(scriptData) ? scriptData.length : 0
    const totalDuration = Array.isArray(scriptData)
      ? scriptData.reduce((sum, s) => sum + (s.duration || 0), 0)
      : 0

    const hasScript       = existsSync(scriptPath)
    const hasVoice        = existsSync(voicePath)
    const hasSrt          = existsSync(srtPath)
    const hasRenderConfig = existsSync(renderConfigPath)
    const hasQaReport     = existsSync(qaReportPath)
    const hasRemotion     = existsSync(remotionPath)

    const assetCount = [hasScript, hasVoice, hasSrt, hasRenderConfig].filter(Boolean).length
    const isComplete = assetCount === 4

    episodes.push({
      prefix,
      sceneCount,
      totalDuration,
      hasScript,
      hasVoice,
      hasSrt,
      hasRenderConfig,
      hasQaReport,
      hasRemotion,
      isComplete,
      assetCount,
    })
  }

  // -- Print table -----------------------------------------------------------
  const COL = { prefix: 24, script: 8, srt: 8, voice: 8, render: 8, qa: 8, status: 12 }
  const sep = '-'.repeat(COL.prefix + COL.script + COL.srt + COL.voice + COL.render + COL.qa + COL.status + 14)

  console.log(sep)
  console.log(
    `  ${padRight(`${C.bold}Episode${C.reset}`, COL.prefix + 9)} ` +
    `${padRight(`${C.bold}Script${C.reset}`, COL.script + 9)} ` +
    `${padRight(`${C.bold}SRT${C.reset}`, COL.srt + 9)} ` +
    `${padRight(`${C.bold}Voice${C.reset}`, COL.voice + 9)} ` +
    `${padRight(`${C.bold}Render${C.reset}`, COL.render + 9)} ` +
    `${padRight(`${C.bold}QA${C.reset}`, COL.qa + 9)} ` +
    `${C.bold}Status${C.reset}`
  )
  console.log(sep)

  for (const ep of episodes) {
    const statusLabel = ep.isComplete
      ? `${C.green}COMPLETE${C.reset}`
      : `${C.yellow}PARTIAL (${ep.assetCount}/4)${C.reset}`

    console.log(
      `  ${padRight(ep.prefix, COL.prefix)} ` +
      `${padRight(ep.hasScript ? YES : NO, COL.script + 9)} ` +
      `${padRight(ep.hasSrt ? YES : NO, COL.srt + 9)} ` +
      `${padRight(ep.hasVoice ? YES : NO, COL.voice + 9)} ` +
      `${padRight(ep.hasRenderConfig ? YES : NO, COL.render + 9)} ` +
      `${padRight(ep.hasQaReport ? YES : NO, COL.qa + 9)} ` +
      `${statusLabel}`
    )
  }

  console.log(sep)

  // -- Summary stats ---------------------------------------------------------
  const completeCount = episodes.filter(e => e.isComplete).length
  const partialCount = episodes.length - completeCount

  console.log(`\n${C.bold}Stats:${C.reset}`)
  console.log(`  Total episodes:    ${episodes.length}`)
  console.log(`  ${C.green}Complete:          ${completeCount}${C.reset}`)
  if (partialCount > 0) {
    console.log(`  ${C.yellow}Partial:           ${partialCount}${C.reset}`)
  }

  // -- Write manifest.json ---------------------------------------------------
  const manifestPath = resolve(ROOT, 'output', 'manifest.json')
  const manifest = {
    version: '3.0.0',
    generatedAt: new Date().toISOString(),
    totalEpisodes: episodes.length,
    completeEpisodes: completeCount,
    episodes: episodes.map(ep => ({
      prefix: ep.prefix,
      sceneCount: ep.sceneCount,
      totalDuration: ep.totalDuration,
      assets: {
        script: ep.hasScript,
        voice: ep.hasVoice,
        srt: ep.hasSrt,
        renderConfig: ep.hasRenderConfig,
        qaReport: ep.hasQaReport,
        remotion: ep.hasRemotion,
      },
      isComplete: ep.isComplete,
    })),
  }

  try {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    console.log(`\n  ${C.green}[DONE]${C.reset} Manifest written to ${C.dim}${manifestPath}${C.reset}`)
  } catch (err) {
    console.error(`\n  ${C.red}[FAIL]${C.reset} Failed to write manifest: ${err.message}`)
    process.exit(1)
  }

  console.log()
}

main()
