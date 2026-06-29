const express = require('express');
const multer = require('multer');
const {cleanupFile, uploadAudio} = require('../services/uploads');
const {generateCaptionFromVoice} = require('../services/gemini');

const router = express.Router();
const singleAudio = multer(uploadAudio).single('audio');

router.post('/', (req, res, next) => {
  singleAudio(req, res, async error => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'Le fichier audio est trop volumineux. La limite est de 8 Mo.',
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
      return res.status(400).json({error: 'Fichier audio obligatoire.'});
    }

    try {
      const result = await generateCaptionFromVoice(req.file.path, req.file.mimetype, req.body.tone);
      res.json(result);
    } catch (err) {
      next(err);
    } finally {
      cleanupFile(req.file.path);
    }
  });
});

module.exports = router;

