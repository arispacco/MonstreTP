const express = require('express');
const multer = require('multer');
const {cleanupFile, uploadImage} = require('../services/uploads');
const {generateCaptionFromImage} = require('../services/gemini');

const router = express.Router();
const singleImage = multer(uploadImage).single('image');

router.post('/', (req, res, next) => {
  singleImage(req, res, async error => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'Le fichier image est trop volumineux. La limite est de 8 Mo.',
        });
      }
      if (error.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          error: error.message,
        });
      }
      return next(error);
    }

    if (!req.file) {
      return res.status(400).json({error: 'Fichier image obligatoire.'});
    }

    try {
      const result = await generateCaptionFromImage(req.file.path, req.file.mimetype);
      res.json(result);
    } catch (err) {
      next(err);
    } finally {
      cleanupFile(req.file.path);
    }
  });
});

module.exports = router;

