const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();
const dataFilePath = path.join(__dirname, '../storage/data/apks.json');
const apkUploadsDir = path.join(__dirname, '../storage/uploads/apks');

// Ensure data folder and file exist
if (!fs.existsSync(path.dirname(dataFilePath))) {
  fs.mkdirSync(path.dirname(dataFilePath), {recursive: true});
}
if (!fs.existsSync(dataFilePath)) {
  fs.writeFileSync(dataFilePath, JSON.stringify([]));
}

// Ensure APK uploads directory exists
if (!fs.existsSync(apkUploadsDir)) {
  fs.mkdirSync(apkUploadsDir, {recursive: true});
}

// Set up multer for APK file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, apkUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'app-' + uniqueSuffix + '.apk');
  },
});

const upload = multer({
  storage,
  limits: {fileSize: 100 * 1024 * 1024}, // 100MB limit for APKs
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension === '.apk') {
      cb(null, true);
    } else {
      const error = new Error('Seuls les fichiers APK (.apk) sont autorises.');
      error.code = 'INVALID_FILE_TYPE';
      cb(error);
    }
  },
});

// GET /api/apks - List all uploaded apps
router.get('/', (req, res, next) => {
  try {
    const fileData = fs.readFileSync(dataFilePath, 'utf8');
    const apks = JSON.parse(fileData);
    res.json(apks.reverse()); // Newest first
  } catch (err) {
    next(err);
  }
});

// POST /api/apks/upload - Upload an APK and save its info
router.post('/upload', upload.single('apk'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({error: 'Fichier APK obligatoire.'});
    }

    const {name, packageName, version, description} = req.body;
    
    if (!name || !version) {
      // Cleanup file if validation fails
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({error: 'Le nom et la version sont obligatoires.'});
    }

    const fileData = fs.readFileSync(dataFilePath, 'utf8');
    const apks = JSON.parse(fileData);

    const sizeInMB = (req.file.size / (1024 * 1024)).toFixed(1) + ' MB';

    const newApk = {
      id: 'apk-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name,
      packageName: packageName || 'com.example.' + name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      version,
      description: description || 'Aucune description fournie.',
      size: sizeInMB,
      filename: req.file.filename,
      originalName: req.file.originalname,
      createdAt: new Date().toISOString(),
    };

    apks.push(newApk);
    fs.writeFileSync(dataFilePath, JSON.stringify(apks, null, 2));

    res.status(201).json(newApk);
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
});

// GET /api/apks/download/:filename - Direct APK file download
router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  // Prevent directory traversal attacks
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({error: 'Nom de fichier invalide.'});
  }

  const filePath = path.join(apkUploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({error: 'Fichier APK introuvable.'});
  }

  res.download(filePath, filename, err => {
    if (err) {
      console.warn(`Erreur lors du telechargement de ${filename}:`, err);
    }
  });
});

module.exports = router;
