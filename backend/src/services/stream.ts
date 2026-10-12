import { getBaseUrl, getRequestHeaders } from '../config/baseUrl';

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

  const res = await fetch(`${await getBaseUrl()}/wp-admin/admin-ajax.php`, {
    method: 'POST',
    headers: {
      ...(await getRequestHeaders()),
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

  const res = await fetch(`${await getBaseUrl()}/wp-admin/admin-ajax.php`, {
    method: 'POST',
    headers: {
      ...(await getRequestHeaders()),
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
 * Statically decode a Dean Edwards `eval(function(p,a,c,k,e,d){...})` packer
 * payload without executing it.
 */
function unpackPackedJs(html: string): string | null {
  const match = html.match(
    /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/
  );
  if (!match) return null;

  const [, payload = '', radixStr = '', countStr = '', wordList = ''] = match;
  const radix = parseInt(radixStr, 10);
  const words = wordList.split('|');

  const encode = (n: number): string =>
    (n < radix ? '' : encode(Math.floor(n / radix))) +
    ((n = n % radix) > 35 ? String.fromCharCode(n + 29) : n.toString(36));

  const dict: Record<string, string> = {};
  for (let i = parseInt(countStr, 10) - 1; i >= 0; i--) {
    const key = encode(i);
    dict[key] = words[i] || key;
  }

  return payload.replace(/\b\w+\b/g, (w) => dict[w] ?? w);
}

/**
 * Extract direct MP4 / HLS link from embed player (desustream / odcdn / vidhide / etc.)
 */
export async function extractDirectVideo(embedUrl: string): Promise<string | null> {
  try {
    const res = await fetch(embedUrl, {
      headers: await getRequestHeaders(),
    });

    if (!res.ok) return null;

    const html = await res.text();

    function sanitizeUrl(rawUrl: string): string {
      let clean = rawUrl.trim().replace(/&amp;/g, '&');
      if (
        (clean.includes('cdn.odcloud.net') || !/\.[a-zA-Z0-9]{3,4}(\?.*)?$/i.test(clean)) &&
        !clean.endsWith('.mp4') &&
        !clean.includes('googlevideo.com')
      ) {
        clean += '.mp4';
      }
      return clean;
    }

    // 1. Check videoURL variable (used in Desustream / Odcdn)
    const videoUrlMatch = html.match(/videoURL\s*=\s*["']([^"']+)["']/i);
    if (videoUrlMatch && videoUrlMatch[1]) return sanitizeUrl(videoUrlMatch[1]);

    // 2. Check sources / file array (jwplayer style)
    const fileMatch = html.match(/["']?file["']?\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
    if (fileMatch && fileMatch[1]) return sanitizeUrl(fileMatch[1]);

    // 3. Check html video / source tag
    const srcMatch = html.match(/<(?:video|source)[^>]+src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) return sanitizeUrl(srcMatch[1]);

    // 4. Packed jwplayer setup (vidhide / filelions family) exposing HLS links
    const packed = unpackPackedJs(html);
    if (packed) {
      const linksMatch = packed.match(/links\s*=\s*(\{[^}]*\})/);
      if (linksMatch && linksMatch[1]) {
        try {
          const links = JSON.parse(linksMatch[1]) as Record<string, string>;
          // Absolute CDN links send CORS headers; the relative hls4 path on the embed host does not
          const hls = links.hls2 || links.hls3 || links.hls4;
          if (hls) return new URL(hls, embedUrl).toString();
        } catch {
          // fall through
        }
      }
    }

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
      headers: await getRequestHeaders(),
    });

    const location = res.headers.get('location');
    if (location) return location;
  } catch {
    // Fallback if HEAD fails: try GET
    try {
      const res = await fetch(desuStreamUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: await getRequestHeaders(),
      });
      const location = res.headers.get('location');
      if (location) return location;
    } catch {
      // Return original URL on error
    }
  }

  return desuStreamUrl;
}
