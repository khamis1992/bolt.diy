import { createCookieSessionStorage } from '@remix-run/cloudflare';
import type { AppLoadContext } from '@remix-run/cloudflare';
import { getWorkspaceById, getWorkspaceMemberById, isSaasEnabled } from './saas.server';

interface WorkspaceSessionData {
  workspaceId: string;
  memberId: string;
}

let cachedSessionSecret: string | null = null;
let cachedSessionStorage: ReturnType<typeof createCookieSessionStorage<WorkspaceSessionData>> | null = null;

function resolveSessionSecret(context: AppLoadContext): string | undefined {
  const cloudflareSecret = context.cloudflare?.env?.SESSION_SECRET;

  if (cloudflareSecret) {
    return cloudflareSecret;
  }

  if (typeof process !== 'undefined' && process.env?.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  return undefined;
}

function getSessionStorage(context: AppLoadContext) {
  const sessionSecret = resolveSessionSecret(context);

  if (!sessionSecret) {
    throw new Error('SESSION_SECRET is not configured in the Cloudflare bindings or process environment.');
  }

  if (cachedSessionStorage && cachedSessionSecret === sessionSecret) {
    return cachedSessionStorage;
  }

  cachedSessionSecret = sessionSecret;
  cachedSessionStorage = createCookieSessionStorage<WorkspaceSessionData>({
    cookie: {
      name: '__bolt_session',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      secrets: [sessionSecret],
    },
  });

  return cachedSessionStorage;
}

export async function getSession(request: Request, context: AppLoadContext) {
  const storage = getSessionStorage(context);
  const cookieHeader = request.headers.get('Cookie');

  return storage.getSession(cookieHeader);
}

export async function commitSession(session: Awaited<ReturnType<typeof getSession>>, context: AppLoadContext) {
  const storage = getSessionStorage(context);

  return storage.commitSession(session);
}

export async function destroySession(session: Awaited<ReturnType<typeof getSession>>, context: AppLoadContext) {
  const storage = getSessionStorage(context);

  return storage.destroySession(session);
}

export async function getWorkspaceSession(
  request: Request,
  context: AppLoadContext,
): Promise<{
  workspace: NonNullable<Awaited<ReturnType<typeof getWorkspaceById>>>;
  member: NonNullable<Awaited<ReturnType<typeof getWorkspaceMemberById>>>;
} | null> {
  if (!isSaasEnabled(context.cloudflare?.env)) {
    return null;
  }

  const session = await getSession(request, context);
  const workspaceId = session.get('workspaceId');
  const memberId = session.get('memberId');

  if (!workspaceId || !memberId) {
    return null;
  }

  const [workspace, member] = await Promise.all([
    getWorkspaceById(context, workspaceId),
    getWorkspaceMemberById(context, memberId),
  ]);

  if (!workspace || !member) {
    return null;
  }

  return { workspace, member };
}

export async function requireWorkspaceSession(
  request: Request,
  context: AppLoadContext,
): Promise<NonNullable<Awaited<ReturnType<typeof getWorkspaceSession>>>> {
  const session = await getWorkspaceSession(request, context);

  if (!session) {
    throw new Response('Authentication required', { status: 401 });
  }

  return session;
}
