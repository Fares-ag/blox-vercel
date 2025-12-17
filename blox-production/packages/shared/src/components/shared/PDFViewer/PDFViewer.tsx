import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Box, IconButton, Typography, CircularProgress } from '@mui/material';
import { ZoomIn, ZoomOut, Print, Download } from '@mui/icons-material';
import printJS from 'print-js';
// Import react-pdf CSS files - using correct path for Vite
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PDFViewer.scss';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
  title?: string;
  onClose?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ url, title }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    setError('Failed to load PDF document');
    setLoading(false);
    console.error('PDF load error:', error);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handlePrint = () => {
    printJS({
      printable: url,
      type: 'pdf',
    });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = title || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  return (
    <Box className="pdf-viewer">
      {title && (
        <Box className="pdf-viewer-header">
          <Typography variant="h5">{title}</Typography>
        </Box>
      )}

      <Box className="pdf-viewer-toolbar">
        <Box className="toolbar-left">
          <IconButton onClick={handleZoomOut} disabled={scale <= 0.5} size="small">
            <ZoomOut />
          </IconButton>
          <Typography variant="body2" className="scale-indicator">
            {Math.round(scale * 100)}%
          </Typography>
          <IconButton onClick={handleZoomIn} disabled={scale >= 3.0} size="small">
            <ZoomIn />
          </IconButton>
        </Box>

        <Box className="toolbar-center">
          <IconButton onClick={goToPreviousPage} disabled={pageNumber <= 1} size="small">
            Previous
          </IconButton>
          <Typography variant="body2">
            Page {pageNumber} of {numPages}
          </Typography>
          <IconButton onClick={goToNextPage} disabled={pageNumber >= numPages} size="small">
            Next
          </IconButton>
        </Box>

        <Box className="toolbar-right">
          <IconButton onClick={handlePrint} size="small" title="Print">
            <Print />
          </IconButton>
          <IconButton onClick={handleDownload} size="small" title="Download">
            <Download />
          </IconButton>
        </Box>
      </Box>

      <Box className="pdf-viewer-content">
        {loading && (
          <Box className="pdf-loading">
            <CircularProgress />
            <Typography variant="body2">Loading PDF...</Typography>
          </Box>
        )}

        {error && (
          <Box className="pdf-error">
            <Typography variant="body1" color="error">
              {error}
            </Typography>
          </Box>
        )}

        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<CircularProgress />}
        >
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </Box>
    </Box>
  );
};
