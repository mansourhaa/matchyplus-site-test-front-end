'use client';

import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';

export type VideoJSPlayerProps = {
  src: string;
  type?: string;
  poster?: string;
  controls?: boolean;
  autoplay?: boolean | string;
  muted?: boolean;
  loop?: boolean;
  playsinline?: boolean;
  fluid?: boolean;
  aspectRatio?: string;
  className?: string;
  onReady?: (player: Player) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
};

export const VideoJSPlayer: FC<VideoJSPlayerProps> = ({
  src,
  type = 'video/mp4',
  poster,
  controls = true,
  autoplay = false,
  muted = false,
  loop = false,
  playsinline = true,
  fluid = true,
  aspectRatio = '16:9',
  className = '',
  onReady,
  onPlay,
  onPause,
  onEnded,
}) => {
  const videoRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (typeof window !== 'undefined' && window.CSS && typeof window.CSS.supports !== 'function') {
      window.CSS.supports = () => true;
    }

    // Make sure Video.js only initializes once on this element
    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-big-play-centered');
    videoRef.current.appendChild(videoElement);

    const player = (playerRef.current = videojs(
      videoElement,
      {
        controls,
        autoplay,
        muted,
        loop,
        playsinline,
        fluid,
        aspectRatio,
        poster,
        preload: 'auto',
        sources: [
          {
            src,
            type,
          },
        ],
      },
      () => {
        if (onReady) {
          onReady(player);
        }
      },
    ));

    if (onPlay) player.on('play', onPlay);
    if (onPause) player.on('pause', onPause);
    if (onEnded) player.on('ended', onEnded);

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update source if src changes while mounted
  useEffect(() => {
    const player = playerRef.current;
    if (player && !player.isDisposed() && src) {
      player.src({ src, type });
      if (poster) player.poster(poster);
    }
  }, [src, type, poster]);

  return (
    <div data-vjs-player className={`w-full ${className}`}>
      <div ref={videoRef} className="w-full overflow-hidden rounded-2xl" />
    </div>
  );
};
