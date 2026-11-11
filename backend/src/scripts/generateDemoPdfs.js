const fs = require('fs');
const path = require('path');

function createSimplePdf(pagesText) {
  // Generates a valid multi-page PDF 1.4 using raw PDF syntax
  const objects = [];
  let currentOffset = 9; // strlen("%PDF-1.4\n")

  const offsets = [];

  const addObj = (str) => {
    offsets.push(currentOffset);
    const objStr = `${objects.length + 1} 0 obj\n${str}\nendobj\n`;
    objects.push(objStr);
    currentOffset += Buffer.byteLength(objStr, 'utf8');
    return objects.length;
  };

  // Obj 1: Catalog
  const catalogIdx = addObj(`<< /Type /Catalog /Pages 2 0 R >>`);

  // Obj 2: Pages (placeholder, will fill references)
  // Let's create Font obj first
  const fontIdx = addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  // Create each page and content stream
  const pageObjIndices = [];
  pagesText.forEach((text, i) => {
    // Format text into PDF stream commands
    const lines = text.split('\n');
    let streamBody = 'BT\n/F1 11 Tf\n50 720 Td\n16 TL\n';
    lines.forEach((line) => {
      // Escape parentheses in line
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      streamBody += `(${escaped}) '\n`;
    });
    streamBody += 'ET\n';

    const streamLength = Buffer.byteLength(streamBody, 'utf8');
    const contentIdx = addObj(`<< /Length ${streamLength} >>\nstream\n${streamBody}endstream`);

    const pageIdx = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontIdx} 0 R >> >> /Contents ${contentIdx} 0 R >>`);
    pageObjIndices.push(pageIdx);
  });