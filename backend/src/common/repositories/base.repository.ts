/**
 * Base Repository Interface
 * Provides common CRUD operations for all repositories
 */
export interface IRepository<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
    /**
     * Find all entities with optional filtering
     */
    findAll(filter?: Record<string, unknown>): Promise<T[]>;

    /**
     * Find a single entity by ID
     */
    findById(id: string): Promise<T | null>;

    /**
     * Create a new entity
     */
    create(data: CreateDto): Promise<T>;

    /**
     * Update an existing entity
     */
    update(id: string, data: UpdateDto): Promise<T>;

    /**
     * Delete an entity by ID
     */
    delete(id: string): Promise<void>;

    /**
     * Count entities with optional filtering
     */
    count(filter?: Record<string, unknown>): Promise<number>;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
