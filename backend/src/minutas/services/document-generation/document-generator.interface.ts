/**
 * Generated Document result
 */
export interface GeneratedDocument {
    buffer: Buffer;
    contentType: string;
    filename?: string;
}

/**
 * Minuta data for document generation
 */
export interface MinutaData {
    [key: string]: unknown;
}

/**
 * Document Generator Interface
 * Strategy pattern for swappable document generation providers
 */
export interface IDocumentGenerator {
    /**
     * Generate a document from minuta data
     */
    generate(data: MinutaData): Promise<GeneratedDocument>;

    /**
     * Get the list of supported output formats
     */
    getSupportedFormats(): string[];

    /**
     * Get the provider name
     */
    getProviderName(): string;
}
