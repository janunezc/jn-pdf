#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const glob = require('glob');
const sharp = require('sharp');
const { Command } = require('commander');
const rimraf = require('rimraf');
const cacheManager = require('cache-manager');
const packageJson = require('./package.json');

// Initialize Commander for CLI Options
const program = new Command();

program
  .version(packageJson.version)
  .description('Merge images and PDFs into a single PDF file named after the current folder')
  .option('-v, --verbose', 'Display detailed processing information')
  .option('--scale <factor>', 'Scale factor for images (default: 1)', parseFloat, 1)
  .parse(process.argv);

// Initialize cache-manager with in-memory cache
const cache = cacheManager.caching({ store: 'memory', max: 100, ttl: 10 /*seconds*/ });

// Utility Function to Log Messages When Verbose Mode is Enabled
const log = (...args) => {
  if (program.verbose) {
    console.log(...args);
  }
};

// Utility Function to Get Cached Image
async function getCachedImage(filePath) {
  return new Promise((resolve, reject) => {
    cache.get(filePath, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// Utility Function to Set Cached Image
async function setCachedImage(filePath, imageBuffer) {
  return new Promise((resolve, reject) => {
    cache.set(filePath, imageBuffer, { ttl: 10 }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// Wrap glob in a promise
const getFiles = (pattern, options) => {
  return new Promise((resolve, reject) => {
    glob(pattern, options, (err, files) => {
      if (err) return reject(err);
      resolve(files);
    });
  });
};

// Main Async Function
(async () => {
  try {
    const pwd = process.cwd();
    const folderName = path.basename(pwd);
    const scaleFactor = program.scale || 1;  // Scale factor for images

    console.log(`\nDescription: ${program.description()}`);
    console.log(`Version: ${program.version()}`);
    console.log(`Working Directory: ${pwd}`);
    console.log(`Output File Name: ${folderName}.pdf`);
    console.log(`Verbose Mode: ${program.verbose ? 'Enabled' : 'Disabled'}\n`);

    // Use the custom getFiles function to get files with a promise
    const files = await getFiles('*.{png,jpg,jpeg,gif,pdf}', { cwd: pwd, absolute: true });

    if (!Array.isArray(files) || files.length === 0) {
      console.log('No image or PDF files found in the current directory.');
      return;
    }

    log('Files Found:', files);

    const pdfDoc = await PDFDocument.create();

    for (const filePath of files) {
      const extension = path.extname(filePath).toLowerCase();

      if (extension === '.pdf') {
        log(`Processing PDF: ${filePath}`);
        const existingPdfBytes = fs.readFileSync(filePath);
        const existingPdfDoc = await PDFDocument.load(existingPdfBytes);
        const copiedPages = await pdfDoc.copyPages(existingPdfDoc, existingPdfDoc.getPageIndices());
        copiedPages.forEach((page) => pdfDoc.addPage(page));
      } else {
        try {
          log(`Processing Image: ${filePath}`);

          // Check Cache First
          let imageBuffer = await getCachedImage(filePath);

          if (!imageBuffer) {
            const image = sharp(filePath);
            const metadata = await image.metadata();

            imageBuffer = await image
              .resize({
                width: Math.floor(metadata.width * scaleFactor),
                height: Math.floor(metadata.height * scaleFactor),
                fit: 'inside'
              })
              .jpeg()
              .toBuffer();

            // Store in Cache
            await setCachedImage(filePath, imageBuffer);
          }

          const jpgImage = await pdfDoc.embedJpg(imageBuffer);
          const dimensions = jpgImage.scale(scaleFactor);  // Apply scaling

          const page = pdfDoc.addPage([dimensions.width, dimensions.height]);
          page.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: dimensions.width,
            height: dimensions.height,
          });

          log(`Successfully processed image: ${filePath}`);
        } catch (error) {
          console.error(`Failed to process image: ${filePath}. Error: ${error.message}`);
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    const outputFilePath = path.join(pwd, `${folderName}.pdf`);
    fs.writeFileSync(outputFilePath, pdfBytes);

    console.log(`\nPDF successfully created at: ${outputFilePath}`);
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
})();
