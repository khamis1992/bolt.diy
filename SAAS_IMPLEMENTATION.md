# bolt.diy SaaS Implementation Guide

## Overview

This document provides a comprehensive guide to the SaaS features that have been implemented in bolt.diy, transforming it from a local-only development tool into a multi-user cloud-based platform similar to bolt.new.

## What's Been Implemented

### 1. Authentication System ✅

**Files Created:**
- `app/lib/supabase.server.ts` - Server-side Supabase client
- `app/lib/supabase.client.ts` - Browser-side Supabase client
- `app/lib/auth.middleware.ts` - Authentication middleware for protected routes
- `app/lib/stores/auth.ts` - Authentication state management with Nanostores
- `app/routes/auth.signin.tsx` - Sign in page
- `app/routes/auth.signup.tsx` - Sign up page
- `app/routes/auth.signout.tsx` - Sign out action

**Features:**
- Email/password authentication
- OAuth support (GitHub, Google) - UI ready, needs provider configuration
- Session management
- Protected routes
- Auto-initialization on app startup

**Design:**
- Uses existing bolt.diy design system
- Consistent with the current UI patterns
- Responsive layout

### 2. Dashboard & Projects Management ✅

**Files Created:**
- `app/routes/dashboard.tsx` - User dashboard with stats and recent projects
- `app/routes/projects.tsx` - Projects listing with filtering and search

**Features:**
- User statistics (total projects, AI requests, tokens used, subscription tier)
- Recent projects display
- Project filtering (all, active, archived, public, private)
- Project search
- Project cards with thumbnails
- Quick access to create new projects

### 3. Project Synchronization ✅

**Files Created:**
- `app/lib/stores/projects.ts` - Projects state management
- `app/routes/api.projects.save.ts` - API endpoint for saving projects
- `app/routes/api.projects.load.ts` - API endpoint for loading projects

**Features:**
- Create, read, update, delete projects
- Sync project files to Supabase
- Auto-save functionality (configurable interval)
- Load projects from cloud
- Archive/unarchive projects
- Track last opened time
- MIME type detection for files

### 4. Chat History & Usage Tracking ✅

**Files Created:**
- `app/lib/stores/chatHistory.ts` - Chat history management
- `app/lib/stores/usage.ts` - Usage tracking and analytics
- `app/routes/api.chat.save.ts` - API endpoint for saving chat history
- `app/routes/api.usage.log.ts` - API endpoint for logging usage

**Features:**
- Save chat conversations to cloud
- Track AI requests (model, provider, tokens, cost)
- Track deployments
- Track file uploads
- Track project creation/deletion
- Calculate usage statistics
- Monthly usage tracking

### 5. Database Schema ✅

**Supabase Project:** `ai` (ID: avogdxfjgkxrswdmhzff)

**Tables Created:**
- `users` - Extended user profiles with subscription info
- `projects` - User projects with metadata
- `project_files` - Files within projects
- `chat_history` - AI chat conversations
- `usage_logs` - Usage tracking and analytics
- `subscriptions` - Subscription management (ready for Stripe integration)
- `teams` - Team management (for future use)
- `team_members` - Team membership (for future use)
- `project_shares` - Project sharing (for future use)
- `api_keys` - User API keys (for future use)

**Database Features:**
- Row Level Security (RLS) policies on all tables
- Automatic triggers for updated_at timestamps
- Automatic user profile creation on signup
- Automatic project count updates
- Monthly AI request reset
- Views for analytics (user_stats, project_stats)

## How to Use

### 1. Environment Setup

Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=https://avogdxfjgkxrswdmhzff.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

The Supabase URL and anon key are already configured for the `ai` project.

### 2. Enable OAuth Providers (Optional)

To enable GitHub and Google OAuth:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/avogdxfjgkxrswdmhzff)
2. Navigate to Authentication → Providers
3. Enable GitHub OAuth:
   - Add your GitHub OAuth App credentials
   - Set redirect URL: `https://avogdxfjgkxrswdmhzff.supabase.co/auth/v1/callback`
4. Enable Google OAuth:
   - Add your Google OAuth credentials
   - Set redirect URL: `https://avogdxfjgkxrswdmhzff.supabase.co/auth/v1/callback`

### 3. Create Storage Buckets

Create these storage buckets in Supabase Dashboard → Storage:

1. `project-files` (private) - For large project files
2. `user-avatars` (public) - For user profile pictures
3. `project-thumbnails` (public) - For project preview images
4. `exports` (private) - For exported projects

