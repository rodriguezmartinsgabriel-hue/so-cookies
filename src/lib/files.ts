export const MAX_FILE_SIZE = 15 * 1024 * 1024

export const ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]

export function isAcceptedFile(file: File): boolean {
  if (file.type === "application/pdf") return true
  return file.type.startsWith("image/")
}

export function isPdfDataUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.startsWith("data:application/pdf")
}

export function isImageDataUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.startsWith("data:image/")
}

export function fileTypeLabel(url: string | null | undefined): string {
  if (isPdfDataUrl(url)) return "PDF"
  if (isImageDataUrl(url)) return "FOTO"
  return "ARQUIVO"
}

export function dataUrlSize(url: string): number {
  const comma = url.indexOf(",")
  if (comma === -1) return 0
  const b64 = url.slice(comma + 1)
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0
  return Math.floor((b64.length * 3) / 4) - padding
}

export function fileNameFromDataUrl(url: string | null | undefined): string {
  if (isPdfDataUrl(url)) return "documento.pdf"
  if (url?.startsWith("data:image/png")) return "imagem.png"
  if (url?.startsWith("data:image/jpeg")) return "imagem.jpg"
  if (url?.startsWith("data:image/webp")) return "imagem.webp"
  if (url?.startsWith("data:image/gif")) return "imagem.gif"
  return "arquivo"
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"))
    reader.readAsDataURL(file)
  })
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Falha ao carregar imagem")) }
    img.src = url
  })
}

export async function compressImage(file: File, maxDim = 900, quality = 0.82): Promise<string> {
  let source: HTMLImageElement | ImageBitmap
  try {
    source = await createImageBitmap(file)
  } catch {
    source = await loadImageFromFile(file)
  }

  const width = (source as HTMLImageElement).naturalWidth || (source as ImageBitmap).width
  const height = (source as HTMLImageElement).naturalHeight || (source as ImageBitmap).height
  const scale = Math.min(1, maxDim / Math.max(width, height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas não suportado")
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  if ("close" in source && typeof (source as ImageBitmap).close === "function") {
    (source as ImageBitmap).close()
  }
  const isPng = file.type === "image/png"
  return canvas.toDataURL(isPng ? "image/png" : "image/jpeg", isPng ? undefined : quality)
}

export interface FileReadResult {
  url: string
  kind: "image" | "pdf"
}

export async function processAttachment(file: File): Promise<FileReadResult> {
  if (!isAcceptedFile(file)) {
    throw new Error("Selecione um arquivo de imagem ou PDF válido.")
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`O arquivo é muito grande (máx. ${formatBytes(MAX_FILE_SIZE)}).`)
  }
  if (file.type === "application/pdf") {
    return { url: await readFileAsDataUrl(file), kind: "pdf" }
  }
  return { url: await compressImage(file), kind: "image" }
}
