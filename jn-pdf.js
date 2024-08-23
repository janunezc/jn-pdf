#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { promisify } = require('util');
const lruCache = require('lru-cache'); // Replacement for inflight
const glob = require('glob'); // Ensure version 9 or later is installed
const sharp = require('sharp');
const commander = require('commander');
const rimraf = require('rimraf'); // Ensure version 4 or later is installed
const packageJson = require('./package.json');

const program = new commander.Command();
const globAsync = promisify(glob);

program
  .version(packageJson.version)
  .description('Merge images and PDFs into a single PDF file named after the current folder')
  .option('-v, --verbose', 'Display detailed processing information')
  .parse(process.argv);

// Announce the version, description, and passed parameters
console.log(`\nDescription: ${program.description()}`);
console.log(`Version: ${program.version()}`);
console.log(`Passed Parameters: ${program.args.join(', ') || 'None'}`);

if (program.verbose) {
  console.log('Verbose mode enabled');
}

(async () => {
  const pwd = process.cwd();
  const folderName = path.basename(pwd);

  // Include both images and PDFs in the file selection using glob
  const files = await globAsync('*.{png,jpg,jpeg,gif,pdf}', { cwd: pwd }).then(res => res.sort());

  if (files.length === 0) {
    console.log('No image or PDF files found in the current directory.');
    return;
  }

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const filePath = path.join(pwd, file);

    if (file.endsWith('.pdf')) {
      const existingPdfBytes = fs.readFileSync(filePath);
      const existingPdfDoc = await PDFDocument.load(existingPdfBytes);
      const copiedPages = await pdfDoc.copyPages(existingPdfDoc, existingPdfDoc.getPageIndices());
      copiedPages.forEach((page) => pdfDoc.addPage(page));
    } else {
      try {
        const image = sharp(filePath);
        const metadata = await image.metadata();
        const imageBuffer = await image.toFormat('jpeg').toBuffer();

        const page = pdfDoc.addPage([metadata.width, metadata.height]);
        const jpgImage = await pdfDoc.embedJpg(imageBuffer);
        page.drawImage(jpgImage, { x: 0, y: 0, width: metadata.width, height: metadata.height });

        if (program.verbose) {
          console.log(`Processed image: ${file}`);
        }
      } catch (error) {
        console.error(`Failed to process image: ${filePath}. Error: ${error.message}`);
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const outputFilePath = path.join(pwd, `${folderName}.pdf`);
  fs.writeFileSync(outputFilePath, pdfBytes);

  console.log(`\nPDF created: ${outputFilePath}`);
})();
