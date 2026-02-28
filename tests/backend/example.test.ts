import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// Create a simple dummy app for now, later we'll import the real app
const app = express();
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

describe('Backend API Tests API', () => {
    it('should return health status', async () => {
        const response = await request(app).get('/api/health');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });
});
