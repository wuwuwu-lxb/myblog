import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createAsset } from "@/lib/db";

const uploadDir = path.join(process.cwd(), "storage", "uploads");
const allowedMimePrefixes = ["image/"];
const maxFileSize = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "没有收到文件。" }, { status: 400 });
  }

  if (!allowedMimePrefixes.some((prefix) => file.type.startsWith(prefix))) {
    return NextResponse.json({ error: "当前只允许上传图片。" }, { status: 400 });
  }

  if (file.size > maxFileSize) {
    return NextResponse.json({ error: "图片不能超过 8MB。" }, { status: 400 });
  }

  await mkdir(uploadDir, { recursive: true });

  const extension = path.extname(file.name) || mimeToExtension(file.type);
  const storedName = `${crypto.randomUUID()}${extension}`;
  const storagePath = path.join(uploadDir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(storagePath, buffer);

  const asset = createAsset({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    storagePath,
    alt: file.name,
  });

  return NextResponse.json({ asset }, { status: 201 });
}

function mimeToExtension(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    default:
      return "";
  }
}

