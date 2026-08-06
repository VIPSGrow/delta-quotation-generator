import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Ensure the uploads directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Convert a dataURL (or clear) to a stored file path.
// Returns the public URL path (e.g. /uploads/abc.png) or null.
export async function saveImage(
  dataUrl: string | null | undefined,
): Promise<string | null> {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  // If it's already a relative path (e.g. /uploads/...), keep as-is
  if (dataUrl.startsWith("/uploads/")) {
    return dataUrl;
  }

  // Only process data URLs; ignore plain http(s) links to avoid surprises
  if (!dataUrl.startsWith("data:")) {
    return dataUrl.trim() || null;
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mime = match[1]; // e.g. image/png
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");

  const ext = mime.split("/")[1]?.split("+")[0] || "png";
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;

  await ensureUploadDir();
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return `/uploads/${filename}`;
}

// Delete an image file by its public path.
export async function deleteImage(publicPath: string | null | undefined) {
  if (!publicPath || !publicPath.startsWith("/uploads/")) return;
  const fullPath = path.join(process.cwd(), "public", publicPath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // ignore missing file
  }
}
