# Install Required Dependencies for ID Card Photo Generation

## Dependencies Added to package.json:
- `html2canvas`: ^1.4.1 - For converting HTML elements to canvas/images
- `jszip`: ^3.10.1 - For creating ZIP files with organized folders
- `@types/jszip`: ^3.4.1 - TypeScript types for JSZip

## Installation Command:
```bash
npm install
```

Or install individually:
```bash
npm install html2canvas jszip @types/jszip
```

## What this enables:
1. **Photo Generation**: Converts ID card React components to PNG images
2. **Folder Organization**: Creates individual folders for each student using their sequence ID
3. **ZIP Download**: Packages all student folders into a single ZIP file
4. **High Quality**: 3x scale for crisp, print-ready images

## Folder Structure Generated:
```
ID_Cards_Class_Section_Orientation.zip
├── STU001/
│   ├── STU001_front.png
│   └── STU001_back.png
├── STU002/
│   ├── STU002_front.png
│   └── STU002_back.png
└── ...
```

## Usage:
1. Select class and section
2. Choose orientation (landscape/portrait)
3. Preview ID cards on the page
4. Click "Download PNG Images" to generate ZIP file