### 4. Run the Application

```bash
# Install dependencies (if not already done)
pnpm install

# Start development server
pnpm run dev
```

Visit:
- `http://localhost:5173/` - Main application (chat interface)
- `http://localhost:5173/auth/signin` - Sign in
- `http://localhost:5173/auth/signup` - Sign up
- `http://localhost:5173/dashboard` - Dashboard (requires authentication)
- `http://localhost:5173/projects` - Projects list (requires authentication)

## Integration with Existing Code

### How Authentication Works

1. **App Initialization** (`app/root.tsx`):
   - Calls `initializeAuth()` on startup
   - Listens for auth state changes
   - Updates `authStore` with current user

2. **Protected Routes**:
   - Use `requireAuth(request)` in loader functions
   - Automatically redirects to `/auth/signin` if not authenticated
   - Example:
     ```typescript
     export async function loader({ request }: LoaderFunctionArgs) {
       const { user } = await requireAuth(request);
       // ... rest of loader
     }
     ```

3. **Client-Side Auth Check**:
   ```typescript
   import { useStore } from '@nanostores/react';
   import { authStore } from '~/lib/stores/auth';
   
   function MyComponent() {
     const auth = useStore(authStore);
     
     if (!auth.isAuthenticated) {
       return <div>Please sign in</div>;
     }
     
     return <div>Welcome {auth.user?.email}</div>;
   }
   ```

### How Project Sync Works

1. **Creating a Project**:
   ```typescript
   import { createProject } from '~/lib/stores/projects';
   
   const project = await createProject({
     name: 'My Project',
     description: 'A cool project',
     framework: 'react',
     visibility: 'private',
   });
   ```

2. **Saving Project Files**:
   ```typescript
   import { syncProjectFiles } from '~/lib/stores/projects';
   
   // Get files from workbench
   const files = workbenchStore.files.get();
   
   // Sync to Supabase
   await syncProjectFiles(projectId, files);
   ```

3. **Auto-Save**:
   ```typescript
   import { startAutoSave, stopAutoSave } from '~/lib/stores/projects';
   
   // Start auto-save (saves every 30 seconds)
   startAutoSave(projectId, () => workbenchStore.files.get(), 30000);
   
   // Stop auto-save when leaving project
   stopAutoSave();
   ```

4. **Loading a Project**:
   ```typescript
   import { loadProject, loadProjectFiles } from '~/lib/stores/projects';
   
   // Load project metadata
   const project = await loadProject(projectId);
   
   // Load project files
   const files = await loadProjectFiles(projectId);
   
   // Apply files to workbench
   workbenchStore.files.set(files);
   ```

### How Usage Tracking Works

1. **Log AI Request**:
   ```typescript
   import { logAIRequest } from '~/lib/stores/usage';
   
   await logAIRequest(
     projectId,
     'gpt-4',
     'openai',
     1500, // tokens
     0.03  // cost in USD
   );
   ```

2. **Log Deployment**:
   ```typescript
   import { logDeployment } from '~/lib/stores/usage';
   
   await logDeployment(projectId, 'vercel', {
     url: 'https://myapp.vercel.app',
   });
   ```

3. **Load Usage Stats**:
   ```typescript
   import { loadUsageStats } from '~/lib/stores/usage';
   
   await loadUsageStats();
   // Stats are now in usageStore
   ```

### How Chat History Works

1. **Save Chat**:
   ```typescript
   import { saveChatHistory } from '~/lib/stores/chatHistory';
   
   await saveChatHistory(
     projectId,
     messages, // array of chat messages
     'gpt-4',
     'openai',
     1500, // tokens
     0.03  // cost
   );
   ```

2. **Update Chat**:
   ```typescript
   import { updateChatHistory } from '~/lib/stores/chatHistory';
   
   await updateChatHistory(
     historyId,
     updatedMessages,
     2000, // new token count
     0.04  // new cost
   );
   ```

3. **Load Chat History**:
   ```typescript
   import { loadChatHistories } from '~/lib/stores/chatHistory';
   
   const histories = await loadChatHistories(projectId);
   ```

## API Endpoints

### Projects

**POST `/api/projects/save`**
- Save or update a project
- Body: `{ projectId, name, description, framework, files }`
- Returns: `{ success, project }`

**GET `/api/projects/load?projectId=xxx`**
- Load a project and its files
- Returns: `{ success, project, files }`

### Chat

**POST `/api/chat/save`**
- Save or update chat history
- Body: `{ projectId, messages, modelUsed, provider, tokensUsed, cost, historyId? }`
- Returns: `{ success, chatHistory }`

