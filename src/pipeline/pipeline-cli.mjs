#!/usr/bin/env node
/**
 * pipeline-cli.mjs
 * VIDEO HARNESS PRO -- One-click pipeline orchestrator
 *
 * Usage:
 *   node src/pipeline/pipeline-cli.mjs --topic "주제" --anchor "김무빈 앵커" [--episodes 1]
 *
 * DAG: Research -> Script -> [GATE_01] -> Scene+Subtitle+Voice (parallel) -> [GATE_02] -> Render -> [GATE_03] -> QA
 *
 * This script validates existing output files (generated via Claude Code),
 * runs gate checks, copies validated files to public/, and prints a manifest.
 */

import { existsSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

// -- Colors ------------------------------------------------------------------
const C = {
  reset:   '\x1b[0m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
}

const tag = (color, label) => `${color}[${label}]${C.reset}`
const RUNNING = tag(C.cyan,   'RUNNING')
const DONE    = tag(C.green,  'DONE')
const FAIL    = tag(C.red,    'FAIL')
const SKIP    = tag(C.yellow, 'SKIP')
const INFO    = tag(C.cyan,   'INFO')

// -- Resolve project root ----------------------------------------------------
const __filename = fileURLToPath(import.meta.url)
const ROOT = resolve(__filename, '..', '..', '..')

// -- Argument parsing --------------------------------------------------------
function parseArgs(argv) {
  const args = { topic: '', anchor: '', episodes: 1 }
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--topic':   args.topic   = argv[++i] || ''; break
      case '--anchor':  args.anchor  = argv[++i] || ''; break
      case '--episodes': args.episodes = parseInt(argv[++i], 10) || 1; break
      case '--help': case '-h':
        printUsage()
        process.exit(0)
      default:
        console.error(`${FAIL} Unknown argument: ${argv[i]}`)
        printUsage()
        process.exit(1)
    }
  }
  return args
}

function printUsage() {
  console.log(`
${C.bold}VIDEO HARNESS PRO -- Pipeline CLI${C.reset}

${C.cyan}Usage:${C.reset}
  node src/pipeline/pipeline-cli.mjs --topic "주제" --anchor "앵커명" [--episodes 1]

${C.cyan}Options:${C.reset}
  --topic     영상 주제 (required)
  --anchor    앵커 이름 (required)
  --episodes  에피소드 수 (default: 1)
  --help, -h  도움말 표시
`)
}

