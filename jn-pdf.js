#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const glob = require('glob');
const commander = require('commander');
const { createCanvas, loadImage } = require('canvas');

const program = new commander.Command();

program
  .version('1.0.0')
  .description('Merge images and PDFs into a single PDF file named after the current folder')
  .parse(process.argv);

(async () => {
  const pwd = process.cwd();
  const folderName = path.basename(pwd);

  // Include both images and PDFs in the file selection
  const files = glob.sync('*.{png,jpg,jpeg,gif,pdf}', { cwd: pwd }).sort();

  if (files.length === 0) {
    console.log('No image or PDF files found in the current directory.');
    return;
  }

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const filePath = path.join(pwd, file);

    if (file.endsWith('.pdf')) {
      // If the file is a PDF, embed its pages into the new PDF
      const existingPdfBytes = fs.readFileSync(filePath);
      const existingPdfDoc = await PDFDocument.load(existingPdfBytes);
      const copiedPages = await pdfDoc.copyPages(existingPdfDoc, existingPdfDoc.getPageIndices());
      copiedPages.forEach((page) => {
        pdfDoc.addPage(page);
      });
    } else {
      // If the file is an image, embed it as before
      const img = await loadImage(filePath);
      const page = pdfDoc.addPage([img.width, img.height]);
      const jpgImage = await pdfDoc.embedJpg(fs.readFileSync(filePath));
      page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const outputFilePath = path.join(pwd, `${folderName}.pdf`);
  fs.writeFileSync(outputFilePath, pdfBytes);

  console.log(`PDF created: ${outputFilePath}`);
})();
