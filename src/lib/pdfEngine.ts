import * as pdfjsLib from 'pdfjs-dist'

// Set worker path to our local public/pdf.worker.min.mjs
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

export interface RenderedPage {
  pageIndex: number // 1-indexed
  dataUrl: string
  width: number
  height: number
}

// Global in-memory cache for rendered page images across mode toggles
const renderCache = new Map<string, RenderedPage>()

export async function loadPdfDocument(signedUrl: string) {
  const loadingTask = pdfjsLib.getDocument({
    url: signedUrl,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
    cMapPacked: true,
  })
  return await loadingTask.promise
}

export async function renderPdfPage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = 1.5
): Promise<RenderedPage> {
  const docId = (pdfDoc as any).fingerprints?.[0] || (pdfDoc as any).fingerprint || 'doc'
  const cacheKey = `${docId}_page_${pageNumber}_scale_${scale}`

  if (renderCache.has(cacheKey)) {
    return renderCache.get(cacheKey)!
  }

  const page = await pdfDoc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.width = viewport.width
  canvas.height = viewport.height

  if (!context) {
    throw new Error('Canvas 2D context creation failed')
  }

  const renderContext: any = {
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  }

  await page.render(renderContext).promise

  const dataUrl = canvas.toDataURL('image/png')
  const result: RenderedPage = {
    pageIndex: pageNumber,
    dataUrl,
    width: viewport.width,
    height: viewport.height,
  }

  renderCache.set(cacheKey, result)
  return result
}
