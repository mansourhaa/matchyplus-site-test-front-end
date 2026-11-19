import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VideoRecorderModal, buildVideoRecorderTr } from './video-recorder-modal';

function fakeStream() {
  const track = { stop: vi.fn() };
  return { getTracks: () => [track] } as unknown as MediaStream;
}

describe('VideoRecorderModal — live preview framing', () => {
  const originalMediaDevices = navigator.mediaDevices;

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  it('shows the live camera preview unzoomed (object-contain), not cropped (object-cover)', async () => {
    // Regression: the live preview used object-cover, which crops/zooms whenever the
    // camera's actual stream aspect ratio doesn't match this full-screen portrait UI —
    // the review player right below it already used object-contain for the same stream's
    // recording, so the two must match.
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream());
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });

    const tr = buildVideoRecorderTr('fr', 'fr-FR');
    const { container } = render(
      <VideoRecorderModal onVideoReady={vi.fn()} onClose={vi.fn()} tr={tr} />,
    );

    fireEvent.click(screen.getByText(tr.cameraBtn));

    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());

    const liveVideo = container.querySelector('video');
    expect(liveVideo).not.toBeNull();
    expect(liveVideo).toHaveClass('object-contain');
    expect(liveVideo).not.toHaveClass('object-cover');
  });

  it('does not request a portrait resolution that would force the browser to crop the raw feed', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream());
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });

    const tr = buildVideoRecorderTr('fr', 'fr-FR');
    render(<VideoRecorderModal onVideoReady={vi.fn()} onClose={vi.fn()} tr={tr} />);

    fireEvent.click(screen.getByText(tr.cameraBtn));

    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  });
});

describe('VideoRecorderModal — sound-only track for the voice AI', () => {
  const originalMediaDevices = navigator.mediaDevices;
  const originals = {
    MediaRecorder: globalThis.MediaRecorder,
    MediaStream: globalThis.MediaStream,
    createObjectURL: URL.createObjectURL,
    revokeObjectURL: URL.revokeObjectURL,
  };

  class FakeMediaRecorder {
    static isTypeSupported = (type: string) => type.includes('webm');
    state: 'inactive' | 'recording' = 'inactive';
    mimeType: string;
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    constructor(_stream: unknown, options?: { mimeType?: string }) {
      this.mimeType = options?.mimeType ?? 'video/webm';
    }
    start() {
      this.state = 'recording';
    }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob([new Uint8Array([1])], { type: this.mimeType }) });
      this.onstop?.();
    }
  }

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
    });
    Object.assign(globalThis, {
      MediaRecorder: originals.MediaRecorder,
      MediaStream: originals.MediaStream,
    });
    URL.createObjectURL = originals.createObjectURL;
    URL.revokeObjectURL = originals.revokeObjectURL;
    vi.clearAllMocks();
  });

  it('hands over the sound recorded alone, next to the video', async () => {
    const track = { stop: vi.fn() };
    const stream = {
      getTracks: () => [track],
      getAudioTracks: () => [track],
    } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      configurable: true,
    });
    Object.assign(globalThis, {
      MediaRecorder: FakeMediaRecorder,
      MediaStream: class {
        constructor(public tracks: unknown[]) {}
      },
    });
    URL.createObjectURL = vi.fn(() => 'blob:take');
    URL.revokeObjectURL = vi.fn();
    const onVideoReady = vi.fn();
    const tr = buildVideoRecorderTr('fr', 'fr-FR');
    render(<VideoRecorderModal onVideoReady={onVideoReady} onClose={vi.fn()} tr={tr} />);

    fireEvent.click(screen.getByText(tr.cameraBtn));
    const startButton = await waitFor(() => {
      const button = screen.getByText(tr.readyTitle).parentElement?.querySelector('button');
      expect(button).toBeTruthy();
      return button!;
    });
    fireEvent.click(startButton);
    fireEvent.click(screen.getByText(tr.stopRec).parentElement!.querySelector('button')!);
    fireEvent.click(await screen.findByText(tr.confirmBtn));

    expect(onVideoReady).toHaveBeenCalledTimes(1);
    const [video, , filename, audio] = onVideoReady.mock.calls[0];
    expect((video as Blob).type).toBe('video/webm');
    expect(filename).toMatch(/\.webm$/);
    expect(audio).toBeInstanceOf(Blob);
    expect((audio as Blob).type).toBe('audio/webm');
  });
});
