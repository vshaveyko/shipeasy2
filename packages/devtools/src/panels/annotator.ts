// Minimal screenshot annotator. Draws over a captured image with arrow,
// rectangle, or text shapes. The export merges the source image with the
// annotation overlay into a single PNG blob.
//
// Tooling is intentionally bare: pick a tool, drag (or click for text), undo
// or clear if needed, save. No selection/move/edit — power users can re-take
// the screenshot.

type Tool = "arrow" | "rect" | "text";

interface Shape {
  tool: Tool;
  color: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text?: string;
}

export interface Annotator {
  root: HTMLElement;
  /** Returns the merged source + annotations as a PNG blob. */
  export(): Promise<Blob>;
}

const COLORS = ["#f87171", "#fbbf24", "#4ade80", "#60a5fa"];

export async function createAnnotator(source: Blob): Promise<Annotator> {
  const url = URL.createObjectURL(source);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load screenshot for annotation."));
    img.src = url;
  });

  const root = document.createElement("div");
  root.className = "se-annot";

  const toolbar = document.createElement("div");
  toolbar.className = "se-annot-toolbar";
  root.appendChild(toolbar);

  let tool: Tool = "arrow";
  let color = COLORS[0];
  const shapes: Shape[] = [];

  function makeToolBtn(t: Tool, label: string): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "se-annot-btn";
    b.dataset.tool = t;
    b.textContent = label;
    b.addEventListener("click", () => {
      tool = t;
      toolbar
        .querySelectorAll<HTMLButtonElement>("[data-tool]")
        .forEach((x) => x.classList.toggle("on", x.dataset.tool === t));
    });
    return b;
  }
  const arrowBtn = makeToolBtn("arrow", "↗ arrow");
  arrowBtn.classList.add("on");
  toolbar.appendChild(arrowBtn);
  toolbar.appendChild(makeToolBtn("rect", "▭ rect"));
  toolbar.appendChild(makeToolBtn("text", "T text"));

  const sep = document.createElement("span");
  sep.className = "se-annot-sep";
  toolbar.appendChild(sep);

  for (const c of COLORS) {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "se-annot-swatch";
    sw.dataset.color = c;
    sw.style.background = c;
    if (c === color) sw.classList.add("on");
    sw.addEventListener("click", () => {
      color = c;
      toolbar
        .querySelectorAll<HTMLButtonElement>("[data-color]")
        .forEach((x) => x.classList.toggle("on", x.dataset.color === c));
    });
    toolbar.appendChild(sw);
  }

  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.className = "se-annot-btn";
  undoBtn.textContent = "↶ undo";
  undoBtn.addEventListener("click", () => {
    shapes.pop();
    redraw();
  });
  toolbar.appendChild(undoBtn);

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "se-annot-btn";
  clearBtn.textContent = "clear";
  clearBtn.addEventListener("click", () => {
    shapes.length = 0;
    redraw();
  });
  toolbar.appendChild(clearBtn);

  // ── Stage ──────────────────────────────────────────────────────────────────
  const stage = document.createElement("div");
  stage.className = "se-annot-stage";
  root.appendChild(stage);

  // Single canvas that re-renders source + shapes on every interaction —
  // simpler and avoids the overlay/bg sub-pixel alignment issues that crop
  // up when the stage is CSS-scaled to fit the modal.
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.className = "se-annot-canvas";
  canvas.style.cursor = "crosshair";
  canvas.style.touchAction = "none";
  stage.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;

  function imagePoint(e: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
    };
  }

  function strokeWidth(): number {
    return Math.max(2, Math.round(image.naturalWidth / 400));
  }

  function drawShape(s: Shape) {
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = strokeWidth();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (s.tool === "rect") {
      const x = Math.min(s.x1, s.x2);
      const y = Math.min(s.y1, s.y2);
      const w = Math.abs(s.x2 - s.x1);
      const h = Math.abs(s.y2 - s.y1);
      ctx.strokeRect(x, y, w, h);
    } else if (s.tool === "arrow") {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
      const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      const head = strokeWidth() * 5;
      ctx.beginPath();
      ctx.moveTo(s.x2, s.y2);
      ctx.lineTo(
        s.x2 - head * Math.cos(angle - Math.PI / 6),
        s.y2 - head * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        s.x2 - head * Math.cos(angle + Math.PI / 6),
        s.y2 - head * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();
    } else if (s.tool === "text" && s.text) {
      const fontSize = Math.max(14, Math.round(image.naturalWidth / 60));
      ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = "top";
      const padding = fontSize * 0.3;
      const metrics = ctx.measureText(s.text);
      const w = metrics.width + padding * 2;
      const h = fontSize + padding * 2;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(s.x1, s.y1, w, h);
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, s.x1 + padding, s.y1 + padding);
    }
    ctx.restore();
  }

  function redraw(preview?: Shape) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    for (const s of shapes) drawShape(s);
    if (preview) drawShape(preview);
  }
  redraw();

  // Drag interactions for arrow / rect; click for text.
  let dragging: { x1: number; y1: number } | null = null;
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = imagePoint(e);
    if (tool === "text") {
      const text = prompt("Annotation text:");
      if (text && text.trim()) {
        shapes.push({ tool: "text", color, x1: p.x, y1: p.y, x2: p.x, y2: p.y, text: text.trim() });
        redraw();
      }
      return;
    }
    dragging = { x1: p.x, y1: p.y };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const p = imagePoint(e);
    redraw({ tool, color, x1: dragging.x1, y1: dragging.y1, x2: p.x, y2: p.y });
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    const p = imagePoint(e);
    const dx = Math.abs(p.x - dragging.x1);
    const dy = Math.abs(p.y - dragging.y1);
    if (dx > 4 || dy > 4) {
      shapes.push({ tool, color, x1: dragging.x1, y1: dragging.y1, x2: p.x, y2: p.y });
    }
    dragging = null;
    redraw();
  });

  return {
    root,
    async export(): Promise<Blob> {
      // Canvas already holds the merged image + annotations.
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
      });
      URL.revokeObjectURL(url);
      return blob;
    },
  };
}
