require('dotenv').config();

const cors = require('cors');
const express = require('express');
const contextRoutes = require('./routes/context');
const remixerRoutes = require('./routes/remixer');
const voiceRoutes = require('./routes/voice');

const app = express();

app.use(cors({origin: true}));
app.use(express.json({limit: '1mb'}));

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

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.publicMessage || 'Erreur serveur',
  });
});

module.exports = app;
