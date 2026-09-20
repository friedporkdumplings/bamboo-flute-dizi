"use client";

import { ChevronLeft, ChevronRight, FileImage, FileText, ListMusic, Upload, X } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";

type SheetViewerProps = {
  demo: ReactNode;
  fallbackLabel?: string;
  onEnterNotes: () => void;
};

type PreviewFile = {
  name: string;
  kind: "image" | "pdf";
  url?: string;
};

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "application/pdf"]);
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export default function SheetViewer({ demo, fallbackLabel = "Demo sheet · Page 1 of 1", onEnterNotes }: SheetViewerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    return () => {
      renderTaskRef.current?.cancel();
      void pdfDocument?.cleanup();
      if (previewFile?.url) URL.revokeObjectURL(previewFile.url);
    };
  }, [pdfDocument, previewFile]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;
    let cancelled = false;

    const renderPage = async () => {
      setStatus("loading");
      try {
        const page = await pdfDocument.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(canvas.parentElement?.clientWidth ?? 280, 220);
        const viewport = page.getViewport({ scale: availableWidth / baseViewport.width });
        const pixelRatio = window.devicePixelRatio || 1;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable");

        renderTaskRef.current?.cancel();
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        renderTaskRef.current = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await renderTaskRef.current.promise;
        if (!cancelled) setStatus("ready");
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) {
          setStatus("error");
          setErrorMessage("This PDF page could not be rendered.");
        }
      }
    };

    void renderPage();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pageNumber, pdfDocument]);

  const clearFile = () => {
    renderTaskRef.current?.cancel();
    void pdfDocument?.cleanup();
    if (previewFile?.url) URL.revokeObjectURL(previewFile.url);
    setPreviewFile(null);
    setPdfDocument(null);
    setPageNumber(1);
    setStatus("idle");
    setErrorMessage("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    clearFile();
    if (!ALLOWED_TYPES.has(file.type)) {
      setStatus("error");
      setErrorMessage("Choose a PNG, JPG, JPEG, or PDF file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setStatus("error");
      setErrorMessage("Choose a file smaller than 25 MB.");
      return;
    }

    setStatus("loading");
    if (file.type.startsWith("image/")) {
      setPreviewFile({ name: file.name, kind: "image", url: URL.createObjectURL(file) });
      setStatus("ready");
      return;
    }

    try {
      setPreviewFile({ name: file.name, kind: "pdf" });
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      const data = new Uint8Array(await file.arrayBuffer());
      const document = await pdfjs.getDocument({ data }).promise;
      setPdfDocument(document);
      setPageNumber(1);
    } catch {
      setStatus("error");
      setErrorMessage("We couldn’t open this PDF. Try another file.");
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
        onChange={selectFile}
      />

      <div className={`sheet-viewer ${previewFile ? "has-upload" : ""}`}>
        {!previewFile && status !== "error" && demo}

        {previewFile?.kind === "image" && previewFile.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="uploaded-sheet-image" src={previewFile.url} alt={`Uploaded sheet: ${previewFile.name}`} />
        )}

        {previewFile?.kind === "pdf" && (
          <div className="pdf-canvas-wrap">
            <canvas ref={canvasRef} aria-label={`Page ${pageNumber} of ${pdfDocument?.numPages ?? 1}`} />
          </div>
        )}

        {status === "loading" && (
          <div className="sheet-loading"><span className="camera-spinner" /><span>Preparing preview…</span></div>
        )}

        {status === "error" && (
          <div className="sheet-upload-error">
            <FileText size={24} />
            <strong>Couldn’t load sheet</strong>
            <span>{errorMessage}</span>
            <button onClick={() => inputRef.current?.click()}>Choose another file</button>
          </div>
        )}
      </div>

      <div className="sheet-caption sheet-upload-controls">
        <span>
          {previewFile?.kind === "pdf" ? <FileText size={15} /> : <FileImage size={15} />}
          {previewFile ? previewFile.name : fallbackLabel}
        </span>

        {previewFile?.kind === "pdf" && pdfDocument && pdfDocument.numPages > 1 && (
          <span className="pdf-page-controls">
            <button onClick={() => setPageNumber((page) => Math.max(1, page - 1))} disabled={pageNumber === 1} aria-label="Previous PDF page"><ChevronLeft size={14} /></button>
            <span>{pageNumber} / {pdfDocument.numPages}</span>
            <button onClick={() => setPageNumber((page) => Math.min(pdfDocument.numPages, page + 1))} disabled={pageNumber === pdfDocument.numPages} aria-label="Next PDF page"><ChevronRight size={14} /></button>
          </span>
        )}

        <span className="sheet-file-actions">
          <button className="manual-notes-button" onClick={onEnterNotes}><ListMusic size={14} /> Notes</button>
          {previewFile && <button onClick={clearFile} aria-label="Remove uploaded sheet"><X size={14} /></button>}
          <button className="upload-sheet-button" onClick={() => inputRef.current?.click()}><Upload size={14} /> {previewFile ? "Replace" : "Upload"}</button>
        </span>
      </div>
    </>
  );
}
