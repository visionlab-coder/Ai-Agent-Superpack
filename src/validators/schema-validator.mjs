/**
 * schema-validator.mjs
 * JSON Schema validation using Ajv for VIDEO HARNESS PRO.
 * Loads schemas from harness/schemas/ and validates pipeline outputs.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
const SCHEMA_DIR = join(PROJECT_ROOT, 'harness', 'schemas');

/**
 * Create a configured Ajv instance with all project schemas loaded.
 */
async function createValidator() {
  const ajv = new Ajv({ allErrors: true, verbose: true });
  addFormats(ajv);

  const sceneSchema = JSON.parse(
    await readFile(join(SCHEMA_DIR, 'scene.schema.json'), 'utf-8')
  );
  const qaSchema = JSON.parse(
    await readFile(join(SCHEMA_DIR, 'qa_report.schema.json'), 'utf-8')
  );

  ajv.addSchema(sceneSchema, 'scene');
  ajv.addSchema(qaSchema, 'qa_report');

  return ajv;
}

let _ajv = null;

async function getValidator() {
  if (!_ajv) {
    _ajv = await createValidator();
  }
  return _ajv;
}

/**
 * Format Ajv errors into human-readable strings with field paths.
 */
function formatErrors(errors) {
  if (!errors) return [];
  return errors.map((err) => {
    const path = err.instancePath || '/';
    const message = err.message || 'unknown error';
    const params = err.params
      ? ` (${JSON.stringify(err.params)})`
      : '';
    return `[${path}] ${message}${params}`;
  });
}

/**
 * Validate data against a named schema.
 * Returns { valid, errors }.
 */
async function validateAgainstSchema(schemaName, data) {
  const ajv = await getValidator();
  const validate = ajv.getSchema(schemaName);
  if (!validate) {
    return {
      valid: false,
      errors: [`Schema "${schemaName}" not found in ${SCHEMA_DIR}`],
    };
  }
  const valid = validate(data);
  return {
    valid,
    errors: valid ? [] : formatErrors(validate.errors),
  };
}

/**
 * Validate scene array data against scene.schema.json.
 */
export async function validateScript(data) {
  return validateAgainstSchema('scene', data);
}

/**
 * Validate QA report data against qa_report.schema.json.
 */
export async function validateQAReport(data) {
  return validateAgainstSchema('qa_report', data);
}

/**
 * Validate all JSON files in a given output directory.
 * Attempts to match filenames to schemas by convention:
 *   *scene*.json  -> scene schema
 *   *qa*.json     -> qa_report schema
 */
export async function validateAll(outputDir) {
  const resolvedDir = resolve(outputDir);
  const results = [];

  let files;
  try {
    files = await readdir(resolvedDir);
  } catch {
    return [{ file: resolvedDir, valid: false, errors: ['Directory not found'] }];
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  for (const file of jsonFiles) {
    const filePath = join(resolvedDir, file);
    const lowerName = file.toLowerCase();

    let schemaName = null;
    if (lowerName.includes('scene') || lowerName.includes('script')) {
      schemaName = 'scene';
    } else if (lowerName.includes('qa')) {
      schemaName = 'qa_report';
    }

    if (!schemaName) {
      results.push({ file, valid: null, errors: ['No matching schema found'] });
      continue;
    }

    try {
      const raw = await readFile(filePath, 'utf-8');
      const data = JSON.parse(raw);
      const result = await validateAgainstSchema(schemaName, data);
      results.push({ file, ...result });
    } catch (err) {
      results.push({ file, valid: false, errors: [`Parse error: ${err.message}`] });
    }
  }

  return results;
}

export { formatErrors, validateAgainstSchema };
