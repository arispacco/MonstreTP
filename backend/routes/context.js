const express = require('express');
const {generateCaptionFromText} = require('../services/gemini');

const router = express.Router();
const maxTextLength = 1200;

router.post('/', async (req, res, next) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';

    if (!text) {
      return res.status(400).json({error: 'Le texte est obligatoire.'});
    }

    if (text.length > maxTextLength) {
      return res.status(413).json({
        error: `Le texte ne doit pas depasser ${maxTextLength} caracteres.`,
      });
    }

    const {tone, country, format, style} = req.body;
    const result = await generateCaptionFromText(text, tone, country, format, style);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
