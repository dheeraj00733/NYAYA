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