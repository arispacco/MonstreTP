const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {recursive: true});
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const imageFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Seules les images (JPEG, PNG, WEBP, HEIC, HEIF) sont autorisées.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error);
  }
};

const audioFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/mp3', 'audio/mpeg',
    'audio/ogg',
    'audio/m4a', 'audio/x-m4a',
    'audio/aac',
    'audio/flac',
    'audio/mp4', 'audio/3gpp', 'audio/webm',
    'application/octet-stream'
  ];
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.mp4'];

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    const error = new Error('Seuls les fichiers audio (MP3, WAV, M4A, OGG, AAC) sont autorisés.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error);
  }
};

const uploadImage = {
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
};

const uploadAudio = {
  storage,
  fileFilter: audioFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
};

function cleanupFile(filePath) {
  if (!filePath) {
    return;
  }

  fs.unlink(filePath, error => {
    if (error) {
      console.warn(`Impossible de supprimer ${filePath}: ${error.message}`);
    }
  });
}

module.exports = {
  cleanupFile,
  uploadImage,
  uploadAudio,
};

