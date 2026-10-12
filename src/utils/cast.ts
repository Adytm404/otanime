// Google Cast (Chromecast) sender helpers. The SDK is loaded lazily on first use
// and only works in Chromium browsers; other browsers fall back to the
// Remote Playback API / AirPlay picker on the <video> element itself.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    cast?: any;
    chrome?: any;
  }
}

const CAST_SDK_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

let sdkPromise: Promise<boolean> | null = null;

export function loadCastSdk(): Promise<boolean> {
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<boolean>((resolve) => {
    // The Cast sender only exists in Chromium-based browsers
    if (typeof window === 'undefined' || !(window as any).chrome) {
      resolve(false);
      return;
    }

    window.__onGCastApiAvailable = (isAvailable) => {
      if (isAvailable && window.cast?.framework) {
        window.cast.framework.CastContext.getInstance().setOptions({
          receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
        });
      }
      resolve(isAvailable);
    };

    const script = document.createElement('script');
    script.src = CAST_SDK_URL;
    script.async = true;
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return sdkPromise;
}

function guessContentType(url: string): string {
  if (/\.m3u8(\?|$)/i.test(url)) return 'application/x-mpegurl';
  return 'video/mp4';
}

/**
 * Opens the Cast device picker and plays `src` on the chosen device from `startTime`.
 * Resolves true once the receiver has started loading the media.
 */
export async function castVideo(src: string, title: string, startTime: number, poster?: string): Promise<boolean> {
  const available = await loadCastSdk();
  if (!available) return false;

  const { cast, chrome } = window;
  const context = cast.framework.CastContext.getInstance();

  try {
    await context.requestSession();
  } catch {
    // Picker dismissed or no device selected
    return false;
  }

  const session = context.getCurrentSession();
  if (!session) return false;

  // Receivers fetch the media themselves, so it needs an absolute URL
  const absoluteSrc = new URL(src, window.location.href).toString();
  const mediaInfo = new chrome.cast.media.MediaInfo(absoluteSrc, guessContentType(absoluteSrc));
  mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
  mediaInfo.metadata.title = title;
  if (poster) {
    mediaInfo.metadata.images = [new chrome.cast.Image(new URL(poster, window.location.href).toString())];
  }

  const request = new chrome.cast.media.LoadRequest(mediaInfo);
  request.currentTime = startTime;
  request.autoplay = true;

  try {
    await session.loadMedia(request);
    return true;
  } catch (e) {
    console.warn('Cast load failed:', e);
    return false;
  }
}

export function stopCasting(): void {
  window.cast?.framework?.CastContext.getInstance().endCurrentSession(true);
}

/** Calls `onEnd` when the active Cast session ends (e.g. stopped from the device). */
export function onCastSessionEnded(onEnd: () => void): () => void {
  const framework = window.cast?.framework;
  if (!framework) return () => undefined;

  const context = framework.CastContext.getInstance();
  const listener = (e: any) => {
    if (e.sessionState === framework.SessionState.SESSION_ENDED) onEnd();
  };
  context.addEventListener(framework.CastContextEventType.SESSION_STATE_CHANGED, listener);
  return () => context.removeEventListener(framework.CastContextEventType.SESSION_STATE_CHANGED, listener);
}

/** Fallback for non-Chromium browsers: Safari AirPlay picker or the Remote Playback API. */
export function promptNativeCast(video: HTMLVideoElement): boolean {
  const v = video as any;
  if (typeof v.webkitShowPlaybackTargetPicker === 'function') {
    v.webkitShowPlaybackTargetPicker();
    return true;
  }
  if (v.remote && typeof v.remote.prompt === 'function') {
    v.remote.prompt().catch((e: unknown) => console.warn('Remote playback failed:', e));
    return true;
  }
  return false;
}

export function isCastSupported(video?: HTMLVideoElement | null): boolean {
  if (typeof window === 'undefined') return false;
  if ((window as any).chrome) return true;
  const v = video as any;
  return !!v && (typeof v.webkitShowPlaybackTargetPicker === 'function' || !!v.remote);
}
