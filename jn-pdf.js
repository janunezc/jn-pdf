program
  .version(packageJson.version)
  .description('Merge images and PDFs into a single PDF file named after the current folder')
  .option('-v, --verbose', 'Display detailed processing information')
  .option('--scale <factor>', 'Scale factor for images (default: 1)', parseFloat, 1)  // Añadimos la opción de escala
  .parse(process.argv);

// Main Async Function
(async () => {
  try {
    const scaleFactor = program.scale || 1;  // Tomamos el valor de escala desde la CLI
    // Resto del código...
    for (const filePath of files) {
      const extension = path.extname(filePath).toLowerCase();

      if (extension === '.pdf') {
        // Código para procesar PDFs...
      } else {
        try {
          log(`Processing Image: ${filePath}`);

          let imageBuffer = await cache.get(filePath);

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

            await cache.set(filePath, imageBuffer);
          }

          const jpgImage = await pdfDoc.embedJpg(imageBuffer);
          const dimensions = jpgImage.scale(scaleFactor);  // Aplicamos la escala a la imagen

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
    // Resto del código...
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
})();
