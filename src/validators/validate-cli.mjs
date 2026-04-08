#!/usr/bin/env node

/**
 * validate-cli.mjs
 * CLI entry point for VIDEO HARNESS PRO gate validation.
 *
 * Usage: node src/validators/validate-cli.mjs <prefix> [outputDir]
 * Example: node src/validators/validate-cli.mjs rc_ep01
 *          node src/validators/validate-cli.mjs rc_ep01 ./output
 */

import { resolve, join } from 'node:path';
import { gate01, gate02, gate03 } from './gate-validator.mjs';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function printHeader(text) {
  console.log(`\n${BOLD}${CYAN}${'='.repeat(60)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${text}${RESET}`);
  console.log(`${BOLD}${CYAN}${'='.repeat(60)}${RESET}\n`);
}

function printGateResult(gateName, result) {
  const icon = result.passed ? `${GREEN}PASS` : `${RED}FAIL`;
  const scoreColor = result.score === result.total ? GREEN : YELLOW;

  console.log(`${BOLD}--- ${gateName} ---${RESET}`);
  console.log(`  Status: ${icon}${RESET}`);
  console.log(`  Score:  ${scoreColor}${result.score}/${result.total}${RESET}`);

  if (result.errors.length > 0) {
    console.log(`  Errors (${result.errors.length}):`);
    for (const err of result.errors) {
      console.log(`    ${RED}- ${err}${RESET}`);
    }
  }
  console.log();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${BOLD}VIDEO HARNESS PRO - Gate Validator CLI${RESET}

Usage: node src/validators/validate-cli.mjs <prefix> [outputDir]

Arguments:
  prefix     Episode prefix (e.g., rc_ep01)
  outputDir  Output directory (default: ./output)

Examples:
  node src/validators/validate-cli.mjs rc_ep01
  node src/validators/validate-cli.mjs rc_ep01 ./output
`);
    process.exit(0);
  }

  const prefix = args[0];
  const projectRoot = resolve(import.meta.dirname, '..', '..');
  const outputDir = args[1] ? resolve(args[1]) : join(projectRoot, 'output');
  const scenePath = join(outputDir, 'scripts', `${prefix}_script.json`);

  printHeader(`VIDEO HARNESS PRO - Gate Validation: ${prefix}`);
  console.log(`  Output dir: ${outputDir}`);
  console.log(`  Prefix:     ${prefix}\n`);

  let allPassed = true;

  // GATE_01: Script Validation
  console.log(`${BOLD}${CYAN}Running GATE_01 (Script Validation)...${RESET}`);
  const g1 = await gate01(scenePath);
  printGateResult('GATE_01 - Script', g1);
  if (!g1.passed) allPassed = false;

  // GATE_02: Visual Validation
  console.log(`${BOLD}${CYAN}Running GATE_02 (Visual Validation)...${RESET}`);
  const g2 = await gate02(prefix, outputDir);
  printGateResult('GATE_02 - Visual', g2);
  if (!g2.passed) allPassed = false;

  // GATE_03: QA Validation
  console.log(`${BOLD}${CYAN}Running GATE_03 (QA Validation)...${RESET}`);
  const g3 = await gate03(prefix, outputDir);
  printGateResult('GATE_03 - QA', g3);
  if (!g3.passed) allPassed = false;

  // Summary
  printHeader('SUMMARY');
  const totalScore = g1.score + g2.score + g3.score;
  const totalMax = g1.total + g2.total + g3.total;
  const totalErrors = g1.errors.length + g2.errors.length + g3.errors.length;

  if (allPassed) {
    console.log(`  ${GREEN}${BOLD}ALL GATES PASSED${RESET}  (${totalScore}/${totalMax})`);
  } else {
    console.log(`  ${RED}${BOLD}VALIDATION FAILED${RESET}  (${totalScore}/${totalMax}, ${totalErrors} errors)`);
  }
  console.log();

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(`${RED}Fatal error: ${err.message}${RESET}`);
  process.exit(1);
});