// -- Helpers -----------------------------------------------------------------
function topicToPrefix(topic) {
  return topic
    .replace(/[^a-zA-Z0-9가-힣]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30)
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

function fileExists(filePath) {
  return existsSync(filePath)
}

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

function copyFileSafe(src, dest) {
  try {
    copyFileSync(src, dest)
    return true
  } catch {
    return false
  }
}

// -- Gate validator (inline, no external dependency) -------------------------
function runGate01(scenes) {
  const checks = [
    { id: 'G01_C01', label: '씬 수 6-8개',            pass: scenes.length >= 6 && scenes.length <= 8 },
    { id: 'G01_C02', label: '총 길이 180-600초',       pass: (() => { const t = scenes.reduce((a, s) => a + (s.duration || 0), 0); return t >= 180 && t <= 600 })() },
    { id: 'G01_C03', label: '모든 씬 narration 존재',  pass: scenes.every(s => (s.narration || '').length > 40) },
    { id: 'G01_C04', label: 'opening 씬 존재',         pass: scenes.some(s => s.type === 'opening') },
    { id: 'G01_C05', label: 'closing 씬 존재',         pass: scenes.some(s => s.type === 'closing') },
    { id: 'G01_C06', label: 'lower_third 모두 존재',   pass: scenes.every(s => (s.lower_third || '').length > 0) },
  ]
  const score = checks.filter(c => c.pass).length
  return { gate: 'GATE_01', label: '대본 검토', checks, score, total: checks.length, threshold: 5, passed: score >= 5 }
}

function runGate02(scenes, srtContent, voiceData) {
  const checks = [
    { id: 'G02_C01', label: 'SRT 파일 존재',            pass: (srtContent || '').length > 50 },
    { id: 'G02_C02', label: 'SRT 타임코드 포함',        pass: (srtContent || '').includes('-->') },
    { id: 'G02_C03', label: '보이스 디렉션 존재',       pass: voiceData !== null },
    { id: 'G02_C04', label: '전환 효과 모두 지정됨',    pass: scenes.every(s => !!s.transition) },
    { id: 'G02_C05', label: 'accent 색상 모두 지정됨',  pass: scenes.every(s => !!s.accent) },
  ]
  const score = checks.filter(c => c.pass).length
  return { gate: 'GATE_02', label: '비주얼 검토', checks, score, total: checks.length, threshold: 4, passed: score >= 4 }
}

function runGate03(renderConfig, qaReport) {
  const checks = [
    { id: 'G03_C01', label: '렌더 설정 존재',        pass: renderConfig !== null },
    { id: 'G03_C02', label: '렌더 설정 씬 포함',     pass: (Array.isArray(renderConfig?.scenes) && renderConfig.scenes.length > 0) || (Array.isArray(renderConfig?.timeline) && renderConfig.timeline.length > 0) },
    { id: 'G03_C03', label: 'QA 리포트 존재 (선택)',  pass: qaReport !== null },
    { id: 'G03_C04', label: 'QA 점수 충분 (선택)',    pass: (qaReport?.score || 0) >= 24 },
  ]
  const score = checks.filter(c => c.pass).length
  return { gate: 'GATE_03', label: '최종 QA', checks, score, total: checks.length, threshold: 2, passed: score >= 2 }
}

function printGateResult(result) {
  const statusIcon = result.passed ? `${C.green}PASS${C.reset}` : `${C.red}FAIL${C.reset}`
  console.log(`\n  ${C.bold}${result.gate} - ${result.label}${C.reset}  [${statusIcon}]  ${result.score}/${result.total} (threshold: ${result.threshold})`)
  for (const c of result.checks) {
    const icon = c.pass ? `${C.green}+${C.reset}` : `${C.red}x${C.reset}`
    console.log(`    ${icon} ${c.label}`)
  }
}

// -- File path resolver for an episode ---------------------------------------
function getEpisodePaths(prefix) {
  return {
    script:       resolve(ROOT, 'output', 'scripts', `${prefix}_script.json`),
    voice:        resolve(ROOT, 'output', 'scripts', `${prefix}_voice.json`),
    srt:          resolve(ROOT, 'output', 'subtitles', `${prefix}.srt`),
    renderConfig: resolve(ROOT, 'output', 'reports', `${prefix}_render_config.json`),
    qaReport:     resolve(ROOT, 'output', 'reports', `${prefix}_qa_report.json`),
    remotion:     resolve(ROOT, 'output', 'scenes', `${prefix}_remotion.tsx`),
  }
}

// -- Copy validated episode to public/ ---------------------------------------
function copyToPublic(prefix, paths) {
  const pubBase = resolve(ROOT, 'public', 'output')
  const dirs = ['scripts', 'subtitles', 'reports']
  for (const d of dirs) {
    ensureDir(resolve(pubBase, d))
  }

  const copies = [
    { src: paths.script,       dest: resolve(pubBase, 'scripts',   `${prefix}_script.json`) },
    { src: paths.voice,        dest: resolve(pubBase, 'scripts',   `${prefix}_voice.json`) },
    { src: paths.srt,          dest: resolve(pubBase, 'subtitles', `${prefix}.srt`) },
    { src: paths.renderConfig, dest: resolve(pubBase, 'reports',   `${prefix}_render_config.json`) },
  ]

  const results = []
  for (const c of copies) {
    if (fileExists(c.src)) {
      const ok = copyFileSafe(c.src, c.dest)
      results.push({ file: basename(c.dest), ok })
    } else {
      results.push({ file: basename(c.dest), ok: false, missing: true })
    }
  }
  return results
}

// -- Stage runner for a single episode ---------------------------------------
function runEpisode(prefix, episodeLabel) {
  console.log(`\n${C.bold}${C.cyan}${'='.repeat(60)}${C.reset}`)
  console.log(`${C.bold}  ${episodeLabel}  (prefix: ${prefix})${C.reset}`)
  console.log(`${C.cyan}${'='.repeat(60)}${C.reset}`)

  const paths = getEpisodePaths(prefix)
  const summary = { prefix, gates: [], files: {}, copyResults: [] }

  // -- Stage 1: Research (check script exists as proxy) ----------------------
  process.stdout.write(`\n  ${RUNNING} Stage 1: Research + Script ... `)
  const scenes = readJsonSafe(paths.script)
  if (!scenes || !Array.isArray(scenes)) {
    console.log(FAIL)
    console.log(`    ${C.red}Script not found: ${paths.script}${C.reset}`)
    console.log(`    ${C.yellow}Run Claude Code to generate the script first.${C.reset}`)
    summary.failed = true
    return summary
  }
  console.log(`${DONE} (${scenes.length} scenes)`)
  summary.files.script = paths.script

  // -- Stage 2: GATE_01 (Script review) --------------------------------------
  process.stdout.write(`  ${RUNNING} Stage 2: GATE_01 (대본 검토) ... `)
  const gate01 = runGate01(scenes)
  if (gate01.passed) {
    console.log(DONE)
  } else {
    console.log(FAIL)
  }
  printGateResult(gate01)
  summary.gates.push(gate01)

  if (!gate01.passed) {
    console.log(`\n  ${C.red}GATE_01 FAILED -- pipeline halted for ${prefix}${C.reset}`)
    summary.failed = true
    return summary
  }

  // -- Stage 3: Scene + Subtitle + Voice (parallel check) --------------------
  process.stdout.write(`\n  ${RUNNING} Stage 3: SRT ... `)
  let srtContent = null
  if (fileExists(paths.srt)) {
    srtContent = readFileSync(paths.srt, 'utf-8')
    console.log(`${DONE} (${srtContent.split('\n').length} lines)`)
    summary.files.srt = paths.srt
  } else {
    console.log(`${SKIP} not found`)
  }

  process.stdout.write(`  ${RUNNING} Stage 3: Voice direction ... `)
  const voiceData = readJsonSafe(paths.voice)
  if (voiceData) {
    console.log(DONE)
    summary.files.voice = paths.voice
  } else {
    console.log(`${SKIP} not found`)
  }

  process.stdout.write(`  ${RUNNING} Stage 3: Remotion scene ... `)
  if (fileExists(paths.remotion)) {
    console.log(DONE)
    summary.files.remotion = paths.remotion
  } else {
    console.log(`${SKIP} not found`)
  }

  // -- Stage 4: GATE_02 (Visual review) --------------------------------------
  process.stdout.write(`\n  ${RUNNING} Stage 4: GATE_02 (비주얼 검토) ... `)
  const gate02 = runGate02(scenes, srtContent, voiceData)
  if (gate02.passed) {
    console.log(DONE)
  } else {
    console.log(FAIL)
  }
  printGateResult(gate02)
  summary.gates.push(gate02)

  if (!gate02.passed) {
    console.log(`\n  ${C.red}GATE_02 FAILED -- pipeline halted for ${prefix}${C.reset}`)
    summary.failed = true
    return summary
  }

  // -- Stage 5: Render config ------------------------------------------------
  process.stdout.write(`\n  ${RUNNING} Stage 5: Render config ... `)
  const renderConfig = readJsonSafe(paths.renderConfig)
  if (renderConfig) {
    console.log(DONE)
    summary.files.renderConfig = paths.renderConfig
  } else {
    console.log(`${SKIP} not found`)
  }

  // -- Stage 6: GATE_03 (Final QA) ------------------------------------------
  process.stdout.write(`  ${RUNNING} Stage 6: GATE_03 (최종 QA) ... `)
  const qaReport = readJsonSafe(paths.qaReport)
  const gate03 = runGate03(renderConfig, qaReport)
  if (gate03.passed) {
    console.log(DONE)
  } else {
    console.log(FAIL)
  }
  printGateResult(gate03)
  summary.gates.push(gate03)

  if (!gate03.passed) {
    console.log(`\n  ${C.red}GATE_03 FAILED -- pipeline halted for ${prefix}${C.reset}`)
    summary.failed = true
    return summary
  }

  if (qaReport) {
    summary.files.qaReport = paths.qaReport
  }

  // -- Stage 7: Copy to public/ ----------------------------------------------
  process.stdout.write(`\n  ${RUNNING} Stage 7: Copy to public/ ... `)
  const copyResults = copyToPublic(prefix, paths)
  const allCopied = copyResults.every(r => r.ok)
  if (allCopied) {
    console.log(DONE)
  } else {
    console.log(`${C.yellow}[PARTIAL]${C.reset}`)
  }
  for (const r of copyResults) {
    const icon = r.ok ? `${C.green}+${C.reset}` : r.missing ? `${C.yellow}-${C.reset}` : `${C.red}x${C.reset}`
    console.log(`    ${icon} ${r.file}${r.missing ? ' (source missing)' : ''}`)
  }
  summary.copyResults = copyResults

  summary.failed = false
  return summary
}

// -- Main --------------------------------------------------------------------
function main() {
  const args = parseArgs(process.argv)

  if (!args.topic) {
    console.error(`${FAIL} --topic is required`)
    printUsage()
    process.exit(1)
  }
  if (!args.anchor) {
    console.error(`${FAIL} --anchor is required`)
    printUsage()
    process.exit(1)
  }

  const basePrefix = topicToPrefix(args.topic)

  console.log(`\n${C.bold}${C.cyan}${'#'.repeat(60)}${C.reset}`)
  console.log(`${C.bold}  VIDEO HARNESS PRO -- Pipeline CLI${C.reset}`)
  console.log(`${C.cyan}${'#'.repeat(60)}${C.reset}`)
  console.log(`  ${INFO} Topic:    ${args.topic}`)
  console.log(`  ${INFO} Anchor:   ${args.anchor}`)
  console.log(`  ${INFO} Episodes: ${args.episodes}`)
  console.log(`  ${INFO} Prefix:   ${basePrefix}`)
  console.log(`  ${INFO} Root:     ${ROOT}`)

  const summaries = []

  for (let i = 1; i <= args.episodes; i++) {
    const prefix = args.episodes === 1
      ? basePrefix
      : `${basePrefix}_ep${String(i).padStart(2, '0')}`
    const label = args.episodes === 1
      ? `Episode: ${args.topic}`
      : `Episode ${i}/${args.episodes}: ${args.topic}`
    summaries.push(runEpisode(prefix, label))
  }

  // -- Final summary ---------------------------------------------------------
  console.log(`\n${C.bold}${C.cyan}${'#'.repeat(60)}${C.reset}`)
  console.log(`${C.bold}  PIPELINE SUMMARY${C.reset}`)
  console.log(`${C.cyan}${'#'.repeat(60)}${C.reset}\n`)

  let anyFailed = false
  for (const s of summaries) {
    const status = s.failed
      ? `${C.red}FAILED${C.reset}`
      : `${C.green}PASSED${C.reset}`
    console.log(`  ${s.prefix}  ${status}`)

    if (!s.failed) {
      for (const [key, path] of Object.entries(s.files)) {
        console.log(`    ${C.dim}${key}: ${path}${C.reset}`)
      }
    }

    for (const g of s.gates) {
      const gStatus = g.passed ? `${C.green}PASS${C.reset}` : `${C.red}FAIL${C.reset}`
      console.log(`    ${g.gate}: ${gStatus} (${g.score}/${g.total})`)
    }

    if (s.failed) anyFailed = true
    console.log()
  }

  if (anyFailed) {
    console.log(`${C.red}Some episodes failed validation. Fix issues and re-run.${C.reset}\n`)
    process.exit(1)
  } else {
    console.log(`${C.green}All episodes passed. Files copied to public/output/.${C.reset}\n`)
    process.exit(0)
  }
}

main()
