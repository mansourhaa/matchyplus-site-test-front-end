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
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'user' }, audio: true });
  });
});
