import { atom } from 'nanostores';
import { getSupabaseClient, isBrowser } from '~/lib/supabase.client';
import { getAuthState } from './auth';
import type { Database } from '~/lib/supabase.server';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
}

const initialState: ProjectsState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  isSyncing: false,
  lastSyncTime: null,
};

export const projectsStore = atom<ProjectsState>(initialState);

/**
 * Load all projects for the current user
 */
export async function loadProjects() {
  if (!isBrowser) {
    return;
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    return;
  }

  projectsStore.set({ ...projectsStore.get(), isLoading: true });

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', authState.user.id)
      .eq('is_archived', false)
      .order('last_opened_at', { ascending: false });

    if (error) {
      throw error;
    }

    projectsStore.set({
      ...projectsStore.get(),
      projects: data || [],
      isLoading: false,
    });
  } catch (error) {
    console.error('Failed to load projects:', error);
    projectsStore.set({ ...projectsStore.get(), isLoading: false });
  }
}

/**
 * Create a new project
 */
export async function createProject(project: ProjectInsert): Promise<Project | null> {
  if (!isBrowser) {
    return null;
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    throw new Error('User must be authenticated to create a project');
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...project,
        user_id: authState.user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Add to local state
    const currentState = projectsStore.get();
    projectsStore.set({
      ...currentState,
      projects: [data, ...currentState.projects],
      currentProject: data,
    });

    return data;
  } catch (error) {
    console.error('Failed to create project:', error);
    throw error;
  }
}

/**
 * Update an existing project
 */
export async function updateProject(projectId: string, updates: ProjectUpdate): Promise<void> {
  if (!isBrowser) {
    return;
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    throw new Error('User must be authenticated to update a project');
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .eq('user_id', authState.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update local state
    const currentState = projectsStore.get();
    projectsStore.set({
      ...currentState,
      projects: currentState.projects.map((p) => (p.id === projectId ? data : p)),
      currentProject: currentState.currentProject?.id === projectId ? data : currentState.currentProject,
    });
  } catch (error) {
    console.error('Failed to update project:', error);
    throw error;
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  if (!isBrowser) {
    return;
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    throw new Error('User must be authenticated to delete a project');
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', authState.user.id);

    if (error) {
      throw error;
    }

    // Update local state
    const currentState = projectsStore.get();
    projectsStore.set({
      ...currentState,
      projects: currentState.projects.filter((p) => p.id !== projectId),
      currentProject: currentState.currentProject?.id === projectId ? null : currentState.currentProject,
    });
  } catch (error) {
    console.error('Failed to delete project:', error);
    throw error;
  }
}

/**
 * Archive a project
 */
export async function archiveProject(projectId: string): Promise<void> {
  await updateProject(projectId, { is_archived: true });
}

/**
 * Unarchive a project
 */
export async function unarchiveProject(projectId: string): Promise<void> {
  await updateProject(projectId, { is_archived: false });
}

/**
 * Load a specific project and set it as current
 */
export async function loadProject(projectId: string): Promise<Project | null> {
  if (!isBrowser) {
    return null;
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    return null;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', authState.user.id)
      .single();

    if (error) {
      throw error;
    }

    // Update last_opened_at
    await updateProject(projectId, { last_opened_at: new Date().toISOString() });

    // Set as current project
    projectsStore.set({
      ...projectsStore.get(),
      currentProject: data,
    });

    return data;
  } catch (error) {
    console.error('Failed to load project:', error);
    return null;
  }
}

/**
 * Sync project files to Supabase
 */
export async function syncProjectFiles(projectId: string, files: Record<string, any>): Promise<void> {
  if (!isBrowser) {
    return;
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    throw new Error('User must be authenticated to sync files');
  }

  projectsStore.set({ ...projectsStore.get(), isSyncing: true });

  try {
    const supabase = getSupabaseClient();

    // Get existing files for this project
    const { data: existingFiles } = await supabase
      .from('project_files')
      .select('path')
      .eq('project_id', projectId);

    const existingPaths = new Set(existingFiles?.map((f) => f.path) || []);

    // Prepare files for upsert
    const filesToUpsert = Object.entries(files)
      .filter(([_, dirent]) => dirent?.type === 'file')
      .map(([filePath, dirent]) => ({
        project_id: projectId,
        path: filePath,
        content: dirent.content || '',
        size: dirent.content?.length || 0,
        mime_type: getMimeType(filePath),
        is_binary: dirent.isBinary || false,
      }));

    // Upsert files
    if (filesToUpsert.length > 0) {
      const { error } = await supabase.from('project_files').upsert(filesToUpsert, {
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

    projectsStore.set({
      ...projectsStore.get(),
      isSyncing: false,
      lastSyncTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to sync project files:', error);
    projectsStore.set({ ...projectsStore.get(), isSyncing: false });
    throw error;
  }
}

/**
 * Load project files from Supabase
 */
export async function loadProjectFiles(projectId: string): Promise<Record<string, any>> {
  if (!isBrowser) {
    return {};
  }

  const authState = getAuthState();

  if (!authState.isAuthenticated || !authState.user) {
    return {};
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      throw error;
    }

    // Convert to file map format
    const fileMap: Record<string, any> = {};

    for (const file of data || []) {
      fileMap[file.path] = {
        type: 'file',
        content: file.content,
        isBinary: file.is_binary,
      };
    }

    return fileMap;
  } catch (error) {
    console.error('Failed to load project files:', error);
    return {};
  }
}

/**
 * Get MIME type from file path
 */
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

/**
 * Auto-save project periodically
 */
let autoSaveInterval: NodeJS.Timeout | null = null;

export function startAutoSave(projectId: string, getFiles: () => Record<string, any>, intervalMs: number = 30000) {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }

  autoSaveInterval = setInterval(async () => {
    const authState = getAuthState();

    if (!authState.isAuthenticated) {
      return;
    }

    try {
      const files = getFiles();
      await syncProjectFiles(projectId, files);
      console.log('Auto-saved project:', projectId);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, intervalMs);
}

export function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}

