import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createSupabaseServerClient } from '~/lib/supabase.server';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, name, description, framework, files } = body;

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Check if project exists
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', session.user.id)
      .single();

    let project;

    if (existingProject) {
      // Update existing project
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: name || 'Untitled Project',
          description,
          framework,
          last_opened_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      project = data;
    } else {
      // Create new project
      const { data, error } = await supabase
        .from('projects')
        .insert({
          id: projectId,
          user_id: session.user.id,
          name: name || 'Untitled Project',
          description,
          framework,
          visibility: 'private',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      project = data;
    }

    // Save files if provided
    if (files && typeof files === 'object') {
      // Get existing files
      const { data: existingFiles } = await supabase
        .from('project_files')
        .select('path')
        .eq('project_id', projectId);

      const existingPaths = new Set(existingFiles?.map((f) => f.path) || []);

      // Prepare files for upsert
      const filesToUpsert = Object.entries(files)
        .filter(([_, dirent]: [string, any]) => dirent?.type === 'file')
        .map(([filePath, dirent]: [string, any]) => ({
          project_id: projectId,
          path: filePath,
          content: dirent.content || '',
          size: dirent.content?.length || 0,
          mime_type: getMimeType(filePath),
          is_binary: dirent.isBinary || false,
        }));

      // Upsert files in batches (Supabase has a limit)
      const batchSize = 100;

      for (let i = 0; i < filesToUpsert.length; i += batchSize) {
        const batch = filesToUpsert.slice(i, i + batchSize);
        const { error } = await supabase.from('project_files').upsert(batch, {
          onConflict: 'project_id,path',
        });

        if (error) {
          throw error;
        }
      }

      // Delete files that no longer exist
      const currentPaths = new Set(Object.keys(files));
      const pathsToDelete = Array.from(existingPaths).filter((path) => !currentPaths.has(path));

      if (pathsToDelete.length > 0) {
        const { error } = await supabase
          .from('project_files')
          .delete()
          .eq('project_id', projectId)
          .in('path', pathsToDelete);

        if (error) {
          throw error;
        }
      }
    }

    return json({
      success: true,
      project,
    });
  } catch (error: any) {
    console.error('Failed to save project:', error);
    return json({ error: error.message || 'Failed to save project' }, { status: 500 });
  }
}

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    js: 'application/javascript',
    jsx: 'application/javascript',
    ts: 'application/typescript',
    tsx: 'application/typescript',
    json: 'application/json',
    html: 'text/html',
    css: 'text/css',
    scss: 'text/css',
    md: 'text/markdown',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

