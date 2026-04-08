#!/usr/bin/env node
/**
 * copy-to-public.mjs
 * VIDEO HARNESS PRO -- Copy validated output files to public/output/
 *
 * Usage:
 *   node src/pipeline/copy-to-public.mjs <prefix>
 *   node src/pipeline/copy-to-public.mjs rc_ep01
 */

import { existsSync, copyFileSync, mkdirSync, statSync } from 'node:fs'
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

// -- Resolve project root ----------------------------------------------------
const __filename = fileURLToPath(import.meta.url)
const ROOT = resolve(__filename, '..', '..', '..')

// -- Helpers -----------------------------------------------------------------
function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// -- Main --------------------------------------------------------------------
function main() {
  const prefix = process.argv[2]

  if (!prefix) {
    console.error(`${C.red}[FAIL]${C.reset} Usage: node src/pipeline/copy-to-public.mjs <prefix>`)
    console.error(`${C.dim}Example: node src/pipeline/copy-to-public.mjs rc_ep01${C.reset}`)
    process.exit(1)
  }

  console.log(`\n${C.bold}${C.cyan}VIDEO HARNESS PRO -- Copy to Public${C.reset}`)
  console.log(`${C.cyan}Prefix: ${prefix}${C.reset}\n`)

  // Source files to copy
  const fileMappings = [
    { src: resolve(ROOT, 'output', 'scripts',   `${prefix}_script.json`),        destDir: 'scripts',   name: `${prefix}_script.json` },
    { src: resolve(ROOT, 'output', 'scripts',   `${prefix}_voice.json`),         destDir: 'scripts',   name: `${prefix}_voice.json` },
    { src: resolve(ROOT, 'output', 'subtitles', `${prefix}.srt`),                destDir: 'subtitles', name: `${prefix}.srt` },
    { src: resolve(ROOT, 'output', 'reports',   `${prefix}_render_config.json`), destDir: 'reports',   name: `${prefix}_render_config.json` },
    { src: resolve(ROOT, 'output', 'reports',   `${prefix}_qa_report.json`),     destDir: 'reports',   name: `${prefix}_qa_report.json` },
  ]

  const pubBase = resolve(ROOT, 'public', 'output')
  let successCount = 0
  let failCount = 0
  let skipCount = 0
  const results = []

  for (const mapping of fileMappings) {
    const destDir = resolve(pubBase, mapping.destDir)
    const destPath = resolve(destDir, mapping.name)

    if (!existsSync(mapping.src)) {
      console.log(`  ${C.yellow}[SKIP]${C.reset} ${mapping.name} ${C.dim}(source not found)${C.reset}`)
      skipCount++
      results.push({ name: mapping.name, status: 'skip' })
      continue
    }

    ensureDir(destDir)

    try {
      copyFileSync(mapping.src, destPath)
      const size = statSync(destPath).size
      console.log(`  ${C.green}[COPY]${C.reset} ${mapping.name} ${C.dim}(${formatSize(size)})${C.reset}`)
      successCount++
      results.push({ name: mapping.name, status: 'ok', size })
    } catch (err) {
      console.log(`  ${C.red}[FAIL]${C.reset} ${mapping.name} ${C.dim}(${err.message})${C.reset}`)
      failCount++
      results.push({ name: mapping.name, status: 'fail', error: err.message })
    }
  }

  // Verify copies
  console.log(`\n${C.bold}Verification:${C.reset}`)
  for (const r of results) {
    if (r.status === 'ok') {
      const destPath = resolve(pubBase, fileMappings.find(m => m.name === r.name).destDir, r.name)
      const exists = existsSync(destPath)
      const icon = exists ? `${C.green}+${C.reset}` : `${C.red}x${C.reset}`
      console.log(`  ${icon} ${destPath}`)
    }
  }

  // Summary
  console.log(`\n${C.bold}Summary:${C.reset}`)
  console.log(`  ${C.green}Copied:  ${successCount}${C.reset}`)
  if (skipCount > 0) console.log(`  ${C.yellow}Skipped: ${skipCount}${C.reset}`)
  if (failCount > 0) console.log(`  ${C.red}Failed:  ${failCount}${C.reset}`)
  console.log()

  process.exit(failCount > 0 ? 1 : 0)
}

main()
