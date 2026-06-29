const request = require('supertest');
const app = require('../app');

describe('GET /health', () => {
  let originalApiKey;

  beforeAll(() => {
    originalApiKey = process.env.GEMINI_API_KEY;
  });

  afterAll(() => {
    if (originalApiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalApiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  it('should return health status with AI configured when API key is present', async () => {
    process.env.GEMINI_API_KEY = 'mock-key';
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      service: 'memeai-backend',
      ai: 'configured',
    });
  });

  it('should return health status with AI mock when API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      service: 'memeai-backend',
      ai: 'mock',
    });
  });
});
