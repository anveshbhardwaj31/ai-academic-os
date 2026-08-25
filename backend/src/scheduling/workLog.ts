/**
 * This function goes through the duration of a work session in minutes, given the start + end times.
 * Rounds to nearest minute rather than fractional seconds.
 */
export function calculateDurationMinutes(startedAt: Date, endedAt: Date): number {
    const ms = endedAt.getTime() - startedAt.getTime();
    return Math.round(ms / (1000 * 60));
}

/**
 * This function goes through the ratio of actual time taken to estimated time.
 */
export function calculatePaceRatio(actualMinutes: number, estimatedMinutes: number): number {
    if (estimatedMinutes <= 0) {
        throw new Error("estimatedMinutes must be positive to compute a pace ratio");
    }
    return actualMinutes / estimatedMinutes;
}