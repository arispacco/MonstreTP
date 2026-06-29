/* global Buffer */
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../app');

describe('POST /api/voice', () => {
  const fixturesDir = path.join(__dirname, 'fixtures', 'voice');
  const uploadDir = path.join(__dirname, '../uploads');
  let originalApiKey;
  let originalAllowMock;
  let hasValidApiKey = false;

  beforeAll(async () => {
    originalApiKey = process.env.GEMINI_API_KEY;
    originalAllowMock = process.env.ALLOW_MOCK_AI;

    // Create fixtures
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    fs.writeFileSync(path.join(fixturesDir, 'test.mp3'), Buffer.from('dummy mp3 content'));
    fs.writeFileSync(path.join(fixturesDir, 'invalid.txt'), Buffer.from('dummy text content'));

    // Check if the current API key is valid
    if (originalApiKey && originalApiKey.startsWith('AIzaSy')) {
      try {
        process.env.ALLOW_MOCK_AI = 'false';
        const res = await request(app)
          .post('/api/context')
          .send({ text: 'Hello' });
        if (res.statusCode === 200) {
          hasValidApiKey = true;
        }
      } catch (err) {
        hasValidApiKey = false;
      } finally {
        process.env.ALLOW_MOCK_AI = originalAllowMock;
      }
    }
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
    process.env.ALLOW_MOCK_AI = originalAllowMock;
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = originalApiKey;
    process.env.ALLOW_MOCK_AI = originalAllowMock;

    // Clean up fixtures
    if (fs.existsSync(fixturesDir)) {
      fs.rmSync(fixturesDir, { recursive: true, force: true });
    }
  });

  describe('Success paths', () => {
    it('should process audio and return mock captions when using mock path', async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.ALLOW_MOCK_AI = 'true';

      const filesBefore = fs.readdirSync(uploadDir);

      const res = await request(app)
        .post('/api/voice')
        .attach('audio', path.join(fixturesDir, 'test.mp3'));

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('transcription');
      expect(res.body).toHaveProperty('caption');
      expect(res.body).toHaveProperty('tone');

      // Wait a short time for cleanup to finish, then check file cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      const filesAfter = fs.readdirSync(uploadDir);
      expect(filesAfter.length).toBe(filesBefore.length);
    });

    it('should process audio and return captions when using real Gemini API', async () => {
      if (!hasValidApiKey) {
        return;
      }

      process.env.GEMINI_API_KEY = originalApiKey;
      process.env.ALLOW_MOCK_AI = 'false';

      const filesBefore = fs.readdirSync(uploadDir);

      const res = await request(app)
        .post('/api/voice')
        .attach('audio', path.join(fixturesDir, 'test.mp3'));

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('transcription');
      expect(res.body).toHaveProperty('caption');
      expect(res.body).toHaveProperty('tone');

      await new Promise(resolve => setTimeout(resolve, 100));
      const filesAfter = fs.readdirSync(uploadDir);
      expect(filesAfter.length).toBe(filesBefore.length);
    });
  });

  describe('Error paths', () => {
    it('should return 400 if audio field is missing', async () => {
      const res = await request(app)
        .post('/api/voice');

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Fichier audio obligatoire.' });
    });

    it('should return 400 if invalid file type is uploaded', async () => {
      const res = await request(app)
        .post('/api/voice')
        .attach('audio', path.join(fixturesDir, 'invalid.txt'));

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Seuls les fichiers audio');
    });

    it('should return 413 if file is larger than 8MB', async () => {
      const largeBuffer = Buffer.alloc(8.1 * 1024 * 1024);
      const res = await request(app)
        .post('/api/voice')
        .attach('audio', largeBuffer, { filename: 'large.mp3', contentType: 'audio/mp3' });

      expect(res.statusCode).toBe(413);
      expect(res.body.error).toContain('Le fichier audio est trop volumineux');
    });

    it('should return 500 if key is missing and allowMock is false', async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.ALLOW_MOCK_AI = 'false';

      const res = await request(app)
        .post('/api/voice')
        .attach('audio', path.join(fixturesDir, 'test.mp3'));

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'Service IA non configure.' });
    });
  });
});
