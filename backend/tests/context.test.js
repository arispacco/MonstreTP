const request = require('supertest');
const app = require('../app');

describe('POST /api/context', () => {
  let originalApiKey;
  let originalAllowMock;
  let hasValidApiKey = false;

  beforeAll(async () => {
    originalApiKey = process.env.GEMINI_API_KEY;
    originalAllowMock = process.env.ALLOW_MOCK_AI;

    // Check if the current API key is valid by testing with ALLOW_MOCK_AI = false
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
  });

  describe('Success paths', () => {
    it('should generate caption from text (mock path)', async () => {
      // Force mock path
      delete process.env.GEMINI_API_KEY;
      process.env.ALLOW_MOCK_AI = 'true';

      const res = await request(app)
        .post('/api/context')
        .send({ text: 'Test user prompt' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('caption');
      expect(res.body).toHaveProperty('tone');
      expect(res.body.caption).toContain('Test user prompt');
    });

    it('should generate caption from text (real Gemini path)', async () => {
      if (!hasValidApiKey) {
        // Skip assertions if no valid API key
        return;
      }
      process.env.GEMINI_API_KEY = originalApiKey;
      process.env.ALLOW_MOCK_AI = 'false';

      const res = await request(app)
        .post('/api/context')
        .send({ text: 'Bonjour de test integration' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('caption');
      expect(res.body).toHaveProperty('tone');
    });
  });

  describe('Error paths', () => {
    it('should return 400 Bad Request if text is missing', async () => {
      const res = await request(app)
        .post('/api/context')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Le texte est obligatoire.' });
    });

    it('should return 400 Bad Request if text is empty', async () => {
      const res = await request(app)
        .post('/api/context')
        .send({ text: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Le texte est obligatoire.' });
    });

    it('should return 400 Bad Request if text contains only spaces', async () => {
      const res = await request(app)
        .post('/api/context')
        .send({ text: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Le texte est obligatoire.' });
    });

    it('should return 413 Payload Too Large if text exceeds 1200 characters', async () => {
      const longText = 'a'.repeat(1201);
      const res = await request(app)
        .post('/api/context')
        .send({ text: longText });

      expect(res.statusCode).toBe(413);
      expect(res.body).toEqual({
        error: 'Le texte ne doit pas depasser 1200 caracteres.',
      });
    });

    it('should return 500 error if key is missing and allowMock is false', async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.ALLOW_MOCK_AI = 'false';

      const res = await request(app)
        .post('/api/context')
        .send({ text: 'Test text' });

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'Service IA non configure.' });
    });

    it('should return 502 error if key is invalid and allowMock is false', async () => {
      process.env.GEMINI_API_KEY = 'invalid-key-format';
      process.env.ALLOW_MOCK_AI = 'false';

      const res = await request(app)
        .post('/api/context')
        .send({ text: 'Test text' });

      expect(res.statusCode).toBe(502);
      expect(res.body).toEqual({ error: 'Generation IA indisponible.' });
    });
  });
});
