import { ApiResponseInterceptor } from './api-response.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ApiResponse } from '../dto/api-response.dto';

describe('ApiResponseInterceptor', () => {
    let interceptor: ApiResponseInterceptor<any>;

    beforeEach(() => {
        interceptor = new ApiResponseInterceptor();
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    it('should wrap successful response into ApiResponse format', (done) => {
        const data = { id: 1, name: 'Test' };
        const mockRequest = {
            path: '/api/test',
            method: 'GET',
            id: 'req-123',
        };

        const mockExecutionContext = {
            switchToHttp: jest.fn().mockReturnThis(),
            getRequest: jest.fn().mockReturnValue(mockRequest),
        } as unknown as ExecutionContext;

        const mockCallHandler = {
            handle: jest.fn().mockReturnValue(of(data)),
        } as CallHandler;

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
            expect(result).toBeInstanceOf(ApiResponse);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(data);
            expect(result.metadata.path).toBe('/api/test');
            expect(result.metadata.method).toBe('GET');
            expect(result.metadata.requestId).toBe('req-123');
            expect(result.metadata.duration).toBeDefined();
            done();
        });
    });

    it('should not double wrap if already an ApiResponse', (done) => {
        const existingResponse = new ApiResponse({ some: 'data' }, 'Custom message', { path: '/custom' });

        const mockRequest = { path: '/api/test', method: 'GET' };
        const mockExecutionContext = {
            switchToHttp: jest.fn().mockReturnThis(),
            getRequest: jest.fn().mockReturnValue(mockRequest),
        } as unknown as ExecutionContext;

        const mockCallHandler = {
            handle: jest.fn().mockReturnValue(of(existingResponse)),
        } as CallHandler;

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
            expect(result).toBe(existingResponse);
            expect(result.message).toBe('Custom message');
            done();
        });
    });

    it('should not wrap Buffer or Uint8Array', (done) => {
        const bufferData = Buffer.from('hello');

        const mockRequest = { path: '/api/download', method: 'GET' };
        const mockExecutionContext = {
            switchToHttp: jest.fn().mockReturnThis(),
            getRequest: jest.fn().mockReturnValue(mockRequest),
        } as unknown as ExecutionContext;

        const mockCallHandler = {
            handle: jest.fn().mockReturnValue(of(bufferData)),
        } as CallHandler;

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
            expect(result).toBe(bufferData);
            expect(Buffer.isBuffer(result)).toBe(true);
            done();
        });
    });
});
