import { useEffect } from 'react';

const VERSION_CHECK_INTERVAL_MS = 60000;

function normalizeAssetPath(source: string | null) {
  if (!source) {
    return null;
  }

  try {
    const parsedUrl = new URL(source, window.location.origin);
    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return null;
  }
}

function getLoadedEntrypointPath() {
  const loadedEntrypoint = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return normalizeAssetPath(loadedEntrypoint?.src ?? null);
}

function extractEntrypointFromHtml(html: string) {
  const scriptMatch = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/i);
  return normalizeAssetPath(scriptMatch?.[1] ?? null);
}

async function detectNewVersion() {
  const loadedEntrypointPath = getLoadedEntrypointPath();

  if (!loadedEntrypointPath) {
    return false;
  }

  const response = await fetch('/index.html', {
    cache: 'no-store',
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    return false;
  }

  const html = await response.text();
  const latestEntrypointPath = extractEntrypointFromHtml(html);

  if (!latestEntrypointPath) {
    return false;
  }

  return latestEntrypointPath !== loadedEntrypointPath;
}

export function AppVersionWatcher() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }

    let isMounted = true;

    const checkVersion = async () => {
      try {
        const hasNewVersion = await detectNewVersion();

        if (hasNewVersion && isMounted) {
          window.location.reload();
        }
      } catch {
        // Ignore transient network errors and retry on next interval.
      }
    };

    const intervalId = window.setInterval(() => {
      void checkVersion();
    }, VERSION_CHECK_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}