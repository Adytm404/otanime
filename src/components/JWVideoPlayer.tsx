import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface JWVideoPlayerProps {
  src: string;
  title: string;
  poster?: string;
  initialTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onFallbackToEmbed?: () => void;
}

export const JWVideoPlayer: React.FC<JWVideoPlayerProps> = ({
  src,
  title,
  poster,
  initialTime,
  onProgress,
  onFallbackToEmbed
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastProgressReportRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [buffered, setBuffered] = useState<number>(0);

  // Persistent volume settings from localStorage
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('otanime_player_volume');
      return saved !== null ? parseFloat(saved) : 1;
    } catch {
      return 1;
    }
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const savedMute = localStorage.getItem('otanime_player_muted');
      return savedMute === 'true';
    } catch {
      return false;
    }
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
    const h = Math.floor(timeInSeconds / 3600);
    const m = Math.floor((timeInSeconds % 3600) / 60);
    const s = Math.floor(timeInSeconds % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Activity detection to auto-hide controls
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
      }, 2800);
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn('Playback error:', e);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTime = (parseFloat(e.target.value) / 100) * duration;
    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  // Persist volume & mute settings to localStorage and sync with video element
  useEffect(() => {
    try {
      localStorage.setItem('otanime_player_volume', String(volume));
      localStorage.setItem('otanime_player_muted', String(isMuted));
    } catch (e) {
      console.error(e);
    }
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  // Skip forward / backward
  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.warn);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.warn);
      setIsFullscreen(false);
    }
  };

  // Speed change
  const changeSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettings(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((prev) => Math.min(1, Math.round((prev + 0.1) * 10) / 10));
          setIsMuted(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((prev) => {
            const nextVol = Math.max(0, Math.round((prev - 0.1) * 10) / 10);
            if (nextVol === 0) setIsMuted(true);
            return nextVol;
          });
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isPlaying, duration, isMuted]);

  // Video event listeners
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      if (v.buffered.length > 0) {
        setBuffered((v.buffered.end(v.buffered.length - 1) / (v.duration || 1)) * 100);
      }

      // Throttle progress reporting every 2.5 seconds
      const now = Date.now();
      if (now - lastProgressReportRef.current > 2500) {
        lastProgressReportRef.current = now;
        if (onProgress && v.duration > 0) {
          onProgress(v.currentTime, v.duration);
        }
      }
    };

    const onLoadedMetadata = () => {
      setDuration(v.duration);
      setError(null);
      v.volume = isMuted ? 0 : volume;
      v.muted = isMuted;
      // Resume from previous timestamp if provided
      if (initialTime && initialTime > 0 && initialTime < v.duration - 5) {
        v.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    };

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const onPause = () => {
      setIsPlaying(false);
      if (onProgress && v.duration > 0) {
        onProgress(v.currentTime, v.duration);
      }
    };
    const onError = () => {
      setError('Direct video stream gagal diputar atau format tidak didukung.');
      setIsBuffering(false);
    };

    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('pause', onPause);
    v.addEventListener('error', onError);

    return () => {
      if (onProgress && v.duration > 0) {
        onProgress(v.currentTime, v.duration);
      }
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('error', onError);
    };
  }, [src, initialTime, onProgress]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group select-none flex items-center justify-center border border-white/10 shadow-2xl shadow-black/80 font-sans"
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
      />

      {/* Top Title Overlay on hover */}
      {title && (
        <div
          className={`absolute top-4 left-5 z-30 transition-opacity duration-300 max-w-[60%] pointer-events-none ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="text-xs sm:text-sm font-semibold text-white/90 drop-shadow truncate block">
            {title}
          </span>
        </div>
      )}

      {/* JWPlayer Style Official Watermark: OTANIME */}
      <div className="absolute top-4 right-5 z-30 pointer-events-none transition-opacity duration-300">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-lg shadow-black/50 opacity-80 group-hover:opacity-100">
          <div className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center p-0.5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-full h-full text-white"
            >
              <circle cx="12" cy="12" r="9" strokeOpacity="0.4" />
              <path d="M12 3a9 9 0 0 1 9 9c0 4.5-3.5 8-8 8a6 6 0 0 1-6-6c0-3.3 2.7-5 5-5a3 3 0 0 1 3 3" />
              <circle cx="12" cy="12" r="1.5" fill="white" />
            </svg>
          </div>
          <span className="text-[11px] font-extrabold tracking-wider text-white uppercase drop-shadow">
            Otanime<span className="text-rose-500 font-bold ml-0.5">•</span>
          </span>
        </div>
      </div>

      {/* Buffering Spinner */}
      {isBuffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
          <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/85 text-center text-white space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <p className="text-sm text-white/90 font-medium max-w-sm">{error}</p>
          {onFallbackToEmbed && (
            <button
              onClick={onFallbackToEmbed}
              className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all"
            >
              Ganti ke Server Embed Mirror
            </button>
          )}
        </div>
      )}

      {/* Big Center Play/Pause Indicator on paused state */}
      {!isPlaying && !error && !isBuffering && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/25 cursor-pointer z-20 transition-opacity"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 hover:scale-110 active:scale-95 transition-all">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1" />
          </div>
        </div>
      )}

      {/* JWPlayer Custom Control Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-10 pb-3 px-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Progress Bar */}
        <div className="relative w-full flex items-center mb-3 group/scrub cursor-pointer">
          {/* Background Track */}
          <div className="w-full h-1 sm:h-1.5 bg-white/20 rounded-full relative overflow-hidden group-hover/scrub:h-2 transition-all">
            {/* Buffer bar */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-white/30 transition-all"
              style={{ width: `${buffered}%` }}
            />
            {/* Active red progress */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-rose-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Invisible HTML range input for scrub control */}
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progressPercent}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            aria-label="Seek Video"
          />

          {/* Scrubber Thumb */}
          <div
            className="w-3.5 h-3.5 rounded-full bg-white shadow-md shadow-black absolute pointer-events-none -ml-1.5 opacity-0 group-hover/scrub:opacity-100 transition-opacity"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Bottom Action Controls */}
        <div className="flex items-center justify-between gap-2 text-white">
          {/* Left Controls: Play, Skip, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors focus:outline-none"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white text-white" />
              ) : (
                <Play className="w-5 h-5 fill-white text-white ml-0.5" />
              )}
            </button>

            <button
              onClick={() => skip(-10)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white"
              title="Mundur 10 detik"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => skip(10)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white"
              title="Maju 10 detik"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1 accent-rose-600 bg-white/20 rounded-full cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                aria-label="Volume"
              />
            </div>

            {/* Time Indicator */}
            <div className="text-[11px] sm:text-xs text-white/80 font-mono ml-1">
              <span>{formatTime(currentTime)}</span>
              <span className="text-white/40 mx-1">/</span>
              <span className="text-white/50">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Speed, Fullscreen */}
          <div className="flex items-center gap-2 relative">
            {/* Speed Settings Popup */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-2 py-1 rounded-lg hover:bg-white/10 text-xs font-semibold flex items-center gap-1 text-white/80 hover:text-white transition-colors"
                title="Kecepatan Video"
              >
                <span>{playbackSpeed}x</span>
                <Settings className="w-3.5 h-3.5" />
              </button>

              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 w-28 bg-[#18181f] border border-white/10 rounded-xl p-1 shadow-2xl z-40 text-xs">
                  <div className="px-2 py-1 text-[10px] text-white/40 uppercase font-bold border-b border-white/5">
                    Kecepatan
                  </div>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                        playbackSpeed === s
                          ? 'bg-rose-600 text-white font-bold'
                          : 'hover:bg-white/5 text-white/80'
                      }`}
                    >
                      <span>{s}x</span>
                      {playbackSpeed === s && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
