require('dotenv').config();

const cors = require('cors');
const express = require('express');
const contextRoutes = require('./routes/context');
const remixerRoutes = require('./routes/remixer');
const voiceRoutes = require('./routes/voice');
const modifyRoutes = require('./routes/modify');
const publicMemesRoutes = require('./routes/public_memes');
const path = require('path');

const app = express();

app.use(cors({origin: true}));
app.use(express.json({limit: '1mb'}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'memeai-backend',
    ai: process.env.GEMINI_API_KEY ? 'configured' : 'mock',
  });
});

app.use('/api/context', contextRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/remixer', remixerRoutes);
app.use('/api/modify-image', modifyRoutes);
app.use('/api/public-memes', publicMemesRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.publicMessage || 'Erreur serveur',
  });
});

module.exports = app;
