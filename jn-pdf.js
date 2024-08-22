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
  .description('Merge images into a PDF file with the name of the current folder')
  .parse(process.argv);

(async () => {
  const pwd = process.cwd();
  const folderName = path.basename(pwd);

  const files = glob.sync('*.{png,jpg,jpeg,gif}', { cwd: pwd }).sort();

  if (files.length === 0) {
    console.log('No image files found in the current directory.');
    return;
  }

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const filePath = path.join(pwd, file);
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

  const pdfBytes = await pdfDoc.save();
  const outputFilePath = path.join(pwd, `${folderName}.pdf`);
  fs.writeFileSync(outputFilePath, pdfBytes);

  console.log(`PDF created: ${outputFilePath}`);
})();
