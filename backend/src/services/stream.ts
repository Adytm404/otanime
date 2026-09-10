import { BASE_URL, DEFAULT_HEADERS } from '../config/constants';

export interface ResolveMirrorResult {
  raw_html: string;
  embed_url: string | null;
  direct_video_url: string | null;
}

/**
 * Fetch nonce required for AJAX mirror resolution
 */
export async function getNonce(): Promise<string> {
  const form = new URLSearchParams();
  form.append('action', 'aa1208d27f29ca340c92c66d1926f13f');

  const res = await fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: form.toString(),
  });

  if (!res.ok) {
    throw new Error(`Failed to get nonce: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { data: string };
  return json.data;
}

/**
 * Resolve mirror data-content to embed iframe and direct video
 */
export async function resolveMirror(
  content: { id: number; i: number; q: string } | string,
  providedNonce?: string
): Promise<ResolveMirrorResult> {
  const parsedContent =
    typeof content === 'string'
      ? (JSON.parse(Buffer.from(content, 'base64').toString('utf-8')) as {
          id: number;
          i: number;
          q: string;
        })
      : content;

  const nonce = providedNonce || (await getNonce());

  const form = new URLSearchParams();
  form.append('id', parsedContent.id.toString());
  form.append('i', parsedContent.i.toString());
  form.append('q', parsedContent.q);
  form.append('nonce', nonce);
  form.append('action', '2a3505c93b0035d3f455df82bf976b84');

  const res = await fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: form.toString(),
  });

  if (!res.ok) {
    throw new Error(`Failed to resolve mirror: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { data: string };
  const decodedHtml = Buffer.from(json.data, 'base64').toString('utf-8');

  // Extract iframe src
  const srcMatch = decodedHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const embed_url = (srcMatch && srcMatch[1]) ? srcMatch[1] : null;

  // Try extracting direct video URL if embed_url exists
  let direct_video_url: string | null = null;
  if (embed_url) {
    try {
      direct_video_url = await extractDirectVideo(embed_url);
    } catch {
      direct_video_url = null;
    }
  }

  return {
    raw_html: decodedHtml,
    embed_url,
    direct_video_url,
  };
}

/**
 * Extract direct MP4 / HLS link from embed player (desustream / odcdn / etc.)
 */
export async function extractDirectVideo(embedUrl: string): Promise<string | null> {
  try {
    const res = await fetch(embedUrl, {
      headers: {
        ...DEFAULT_HEADERS,
        Referer: BASE_URL,
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // 1. Check videoURL variable (used in Desustream / Odcdn)
    const videoUrlMatch = html.match(/videoURL\s*=\s*["']([^"']+)["']/i);
    if (videoUrlMatch && videoUrlMatch[1]) return videoUrlMatch[1];

    // 2. Check sources / file array (jwplayer style)
    const fileMatch = html.match(/["']?file["']?\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
    if (fileMatch && fileMatch[1]) return fileMatch[1];

    // 3. Check html video / source tag
    const srcMatch = html.match(/<(?:video|source)[^>]+src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) return srcMatch[1];

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve direct download provider destination from link.desustream.com
 */
export async function resolveDownloadUrl(desuStreamUrl: string): Promise<string> {
  if (!desuStreamUrl.includes('link.desustream.com')) {
    return desuStreamUrl;
  }

  try {
    const res = await fetch(desuStreamUrl, {
      method: 'HEAD',
      redirect: 'manual',
      headers: DEFAULT_HEADERS,
    });

    const location = res.headers.get('location');
    if (location) return location;
  } catch {
    // Fallback if HEAD fails: try GET
    try {
      const res = await fetch(desuStreamUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: DEFAULT_HEADERS,
      });
      const location = res.headers.get('location');
      if (location) return location;
    } catch {
      // Return original URL on error
    }
  }

  return desuStreamUrl;
}