### Usage

**POST `/api/usage/log`**
- Log a usage event
- Body: `{ projectId?, actionType, modelUsed?, provider?, tokensUsed?, cost?, metadata? }`
- Returns: `{ success, log }`

## Next Steps

### Immediate Next Steps

1. **Configure OAuth Providers**:
   - Set up GitHub OAuth in Supabase
   - Set up Google OAuth in Supabase

2. **Create Storage Buckets**:
   - Create the required storage buckets in Supabase

3. **Integrate with Workbench**:
   - Add auto-save to the workbench
   - Add "Save to Cloud" button
   - Add "Load from Cloud" functionality
   - Show sync status indicator

4. **Integrate with Chat**:
   - Save chat messages automatically
   - Add chat history sidebar
   - Allow loading previous chats

5. **Add Usage Tracking**:
   - Track AI requests in the chat API
   - Track deployments in deployment actions
   - Show usage stats in dashboard

### Future Enhancements

1. **Subscription System**:
   - Integrate Stripe for payments
   - Implement subscription tiers (Free, Pro, Enterprise)
   - Add usage limits per tier
   - Add billing page

2. **Project Sharing**:
   - Implement project sharing with specific users
   - Add public project links
   - Add collaboration features (real-time editing)

3. **Team Management**:
   - Create teams
   - Add team members
   - Share projects with teams
   - Team billing

4. **API Keys**:
   - Generate API keys for programmatic access
   - API documentation
   - Rate limiting

5. **Analytics Dashboard**:
   - Detailed usage charts
   - Cost breakdown by model
   - Project activity timeline
   - Export reports

6. **Project Templates**:
   - Save projects as templates
   - Share templates with community
   - Template marketplace

7. **Version Control**:
   - Project version history
   - Restore previous versions
   - Compare versions

8. **Notifications**:
   - Email notifications for important events
   - In-app notifications
   - Webhook support

## Architecture Decisions

### Why Supabase?

- **Built on PostgreSQL**: Reliable, scalable, and feature-rich
- **Row Level Security**: Built-in security at the database level
- **Real-time subscriptions**: For future collaboration features
- **Storage**: Integrated file storage
- **Authentication**: Complete auth system out of the box
- **Edge Functions**: For serverless backend logic
- **Free tier**: Generous free tier for development

### Why Nanostores?

- **Already in use**: bolt.diy already uses Nanostores
- **Lightweight**: Only 300 bytes
- **Framework agnostic**: Works with Remix/React
- **Simple API**: Easy to learn and use
- **TypeScript support**: Full type safety

### Why Remix?

- **Already in use**: bolt.diy is built with Remix
- **Server-side rendering**: Better SEO and performance
- **Nested routing**: Clean URL structure
- **Data loading**: Built-in data fetching patterns
- **Form handling**: Progressive enhancement
- **TypeScript**: Full type safety

## Database Schema Details

### users Table

Extends Supabase auth.users with additional profile and subscription information.

**Columns:**
- `id` - UUID (primary key, references auth.users)
- `email` - User email
- `full_name` - User's full name
- `avatar_url` - Profile picture URL
- `subscription_tier` - 'free' | 'pro' | 'enterprise'
- `subscription_status` - 'active' | 'cancelled' | 'expired' | 'trialing'
- `subscription_period_start` - Subscription start date
- `subscription_period_end` - Subscription end date
- `total_projects` - Total number of projects (auto-updated)
- `total_ai_requests` - Total AI requests (all time)
- `monthly_ai_requests` - AI requests this month (auto-reset)
- `last_request_reset` - Last time monthly counter was reset
- `created_at` - Account creation date
- `updated_at` - Last update date

**Triggers:**
- Auto-create profile on signup
- Auto-update `updated_at` on changes
- Reset monthly counters on the 1st of each month

### projects Table

Stores user projects with metadata.

**Columns:**
- `id` - UUID (primary key)
- `user_id` - UUID (foreign key to users)
- `name` - Project name
- `description` - Project description
- `framework` - Framework used (react, vue, etc.)
- `template` - Template used
- `visibility` - 'private' | 'public' | 'unlisted'
- `thumbnail_url` - Project thumbnail
- `is_archived` - Whether project is archived
- `last_opened_at` - Last time project was opened
- `created_at` - Creation date
- `updated_at` - Last update date

**Indexes:**
- `user_id` - For fast user project queries
- `visibility` - For public project discovery

