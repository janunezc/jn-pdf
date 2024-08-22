
# jn-pdf

A command-line utility that scans files in the current directory, sorts them by name, and merges all images into a single PDF file named after the directory.

## Installation

You can install `jn-pdf` globally using npm:

```bash
npm i jn-pdf -g
```

## Usage

After installing globally, you can use `jn-pdf` in any directory containing image files. Navigate to the directory you want to convert and run:

```bash
jn-pdf
```

This will create a PDF file named after the current directory, containing all images sorted by name.

## Windows Explorer Integration (Optional)

You can add a context menu option in Windows File Explorer to use `jn-pdf` directly from the right-click menu.

1. Create a batch script `jn-pdf.bat`:

   ```batch
   @echo off
   cd /d %1
   jn-pdf
   ```

2. Save the batch script in a directory included in your system's PATH.

3. Add the following registry entries:

   - Open the Registry Editor (`regedit`).
   - Navigate to `HKEY_CLASSES_ROOT\Directory\Background\shell`.
   - Create a new key named `jn-pdf`.
   - Set the `(Default)` value to `Merge Images to PDF`.
   - Under `jn-pdf`, create a key named `command`.
   - Set the `(Default)` value of `command` to `"C:\path\to\jn-pdf.bat" "%V"`.

Once set up, you can right-click in any folder and select "Merge Images to PDF" to run `jn-pdf`.

## Dependencies

- `pdf-lib` for creating PDF files.
- `glob` for pattern matching to find image files.
- `commander` for handling command-line arguments.
- `canvas` for loading images in the Node.js environment.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
