import type { MomentCardTheme } from "@/domain/models";
import { brand } from "@/config/brand";

export type RenderMomentCardParams = {
  quote: string;
  theme: MomentCardTheme;
  watermark: boolean;
};

type ThemeSpec = {
  bg: string;
  fg: string;
  accent: string;
  frame: string;
};

function themeSpec(theme: MomentCardTheme): ThemeSpec {
  switch (theme) {
    case "BOLD":
      return {
        bg: "#2E2A86", // indigo
        fg: "#FFFDF5",
        accent: "#37C6B0",
        frame: "rgba(255,255,255,0.14)",
      };
    case "CALM":
      return {
        bg: "#EAF7F4",
        fg: "#1F2937",
        accent: "#2AAE9A",
        frame: "rgba(31,41,55,0.10)",
      };
    case "MINIMAL":
    default:
      return {
        bg: "#FFFDF8",
        fg: "#1F2937",
        accent: "#6D5EF6",
        frame: "rgba(31,41,55,0.12)",
      };
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderMomentCardPng(
  params: RenderMomentCardParams
): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const pad = 92;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  const spec = themeSpec(params.theme);

  // Background
  ctx.fillStyle = spec.bg;
  ctx.fillRect(0, 0, W, H);

  // Rounded frame
  const r = 64;
  ctx.strokeStyle = spec.frame;
  ctx.lineWidth = 6;
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, r);
  ctx.stroke();

  // Accent bar
  ctx.fillStyle = spec.accent;
  roundRect(ctx, pad + 22, pad + 22, 18, 140, 16);
  ctx.fill();

  // Quote
  ctx.fillStyle = spec.fg;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Use a modern system stack.
  ctx.font = "600 58px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
  const textMaxW = W - pad * 2 - 64;
  const q = params.quote.trim().replace(/^\"|\"$/g, "");
  const lines = wrapText(ctx, q, textMaxW);

  const lineHeight = 74;
  const startX = pad + 64;
  const startY = pad + 140;

  lines.slice(0, 10).forEach((line, i) => {
    ctx.fillText(line, startX, startY + i * lineHeight);
  });

  // Footer brand
  ctx.font = "600 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
  ctx.globalAlpha = params.theme === "BOLD" ? 0.9 : 0.7;
  ctx.fillText(brand.appName, pad + 24, H - pad - 56);
  ctx.globalAlpha = 1;

  // Watermark for free tier
  if (params.watermark) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = spec.fg;
    ctx.textAlign = "right";
    ctx.font = "700 30px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("Made with VoxNote AI", W - pad - 24, H - pad - 56);
    ctx.restore();
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) return reject(new Error("Failed to render image."));
      resolve(b);
    }, "image/png");
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
