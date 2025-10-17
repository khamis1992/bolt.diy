import type { AppLoadContext, ServerBuild } from '@remix-run/cloudflare';
import { createPagesFunctionHandler } from '@remix-run/cloudflare-pages';

export const onRequest: PagesFunction = async (context) => {
  // @ts-expect-error The build artifact is generated at runtime by the Remix build step
  const serverBuild = (await import('../build/server')) as unknown as ServerBuild;

  const handler = createPagesFunctionHandler({
    build: serverBuild,
    getLoadContext(eventContext) {
      return {
        cloudflare: eventContext,
      } as unknown as AppLoadContext;
    },
  });

  return handler(context);
};
