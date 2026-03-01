import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';
import { storage } from '../../server/storage';
import { createServer } from 'http';

vi.mock('../../server/storage', () => ({
    storage: {
        getSignals: vi.fn(),
        createSignal: vi.fn(),
    }
}));

describe('Notifications & Alerts API Tests', () => {
    let app: express.Express;

    beforeEach(async () => {
        app = express();
        app.use(express.json());
        const httpServer = createServer(app);
        await registerRoutes(httpServer, app);
        vi.clearAllMocks();
    });

    it('POST /api/signals should create a new signal', async () => {
        vi.mocked(storage.getSignals).mockResolvedValue([]);
        const mockSignal = { id: 1, symbol: 'BTC', direction: 'BUY', entry: 50000, stopLoss: 49000, takeProfits: [55000], status: 'PENDING', timestamp: new Date(), telegramMessageId: '123' };
        vi.mocked(storage.createSignal).mockResolvedValue(mockSignal as any);

        const payload = {
            symbol: 'BTC',
            direction: 'BUY',
            entry: 50000,
            stopLoss: 49000,
            takeProfits: [55000],
            telegramMessageId: '123',
        };

        const res = await request(app).post('/api/signals').send(payload);

        expect(res.status).toBe(200);
        expect(res.body.symbol).toBe('BTC');
        expect(storage.createSignal).toHaveBeenCalledWith(expect.objectContaining(payload));
    });

    it('POST /api/signals should reject duplicate signals within 2 hours', async () => {
        const recentDate = new Date();
        vi.mocked(storage.getSignals).mockResolvedValue([
            { symbol: 'ETH', direction: 'SELL', timestamp: recentDate } as any
        ]);

        const payload = {
            symbol: 'ETH',
            direction: 'SELL',
            entry: 3000,
            stopLoss: 3100,
            takeProfits: [2900],
            telegramMessageId: '124',
        };

        const res = await request(app).post('/api/signals').send(payload);

        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/Duplicate signal/);
        expect(storage.createSignal).not.toHaveBeenCalled();
    });
});
