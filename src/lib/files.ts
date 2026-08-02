export const MAX_IMAGE_UPLOAD = 10 * 1024 * 1024

export const MAX_PDF_UPLOAD = 2_500_000

export const MAX_SYNC_BASE64 = 3_400_000

export const MAX_PUSH_BODY = 3_600_000

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

export async function compressImage(file: File, maxDim = 900, quality = 0.82, forceJpeg = false): Promise<string> {
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
  const isPng = !forceJpeg && file.type === "image/png"
  return canvas.toDataURL(isPng ? "image/png" : "image/jpeg", isPng ? undefined : quality)
}

const IMAGE_DIM_STEPS = [900, 720, 600]
const IMAGE_QUALITY_STEPS = [0.82, 0.6, 0.45, 0.3]

async function compressImageToFit(file: File): Promise<string> {
  for (const dim of IMAGE_DIM_STEPS) {
    for (const quality of IMAGE_QUALITY_STEPS) {
      const url = await compressImage(file, dim, quality)
      if (dataUrlSize(url) <= MAX_SYNC_BASE64) return url
    }
  }
  if (file.type === "image/png") {
    const jpeg = await compressImage(file, 600, 0.5, true)
    if (dataUrlSize(jpeg) <= MAX_SYNC_BASE64) return jpeg
  }
  throw new Error(
    `Imagem grande demais para sincronizar. Reduza a resolução ou use uma versão menor (máx. ${formatBytes(MAX_IMAGE_UPLOAD)}).`
  )
}

export interface FileReadResult {
  url: string
  kind: "image" | "pdf"
}

export async function processAttachment(file: File): Promise<FileReadResult> {
  if (!isAcceptedFile(file)) {
    throw new Error("Selecione um arquivo de imagem ou PDF válido.")
  }
  const isPdf = file.type === "application/pdf"
  const uploadLimit = isPdf ? MAX_PDF_UPLOAD : MAX_IMAGE_UPLOAD
  if (file.size > uploadLimit) {
    throw new Error(`O arquivo é muito grande (máx. ${formatBytes(uploadLimit)}).`)
  }
  if (isPdf) {
    const url = await readFileAsDataUrl(file)
    if (dataUrlSize(url) > MAX_SYNC_BASE64) {
      throw new Error(`PDF grande demais para sincronizar (máx. ${formatBytes(MAX_PDF_UPLOAD)}). Use uma versão menor.`)
    }
    return { url, kind: "pdf" }
  }
  return { url: await compressImageToFit(file), kind: "image" }
}
