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

   // Re-encode Pages container
  const kidsStr = pageObjIndices.map(idx => `${idx} 0 R`).join(' ');
  const pagesObjStr = `<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${pageObjIndices.length} >>`;

  // We rewrite objects[1] (Obj 2: Pages)
  objects[1] = `2 0 obj\n${pagesObjStr}\nendobj\n`;

  // Recalculate offsets properly
  let runningOffset = 9;
  const finalOffsets = [0]; // 0000000000 65535 f
  for (let i = 0; i < objects.length; i++) {
    finalOffsets.push(runningOffset);
    runningOffset += Buffer.byteLength(objects[i], 'utf8');
  }

  // Build xref
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const off = finalOffsets[i].toString().padStart(10, '0');
    xref += `${off} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${runningOffset}\n%%EOF\n`;

  return Buffer.from(`%PDF-1.4\n${objects.join('')}${xref}${trailer}`, 'utf8');
}

const uploadsDir = path.resolve(__dirname, '../../../storage/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
