import { json } from '@remix-run/cloudflare';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { withSecurity } from '~/lib/security';
import { ensureWorkspaceMember, isSaasEnabled, verifyWorkspaceApiKey } from '~/lib/server/saas.server';
import { commitSession, destroySession, getSession, getWorkspaceSession } from '~/lib/server/session.server';

interface LoginPayload {
  apiKey?: string;
  email?: string;
}

export const loader = withSecurity(
  async ({ request, context }: LoaderFunctionArgs) => {
    const env = context.cloudflare?.env;

    if (!env || !isSaasEnabled(env)) {
      return json({ saasEnabled: false });
    }

    const session = await getWorkspaceSession(request, context);

    return json({
      saasEnabled: true,
      session: session
        ? {
            workspace: {
              id: session.workspace.id,
              slug: session.workspace.slug,
              name: session.workspace.name,
            },
            member: {
              id: session.member.id,
              email: session.member.email,
              role: session.member.role,
            },
          }
        : null,
    });
  },
  {
    allowedMethods: ['GET'],
  },
);

async function handleLogin(request: Request, context: ActionFunctionArgs['context']) {
  const env = context.cloudflare?.env;

  if (!env || !isSaasEnabled(env)) {
    return json({ error: 'SaaS mode is disabled' }, { status: 403 });
  }

  let payload: LoginPayload;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload.apiKey || !payload.email) {
    return json({ error: 'Both apiKey and email are required' }, { status: 400 });
  }

  const verification = await verifyWorkspaceApiKey(context, payload.apiKey);

  if (!verification) {
    return json({ error: 'Invalid API key' }, { status: 401 });
  }

  const member = await ensureWorkspaceMember(context, verification.workspace.id, payload.email);
  const session = await getSession(request, context);

  session.set('workspaceId', verification.workspace.id);
  session.set('memberId', member.id);

  const setCookieHeader = await commitSession(session, context);

  return new Response(
    JSON.stringify({
      workspace: {
        id: verification.workspace.id,
        slug: verification.workspace.slug,
        name: verification.workspace.name,
      },
      member: {
        id: member.id,
        email: member.email,
        role: member.role,
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setCookieHeader,
      },
    },
  );
}

async function handleLogout(request: Request, context: ActionFunctionArgs['context']) {
  const env = context.cloudflare?.env;

  if (!env || !isSaasEnabled(env)) {
    return json({ success: true });
  }

  const session = await getSession(request, context);
  const setCookieHeader = await destroySession(session, context);

  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setCookieHeader,
    },
  });
}

export const action = withSecurity(
  async ({ request, context }: ActionFunctionArgs) => {
    switch (request.method) {
      case 'POST':
        return handleLogin(request, context);
      case 'DELETE':
        return handleLogout(request, context);
      default:
        return new Response('Method not allowed', { status: 405 });
    }
  },
  {
    allowedMethods: ['POST', 'DELETE'],
  },
);
