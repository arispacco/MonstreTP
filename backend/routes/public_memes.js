const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();
const dataFilePath = path.join(__dirname, '../storage/data/public_memes.json');
const publicUploadsDir = path.join(__dirname, '../storage/uploads/public');

// Ensure data folder and file exist
if (!fs.existsSync(path.dirname(dataFilePath))) {
  fs.mkdirSync(path.dirname(dataFilePath), {recursive: true});
}
if (!fs.existsSync(dataFilePath)) {
  fs.writeFileSync(dataFilePath, JSON.stringify([]));
}

// Ensure public uploads directory exists
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, {recursive: true});
}

// Set up multer for public meme image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, publicUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'public-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {fileSize: 10 * 1024 * 1024}, // 10MB limit
});

// GET /api/public-memes - Retrieve all public memes
router.get('/', (req, res, next) => {
  try {
    const fileData = fs.readFileSync(dataFilePath, 'utf8');
    const memes = JSON.parse(fileData);
    // Return newest first
    res.json(memes.reverse());
  } catch (err) {
    next(err);
  }
});

// POST /api/public-memes - Add a new public meme
router.post('/', (req, res, next) => {
  try {
    const {caption, tone, imageUrl, author} = req.body;

    if (!caption) {
      return res.status(400).json({error: 'Le texte (caption) du mème est obligatoire.'});
    }

    const fileData = fs.readFileSync(dataFilePath, 'utf8');
    const memes = JSON.parse(fileData);

    const newMeme = {
      id: 'meme-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      caption,
      tone: tone || 'Humour',
      imageUrl: imageUrl || '',
      author: author || 'Anonyme',
      createdAt: new Date().toISOString(),
    };

    memes.push(newMeme);
    fs.writeFileSync(dataFilePath, JSON.stringify(memes, null, 2));

    res.status(201).json(newMeme);
  } catch (err) {
    next(err);
  }
});

// POST /api/public-memes/upload - Upload a meme image for the gallery
router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({error: 'Fichier image obligatoire.'});
  }

  // Generate public url (absolute path relative to host)
  const relativePath = `/uploads/public/${req.file.filename}`;
  res.json({url: relativePath});
});

module.exports = router;
