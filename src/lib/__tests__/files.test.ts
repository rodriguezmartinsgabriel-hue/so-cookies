import { describe, it, expect } from "vitest"
import {
  isPdfDataUrl,
  isImageDataUrl,
  isAcceptedFile,
  fileTypeLabel,
  formatBytes,
  dataUrlSize,
  fileNameFromDataUrl,
  MAX_FILE_SIZE,
} from "@/lib/files"

const IMG_PNG = "data:image/png;base64,iVBORw0KGgo="
const IMG_JPEG = "data:image/jpeg;base64,/9j/2Q=="
const PDF = "data:application/pdf;base64,JVBERi0xLjQK"

function makeFile(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe("isAcceptedFile", () => {
  it("aceita imagens", () => {
    expect(isAcceptedFile(makeFile("foto.jpg", "image/jpeg", 10))).toBe(true)
    expect(isAcceptedFile(makeFile("foto.png", "image/png", 10))).toBe(true)
  })

  it("aceita pdf", () => {
    expect(isAcceptedFile(makeFile("doc.pdf", "application/pdf", 10))).toBe(true)
  })

  it("rejeita outros tipos", () => {
    expect(isAcceptedFile(makeFile("planilha.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 10))).toBe(false)
    expect(isAcceptedFile(makeFile("texto.txt", "text/plain", 10))).toBe(false)
  })
})

describe("isPdfDataUrl / isImageDataUrl", () => {
  it("detecta pdf", () => {
    expect(isPdfDataUrl(PDF)).toBe(true)
    expect(isPdfDataUrl(IMG_PNG)).toBe(false)
    expect(isPdfDataUrl(null)).toBe(false)
  })

  it("detecta imagem", () => {
    expect(isImageDataUrl(IMG_PNG)).toBe(true)
    expect(isImageDataUrl(IMG_JPEG)).toBe(true)
    expect(isImageDataUrl(PDF)).toBe(false)
    expect(isImageDataUrl(undefined)).toBe(false)
  })
})

describe("fileTypeLabel", () => {
  it("rotula corretamente", () => {
    expect(fileTypeLabel(PDF)).toBe("PDF")
    expect(fileTypeLabel(IMG_PNG)).toBe("FOTO")
    expect(fileTypeLabel(null)).toBe("ARQUIVO")
  })
})

describe("formatBytes", () => {
  it("formata bytes", () => {
    expect(formatBytes(0)).toBe("0 B")
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(1024)).toBe("1.0 KB")
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB")
  })
})

describe("dataUrlSize", () => {
  it("calcula o tamanho aproximado em bytes", () => {
    expect(dataUrlSize("data:text/plain;base64,aGVsbG8=")).toBe(5)
    expect(dataUrlSize("sem-data-url")).toBe(0)
    expect(dataUrlSize("data:image/png;base64,")).toBe(0)
  })
})

describe("fileNameFromDataUrl", () => {
  it("deriva nome pelo mime", () => {
    expect(fileNameFromDataUrl(PDF)).toBe("documento.pdf")
    expect(fileNameFromDataUrl(IMG_PNG)).toBe("imagem.png")
    expect(fileNameFromDataUrl(IMG_JPEG)).toBe("imagem.jpg")
    expect(fileNameFromDataUrl(null)).toBe("arquivo")
  })
})

describe("MAX_FILE_SIZE", () => {
  it("é 15MB", () => {
    expect(MAX_FILE_SIZE).toBe(15 * 1024 * 1024)
  })
})
