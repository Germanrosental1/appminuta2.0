export function parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function isValidDate(date: Date): boolean {
    return !Number.isNaN(date.getTime());
}
