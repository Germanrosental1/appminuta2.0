import { MobileBlockerMiddleware } from './mobile-blocker.middleware';
import { ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

describe('MobileBlockerMiddleware', () => {
    let middleware: MobileBlockerMiddleware;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        middleware = new MobileBlockerMiddleware();
        mockReq = {
            headers: {},
            originalUrl: '/api/dashboard',
            ip: '127.0.0.1'
        };
        mockRes = {};
        next = jest.fn();
    });

    it('should allow access for non-mobile user agents (Desktop)', () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        middleware.use(mockReq as Request, mockRes as Response, next);

        expect(next).toHaveBeenCalled();
    });

    it('should block access for iPhone', () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

        expect(() => {
            middleware.use(mockReq as Request, mockRes as Response, next);
        }).toThrow(ForbiddenException);
        expect(next).not.toHaveBeenCalled();
    });

    it('should block access for Android Mobile', () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36';

        expect(() => {
            middleware.use(mockReq as Request, mockRes as Response, next);
        }).toThrow(ForbiddenException);
    });

    it('should allow whitelisted paths (health)', () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (iPhone; ...)'; // Mobile UA
        mockReq.originalUrl = '/health'; // Whitelisted path

        middleware.use(mockReq as Request, mockRes as Response, next);

        expect(next).toHaveBeenCalled();
    });

    it('should allow whitelisted API mobile paths', () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (iPhone; ...)';
        mockReq.originalUrl = '/api/mobile/login';

        middleware.use(mockReq as Request, mockRes as Response, next);

        expect(next).toHaveBeenCalled();
    });
});
