import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IdentityVerificationCamera } from './identity-verification-camera';

function fakeStream() {
  const track = { stop: vi.fn() };
  return { getTracks: () => [track] } as unknown as MediaStream;
}

describe('IdentityVerificationCamera', () => {
  const originalMediaDevices = navigator.mediaDevices;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
    URL.revokeObjectURL = vi.fn();
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => ({ drawImage: vi.fn() }) as unknown as CanvasRenderingContext2D,
    ) as never;
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (callback) {
      callback(new Blob(['fake-jpeg-bytes'], { type: 'image/jpeg' }));
    }) as never;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
    });
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.clearAllMocks();
  });

  it('opens the camera and shows the capture button once permission is granted', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream());
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });

    render(<IdentityVerificationCamera onCapture={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir la caméra/ }));

    expect(await screen.findByRole('button', { name: /Capturer/ })).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'user' } });
  });

  it('shows an error message when camera access is denied', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });

    render(<IdentityVerificationCamera onCapture={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir la caméra/ }));

    expect(await screen.findByText(/Impossible d'accéder à la caméra/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Capturer/ })).not.toBeInTheDocument();
  });

  it('captures a frame, calls onCapture with a blob, and offers to retake', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream());
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });
    const onCapture = vi.fn();

    render(<IdentityVerificationCamera onCapture={onCapture} />);
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir la caméra/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Capturer/ }));

    await waitFor(() => expect(onCapture).toHaveBeenCalledTimes(1));
    expect(onCapture.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(await screen.findByRole('button', { name: /Reprendre/ })).toBeInTheDocument();
    // The live camera view is torn down once a frame is captured.
    expect(screen.queryByRole('button', { name: /Capturer/ })).not.toBeInTheDocument();
  });

  it('reopens the camera when retaking', async () => {
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream());
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });

    render(<IdentityVerificationCamera onCapture={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Ouvrir la caméra/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Capturer/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Reprendre/ }));

    expect(await screen.findByRole('button', { name: /Capturer/ })).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });
});
