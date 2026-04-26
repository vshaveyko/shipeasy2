// Screen capture utilities for bug reports.
//
// Both screenshots and screen recordings go through getDisplayMedia: this asks
// the browser for permission (the picker shows the current tab/window/screen),
// so it works inside an iframe-loaded devtools without needing any host SDK
// support. For screenshots we grab a single video frame and stop the track;
// for recordings we hand the stream to MediaRecorder.

declare global {
  interface MediaDevices {
    getDisplayMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  }
}

export async function captureScreenshot(): Promise<Blob> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Screen capture is not supported in this browser.");
  }
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: false,
  });
  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    // One frame is enough; wait a tick so the first frame is decoded.
    await new Promise((r) => setTimeout(r, 250));
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) throw new Error("Capture stream returned no frames.");
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2d context unavailable");
    ctx.drawImage(video, 0, 0, w, h);
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    });
    return blob;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

export interface RecordingHandle {
  stop(): Promise<Blob>;
  cancel(): void;
}

export async function startRecording(): Promise<RecordingHandle> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Screen capture is not supported in this browser.");
  }
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: true,
  });
  // Pick a mime type the browser actually supports (Safari is webm-shy).
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  const mimeType = candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.addEventListener("dataavailable", (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  });
  recorder.start(500);

  // Stop early if the user clicks "Stop sharing" in the browser's UI.
  stream.getVideoTracks()[0]?.addEventListener("ended", () => {
    if (recorder.state !== "inactive") recorder.stop();
  });

  function stopTracks() {
    stream.getTracks().forEach((t) => t.stop());
  }

  return {
    stop(): Promise<Blob> {
      return new Promise((resolve, reject) => {
        if (recorder.state === "inactive") {
          stopTracks();
          if (chunks.length === 0) {
            reject(new Error("No recording data."));
            return;
          }
          resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
          return;
        }
        recorder.addEventListener(
          "stop",
          () => {
            stopTracks();
            resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
          },
          { once: true },
        );
        recorder.addEventListener("error", (e) => reject(e), { once: true });
        recorder.stop();
      });
    },
    cancel() {
      if (recorder.state !== "inactive") recorder.stop();
      stopTracks();
    },
  };
}
