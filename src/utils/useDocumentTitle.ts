import { useEffect } from 'react';

const SITE_NAME = 'Otanime';
const DEFAULT_TITLE = 'Otanime - Streaming Anime Sub Indo';

// Sets the browser tab title while the page is mounted; restores the default on unmount.
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} - ${SITE_NAME}` : DEFAULT_TITLE;
  }, [title]);

  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, []);
}
