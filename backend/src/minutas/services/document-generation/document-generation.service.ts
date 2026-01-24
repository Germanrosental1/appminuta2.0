import { Injectable, NotFoundException } from '@nestjs/common';
import {
    IDocumentGenerator,
    GeneratedDocument,
    MinutaData
} from './document-generator.interface';
import { N8nDocumentGenerator } from './n8n-generator.service';

/**
 * Document Generation Service
 * Orchestrates document generators using Strategy pattern
 * Allows runtime provider selection
 */
@Injectable()
export class DocumentGenerationService {
    private readonly generators: Map<string, IDocumentGenerator> = new Map();
    private defaultProvider = 'n8n';

    constructor(
        private readonly n8nGenerator: N8nDocumentGenerator,
    ) {
        // Register available generators
        this.registerGenerator(n8nGenerator);
    }

    /**
     * Register a document generator
     */
    private registerGenerator(generator: IDocumentGenerator): void {
        this.generators.set(generator.getProviderName(), generator);
    }

    /**
     * Generate a document using the specified provider
     * Falls back to default provider if not specified
     */
    async generate(
        data: MinutaData,
        provider?: string
    ): Promise<GeneratedDocument> {
        const providerName = provider || this.defaultProvider;
        const generator = this.generators.get(providerName);

        if (!generator) {
            const availableProviders = Array.from(this.generators.keys());
            throw new NotFoundException(
                `Document generator '${providerName}' not found. ` +
                `Available providers: ${availableProviders.join(', ')}`
            );
        }

        return generator.generate(data);
    }

    /**
     * Get list of available providers
     */
    getAvailableProviders(): string[] {
        return Array.from(this.generators.keys());
    }

    /**
     * Get supported formats for a specific provider
     */
    getSupportedFormats(provider?: string): string[] {
        const providerName = provider || this.defaultProvider;
        const generator = this.generators.get(providerName);

        return generator?.getSupportedFormats() || [];
    }

    /**
     * Set the default provider
     */
    setDefaultProvider(provider: string): void {
        if (!this.generators.has(provider)) {
            throw new NotFoundException(`Provider '${provider}' not found`);
        }
        this.defaultProvider = provider;
    }
}