**RLS Policies:**
- Users can only see their own private projects
- Public projects are visible to everyone
- Only project owner can update/delete

### project_files Table

Stores files within projects.

**Columns:**
- `id` - UUID (primary key)
- `project_id` - UUID (foreign key to projects)
- `path` - File path within project
- `content` - File content (text)
- `size` - File size in bytes
- `mime_type` - MIME type
- `is_binary` - Whether file is binary
- `storage_url` - URL for large binary files
- `created_at` - Creation date
- `updated_at` - Last update date

**Indexes:**
- `project_id` - For fast project file queries
- `(project_id, path)` - Unique constraint

**RLS Policies:**
- Users can only access files of their own projects

### chat_history Table

Stores AI chat conversations.

**Columns:**
- `id` - UUID (primary key)
- `project_id` - UUID (foreign key to projects)
- `user_id` - UUID (foreign key to users)
- `messages` - JSONB array of messages
- `model_used` - AI model name
- `provider` - AI provider name
- `tokens_used` - Total tokens used
- `cost` - Total cost in USD
- `created_at` - Creation date
- `updated_at` - Last update date

**Indexes:**
- `project_id` - For fast project chat queries
- `user_id` - For user analytics

**RLS Policies:**
- Users can only access their own chat history

### usage_logs Table

Tracks user actions and API usage.

**Columns:**
- `id` - UUID (primary key)
- `user_id` - UUID (foreign key to users)
- `project_id` - UUID (foreign key to projects, nullable)
- `action_type` - 'ai_request' | 'deployment' | 'file_upload' | 'project_create' | 'project_delete'
- `model_used` - AI model name (for AI requests)
- `provider` - Service provider name
- `tokens_used` - Tokens used (for AI requests)
- `cost` - Cost in USD
- `metadata` - JSONB for additional data
- `created_at` - Event timestamp

**Indexes:**
- `user_id` - For user analytics
- `created_at` - For time-based queries

**RLS Policies:**
- Users can only see their own logs

## Security Considerations

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Public projects are accessible to everyone
- Shared projects are accessible to collaborators
- Admin operations require proper permissions

### API Security

- All API endpoints check authentication
- Session tokens are validated on every request
- CORS is configured properly
- Rate limiting should be added (future enhancement)

### Data Privacy

- User emails are not exposed in public APIs
- Private projects are never visible to other users
- Chat history is private to the user
- Usage logs are private to the user

### Best Practices

1. **Never expose service role key**: Only use anon key in client-side code
2. **Validate all inputs**: Both client and server side
3. **Use prepared statements**: Supabase client handles this
4. **Limit data exposure**: Only select needed columns
5. **Audit logs**: Usage logs serve as audit trail

## Troubleshooting

### Authentication Issues

**Problem**: User can't sign in
- Check if email is confirmed
- Check Supabase auth logs
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

**Problem**: Session expires too quickly
- Check Supabase JWT expiry settings
- Implement refresh token logic

### Project Sync Issues

**Problem**: Files not saving
- Check network tab for API errors
- Verify user is authenticated
- Check file size limits
- Check Supabase storage quotas

**Problem**: Auto-save not working
- Check if `startAutoSave()` was called
- Check browser console for errors
- Verify project ID is valid

### Database Issues

**Problem**: RLS policy blocking query
- Check if user is authenticated
- Verify user_id matches
- Check RLS policies in Supabase dashboard

**Problem**: Slow queries
- Add indexes for frequently queried columns
- Use `.select()` to limit columns
- Paginate large result sets

## Deployment

### Environment Variables

For production deployment, set these environment variables:

```env
VITE_SUPABASE_URL=https://avogdxfjgkxrswdmhzff.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

### Recommended Platforms

1. **Vercel** (Recommended):
   - Automatic deployments from GitHub
   - Edge functions support
   - Free SSL
   - Great performance

2. **Netlify**:
   - Similar to Vercel
   - Easy setup
   - Good free tier

3. **Cloudflare Pages**:
   - Built for Remix
   - Global CDN
   - Serverless functions

### Deployment Steps (Vercel)

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy!

Vercel will automatically:
- Install dependencies
- Build the project
- Deploy to production
- Set up SSL certificate

## Support

For questions or issues:
- Check this documentation first
- Review Supabase documentation: https://supabase.com/docs
- Review Remix documentation: https://remix.run/docs
- Check bolt.diy documentation: https://stackblitz-labs.github.io/bolt.diy/

## License

Same as bolt.diy (MIT License)

