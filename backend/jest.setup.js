// jest.setup.js — Variables de entorno globales para la suite de tests
process.env.OPENAI_API_KEY    = 'sk-test-mock-000000000000000000000000000000000000000000000000';
process.env.RESEND_API_KEY    = 're_mock_test_key';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_stripe_key_000000000000000000000000000';
process.env.JWT_SECRET         = 'test-jwt-secret-workly';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-workly';
process.env.DB_HOST     = 'localhost';
process.env.DB_PORT     = '3306';
process.env.DB_USER     = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME     = 'workly_test';
process.env.NODE_ENV    = 'test';
process.env.PORT        = '3001';
process.env.FRONTEND_URL = 'http://localhost:5173';