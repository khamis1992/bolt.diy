import type { AppLoadContext } from '@remix-run/cloudflare';
import { getDatabase } from './db.server';

export interface WorkspaceRecord {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface WorkspaceMemberRecord {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSaasEnabled(env: Partial<Env> | undefined): boolean {
  return env?.SAAS_MODE === 'true';
}

export function normalizeWorkspaceSlug(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  if (!normalized || !slugPattern.test(normalized)) {
    throw new Error('Workspace slug must contain only lowercase letters, numbers, and hyphens.');
  }

  return normalized;
}

export function generateWorkspaceSlug(name: string): string {
  let base: string | undefined;

  try {
    base = normalizeWorkspaceSlug(name);
  } catch {
    base = undefined;
  }

  return base || `workspace-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateWorkspaceApiKey(): string {
  const entropy = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  return `bolt_${entropy.slice(0, 48)}`;
}

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(digest));

  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createWorkspace(
  context: AppLoadContext,
  { name, slug }: { name: string; slug?: string },
): Promise<{ workspace: WorkspaceRecord; apiKey: string }> {
  const db = getDatabase(context);
  const workspaceSlug = slug ? normalizeWorkspaceSlug(slug) : generateWorkspaceSlug(name);

  const existing = await db
    .prepare('SELECT id FROM workspaces WHERE slug = ?')
    .bind(workspaceSlug)
    .first<{ id: string }>();

  if (existing) {
    throw new Error('Workspace slug already exists. Choose a different slug.');
  }

  const workspaceId = crypto.randomUUID();
  const apiKey = generateWorkspaceApiKey();
  const apiKeyHash = await hashApiKey(apiKey);

  await db
    .prepare('INSERT INTO workspaces (id, slug, name) VALUES (?, ?, ?)')
    .bind(workspaceId, workspaceSlug, name)
    .run();

  await db
    .prepare('INSERT INTO workspace_api_keys (id, workspace_id, key_hash) VALUES (?, ?, ?)')
    .bind(crypto.randomUUID(), workspaceId, apiKeyHash)
    .run();

  const workspace = await db
    .prepare('SELECT id, slug, name, created_at FROM workspaces WHERE id = ?')
    .bind(workspaceId)
    .first<WorkspaceRecord>();

  if (!workspace) {
    throw new Error('Failed to load workspace after creation.');
  }

  return { workspace, apiKey };
}

export async function verifyWorkspaceApiKey(
  context: AppLoadContext,
  apiKey: string,
): Promise<{ workspace: WorkspaceRecord; apiKeyId: string } | null> {
  const db = getDatabase(context);
  const hashed = await hashApiKey(apiKey);

  const record = await db
    .prepare(
      `SELECT k.id as apiKeyId, w.id, w.slug, w.name, w.created_at
       FROM workspace_api_keys k
       INNER JOIN workspaces w ON w.id = k.workspace_id
       WHERE k.key_hash = ?`,
    )
    .bind(hashed)
    .first<{ apiKeyId: string } & WorkspaceRecord>();

  if (!record) {
    return null;
  }

  await db
    .prepare('UPDATE workspace_api_keys SET last_used_at = datetime("now") WHERE id = ?')
    .bind(record.apiKeyId)
    .run();

  const { apiKeyId, ...workspace } = record;

  return { workspace, apiKeyId };
}

export async function ensureWorkspaceMember(
  context: AppLoadContext,
  workspaceId: string,
  email: string,
): Promise<WorkspaceMemberRecord> {
  const db = getDatabase(context);
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db
    .prepare(
      'SELECT id, workspace_id, email, role, created_at, updated_at FROM workspace_members WHERE workspace_id = ? AND email = ?',
    )
    .bind(workspaceId, normalizedEmail)
    .first<WorkspaceMemberRecord>();

  if (existing) {
    await db.prepare('UPDATE workspace_members SET updated_at = datetime("now") WHERE id = ?').bind(existing.id).run();

    return { ...existing, email: normalizedEmail };
  }

  const memberId = crypto.randomUUID();

  await db
    .prepare('INSERT INTO workspace_members (id, workspace_id, email, role) VALUES (?, ?, ?, ?)')
    .bind(memberId, workspaceId, normalizedEmail, 'member')
    .run();

  const created = await db
    .prepare('SELECT id, workspace_id, email, role, created_at, updated_at FROM workspace_members WHERE id = ?')
    .bind(memberId)
    .first<WorkspaceMemberRecord>();

  if (!created) {
    throw new Error('Failed to create workspace member');
  }

  return created;
}

export async function getWorkspaceById(context: AppLoadContext, id: string): Promise<WorkspaceRecord | null> {
  const db = getDatabase(context);

  return db.prepare('SELECT id, slug, name, created_at FROM workspaces WHERE id = ?').bind(id).first<WorkspaceRecord>();
}

export async function getWorkspaceMemberById(
  context: AppLoadContext,
  id: string,
): Promise<WorkspaceMemberRecord | null> {
  const db = getDatabase(context);

  return db
    .prepare('SELECT id, workspace_id, email, role, created_at, updated_at FROM workspace_members WHERE id = ?')
    .bind(id)
    .first<WorkspaceMemberRecord>();
}
