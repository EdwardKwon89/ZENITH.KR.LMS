import { createClient } from '@supabase/supabase-js';

interface AuditResult {
  role: string;
  codePaths: string[];
  dbPaths: string[];
  missingInDb: string[];
  orphanedInDb: string[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const STATIC_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['/master', '/admin', '/orders', '/logistics', '/billing', '/tracking', '/inventory', '/finance', '/settlement', '/voc', '/support', '/mypage'],
  MANAGER: ['/orders', '/logistics', '/billing', '/reports', '/tracking', '/inventory', '/finance', '/settlement', '/voc', '/support', '/mypage'],
  OPERATOR: ['/orders', '/logistics', '/tracking', '/voc', '/support', '/mypage'],
  CARRIER: ['/logistics/delivery', '/orders/assigned', '/admin/transport-costs', '/admin/rates', '/voc', '/support', '/mypage'],
  CORPORATE: ['/orders', '/billing/invoice', '/tracking', '/finance', '/settlement', '/voc', '/support', '/mypage'],
  INDIVIDUAL: ['/orders', '/tracking', '/voc', '/support', '/mypage'],
  USER: ['/dashboard', '/mypage', '/support'],
};

const EXPLICIT_ROLES = Object.keys(STATIC_PERMISSIONS);

function normalizePath(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : '/' + path;
}

async function main() {
  console.log('=== RBAC Audit Script ===\n');

  if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    console.error('ERROR: Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: dbPermissions, error } = await supabase
    .from('zen_role_permissions')
    .select('*')
    .order('role_code')
    .order('path');

  if (error) {
    console.error('ERROR: Failed to query zen_role_permissions:', error.message);
    process.exit(1);
  }

  const dbByRole: Record<string, Set<string>> = {};
  for (const row of dbPermissions || []) {
    if (!dbByRole[row.role_code]) dbByRole[row.role_code] = new Set();
    dbByRole[row.role_code].add(normalizePath(row.path));
  }

  let totalMissing = 0;
  let totalOrphaned = 0;
  const results: AuditResult[] = [];

  for (const role of EXPLICIT_ROLES) {
    const codePaths = (STATIC_PERMISSIONS[role] || []).map(normalizePath).sort();
    const dbPathsSet = dbByRole[role] || new Set();
    const dbPaths = [...dbPathsSet].sort();

    const missingInDb = codePaths.filter(p => !dbPathsSet.has(p));
    const orphanedInDb = dbPaths.filter(p => !codePaths.includes(p));

    totalMissing += missingInDb.length;
    totalOrphaned += orphanedInDb.length;

    results.push({ role, codePaths, dbPaths, missingInDb, orphanedInDb });
  }

  const dbOnlyRoles = Object.keys(dbByRole).filter(r => !EXPLICIT_ROLES.includes(r));

  for (const role of EXPLICIT_ROLES) {
    const r = results.find(x => x.role === role)!;
    console.log(`--- ${role} ---`);
    console.log(`  Code paths:    ${r.codePaths.length}`);
    console.log(`  DB paths:      ${r.dbPaths.length}`);

    if (r.missingInDb.length > 0) {
      console.log(`  ⚠️  MISSING in DB (${r.missingInDb.length}):`);
      for (const p of r.missingInDb) {
        console.log(`       INSERT: ${p}`);
      }
    }

    if (r.orphanedInDb.length > 0) {
      console.log(`  ⚠️  ORPHANED in DB (${r.orphanedInDb.length}):`);
      for (const p of r.orphanedInDb) {
        console.log(`       DELETE: ${p}`);
      }
    }

    if (r.missingInDb.length === 0 && r.orphanedInDb.length === 0) {
      console.log('  ✅ SYNCED');
    }
    console.log();
  }

  if (dbOnlyRoles.length > 0) {
    console.log('--- DB-only roles (no code counterpart) ---');
    for (const role of dbOnlyRoles) {
      console.log(`  ${role}: ${[...(dbByRole[role] || [])].join(', ')}`);
    }
    console.log();
  }

  console.log('=== Summary ===');
  console.log(`  Roles audited:    ${EXPLICIT_ROLES.length}`);
  console.log(`  DB-only roles:   ${dbOnlyRoles.length}`);
  console.log(`  Total missing:   ${totalMissing}`);
  console.log(`  Total orphaned:  ${totalOrphaned}`);
  console.log(`  Status:          ${totalMissing === 0 && totalOrphaned === 0 ? '✅ ALL SYNCED' : '⚠️  DISCREPANCIES FOUND'}`);
}

main().catch(console.error);
