const express = require('express');
const multer = require('multer');
const {cleanupFile, uploadImage} = require('../services/uploads');
const {generatePromptForModifiedImage, generatePromptForFaceSwap} = require('../services/gemini');

const router = express.Router();
// Accept two separate fields for the fusion feature
const uploadFields = multer(uploadImage).fields([
  {name: 'image', maxCount: 1},
  {name: 'subjectImage', maxCount: 1},
]);

router.post('/', (req, res, next) => {
  uploadFields(req, res, async error => {
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
    const subjectImageUrl = typeof req.body.subjectImageUrl === 'string' ? req.body.subjectImageUrl.trim() : '';

    // File references from upload
    const file1 = req.files && req.files.image ? req.files.image[0] : null;
    const file2 = req.files && req.files.subjectImage ? req.files.subjectImage[0] : null;

    // We need at least the main image (file or URL)
    if (!file1 && !imageUrl) {
      if (file2) cleanupFile(file2.path);
      return res.status(400).json({error: 'Une image d’origine (fichier ou URL) est obligatoire.'});
    }

    const image1Source = file1 ? file1.path : imageUrl;
    const image2Source = file2 ? file2.path : subjectImageUrl;

    try {
      if (image1Source && image2Source) {
        // Face swap / fusion case
        const revisedPrompt = await generatePromptForFaceSwap(image1Source, image2Source);
        res.json({prompt: revisedPrompt});
      } else {
        // Standard modification case
        if (!prompt) {
          if (file1) cleanupFile(file1.path);
          return res.status(400).json({error: 'La consigne de modification (prompt) est obligatoire.'});
        }
        const revisedPrompt = await generatePromptForModifiedImage(image1Source, prompt);
        res.json({prompt: revisedPrompt});
      }
    } catch (err) {
      next(err);
    } finally {
      if (file1) cleanupFile(file1.path);
      if (file2) cleanupFile(file2.path);
    }
  });
});

module.exports = router;
