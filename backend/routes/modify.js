const express = require('express');
const multer = require('multer');
const {cleanupFile, uploadImage} = require('../services/uploads');
const {generatePromptForModifiedImage} = require('../services/gemini');

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

    const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
    const imageUrl = typeof req.body.imageUrl === 'string' ? req.body.imageUrl.trim() : '';

    if (!prompt) {
      if (req.file) cleanupFile(req.file.path);
      return res.status(400).json({error: 'La consigne de modification (prompt) est obligatoire.'});
    }

    if (!req.file && !imageUrl) {
      return res.status(400).json({error: 'Une image (fichier ou URL) est obligatoire.'});
    }

    const imageSource = req.file ? req.file.path : imageUrl;

    try {
      const revisedPrompt = await generatePromptForModifiedImage(imageSource, prompt);
      res.json({prompt: revisedPrompt});
    } catch (err) {
      next(err);
    } finally {
      if (req.file) {
        cleanupFile(req.file.path);
      }
    }
  });
});

module.exports = router;
