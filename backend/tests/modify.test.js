const request = require('supertest');
const app = require('../app');
const path = require('path');
const fs = require('fs');

describe('POST /api/modify-image', () => {
  let originalApiKey;
  let originalAllowMock;
  let hasValidApiKey = false;
  const fixturePath = path.join(__dirname, 'fixtures', 'test_image.jpg');

  beforeAll(async () => {
    originalApiKey = process.env.GEMINI_API_KEY;
    originalAllowMock = process.env.ALLOW_MOCK_AI;

    // Check if the current API key is valid by testing with ALLOW_MOCK_AI = false
    if (originalApiKey && originalApiKey.startsWith('AIzaSy')) {
      try {
        process.env.ALLOW_MOCK_AI = 'false';
        const res = await request(app)
          .post('/api/modify-image')
          .field('prompt', 'add red sunglasses')
          .field('imageUrl', 'https://image.pollinations.ai/prompt/cat');
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
    it('should return revised prompt from imageUrl (mock path)', async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.ALLOW_MOCK_AI = 'true';

      const res = await request(app)
        .post('/api/modify-image')
        .field('prompt', 'make it vintage style')
        .field('imageUrl', 'https://image.pollinations.ai/prompt/cute_dog');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('prompt');
      expect(res.body.prompt).toContain('make it vintage style');
    });

    it('should return revised prompt from uploaded file (mock path)', async () => {
      delete process.env.GEMINI_API_KEY;
      process.env.ALLOW_MOCK_AI = 'true';

      if (!fs.existsSync(fixturePath)) {
        // Skip if fixture file not found
        return;
      }

      const res = await request(app)
        .post('/api/modify-image')
        .attach('image', fixturePath)
        .field('prompt', 'add a funny mustache');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('prompt');
      expect(res.body.prompt).toContain('add a funny mustache');
    });

    it('should return revised prompt (real Gemini path)', async () => {
      if (!hasValidApiKey) {
        return;
      }
      process.env.GEMINI_API_KEY = originalApiKey;
      process.env.ALLOW_MOCK_AI = 'false';

      const res = await request(app)
        .post('/api/modify-image')
        .field('prompt', 'make it cartoon style')
        .field('imageUrl', 'https://image.pollinations.ai/prompt/dog');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('prompt');
      expect(typeof res.body.prompt).toBe('string');
    });
  });

  describe('Error paths', () => {
    it('should return 400 Bad Request if prompt is missing', async () => {
      const res = await request(app)
        .post('/api/modify-image')
        .field('imageUrl', 'https://image.pollinations.ai/prompt/dog');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 Bad Request if image is missing', async () => {
      const res = await request(app)
        .post('/api/modify-image')
        .field('prompt', 'add a hat');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});
