import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MESSAGES_DIR = resolve(__dirname, '../messages');
const BASELINE = 'en.json';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function flattenKeys(obj: Record<string, JsonValue>, prefix = ''): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = flattenKeys(value as Record<string, JsonValue>, path);
      nested.forEach(k => keys.add(k));
    } else {
      keys.add(path);
    }
  }
  return keys;
}

function main(): void {
  if (!existsSync(MESSAGES_DIR)) {
    console.error(`❌ messages directory not found: ${MESSAGES_DIR}`);
    process.exit(1);
  }

  const baselinePath = resolve(MESSAGES_DIR, BASELINE);
  if (!existsSync(baselinePath)) {
    console.error(`❌ Baseline file ${BASELINE} not found in ${MESSAGES_DIR}`);
    process.exit(1);
  }

  const baseline: Record<string, JsonValue> = JSON.parse(readFileSync(baselinePath, 'utf-8'));
  const baselineKeys = flattenKeys(baseline);
  console.log(`ℹ️  Baseline [en] has ${baselineKeys.size} keys\n`);

  const files = readdirSync(MESSAGES_DIR).filter(f => f.endsWith('.json') && f !== BASELINE);
  let hasErrors = false;

  for (const file of files) {
    const localePath = resolve(MESSAGES_DIR, file);
    const locale: Record<string, JsonValue> = JSON.parse(readFileSync(localePath, 'utf-8'));
    const localeKeys = flattenKeys(locale);
    const localeName = file.replace('.json', '');

    const extra = [...localeKeys].filter(k => !baselineKeys.has(k));
    const missing = [...baselineKeys].filter(k => !localeKeys.has(k));

    if (missing.length > 0) {
      hasErrors = true;
      console.log(`❌ [${localeName}] ${missing.length} missing key(s):`);
      for (const key of missing) {
        console.log(`   - ${key}`);
      }
    } else {
      console.log(`✅ [${localeName}] All keys present (${localeKeys.size}/${baselineKeys.size})`);
    }

    if (extra.length > 0) {
      console.log(`⚠️  [${localeName}] ${extra.length} extra key(s) (not in en.json):`);
      for (const key of extra) {
        console.log(`   + ${key}`);
      }
    }
  }

  if (hasErrors) {
    console.error('\n❌ i18n audit FAILED: some locale files are missing keys compared to en.json.');
    process.exit(1);
  }

  console.log('\n✅ i18n audit passed — all locale files are complete.');
}

main();
