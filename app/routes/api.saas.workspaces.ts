import { json } from '@remix-run/cloudflare';
import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { withSecurity } from '~/lib/security';
import { createWorkspace, isSaasEnabled } from '~/lib/server/saas.server';

interface CreateWorkspacePayload {
  name: string;
  slug?: string;
}

function requireAdminToken(request: Request, env: Env) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token || token !== env.SAAS_ADMIN_TOKEN) {
    throw new Response('Invalid or missing admin token', { status: 401 });
  }
}

async function handleCreateWorkspace({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare?.env;

  if (!env || !isSaasEnabled(env)) {
    return json({ error: 'SaaS mode is disabled' }, { status: 403 });
  }

  requireAdminToken(request, env);

  let payload: CreateWorkspacePayload;

  try {
    payload = (await request.json()) as CreateWorkspacePayload;
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload?.name) {
    return json({ error: 'Workspace name is required' }, { status: 400 });
  }

  try {
    const { workspace, apiKey } = await createWorkspace(context, {
      name: payload.name.trim(),
      slug: payload.slug?.trim(),
    });

    return json(
      {
        workspace: {
          id: workspace.id,
          slug: workspace.slug,
          name: workspace.name,
        },
        apiKey,
      },
      { status: 201 },
    );
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed to create workspace' }, { status: 400 });
  }
}

export const action = withSecurity(handleCreateWorkspace, {
  allowedMethods: ['POST'],
});
