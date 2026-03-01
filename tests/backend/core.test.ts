import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';
import { storage } from '../../server/storage';
import { createServer } from 'http';

vi.mock('../../server/storage', () => {
    return {
        storage: {
            getSettings: vi.fn(),
            getSetting: vi.fn(),
            upsertSetting: vi.fn(),
            getSignals: vi.fn(),
            createSignal: vi.fn(),
        }
    };
});

describe('Core System API Tests', () => {
    let app: express.Express;

    beforeEach(async () => {
        app = express();
        app.use(express.json());
        const httpServer = createServer(app);
        await registerRoutes(httpServer, app);
        vi.clearAllMocks();
    });

    it('GET /api/settings should return settings', async () => {
        const mockSettings = [{ id: 1, key: 'test_key', value: 'test_value' }];
        vi.mocked(storage.getSettings).mockResolvedValue(mockSettings as any);

        const res = await request(app).get('/api/settings');
        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockSettings);
    });

    it('POST /api/settings should upsert a setting', async () => {
        const newSetting = { key: 'new_key', value: 'new_value' };
        const savedSetting = { id: 2, key: 'new_key', value: 'new_value' };
        vi.mocked(storage.upsertSetting).mockResolvedValue(savedSetting as any);

        const res = await request(app)
            .post('/api/settings')
            .send(newSetting);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(savedSetting);
        expect(storage.upsertSetting).toHaveBeenCalledWith(expect.objectContaining(newSetting));
    });
});
