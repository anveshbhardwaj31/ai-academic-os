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

export interface CompletedTaskRecord {
    type: string;
    estimatedMinutes: number;
    actualMinutes: number;
}

export interface PaceByType {
    type: string;
    averagePaceRatio: number;
    sampleSize: number;
}

/**
 * This function aggregates the pace ratio across completed tasks, grouped by the task type.
 * Deliberately simplified as there is no real usage data currently.
 */
export function calculateAveragePaceByType(records: CompletedTaskRecord[]): PaceByType[] {
    const byType = new Map<string, number[]>();

    for (const record of records) {
        if (record.estimatedMinutes <= 0) continue;
        const ratio = record.actualMinutes / record.estimatedMinutes;
        const existing = byType.get(record.type) ?? [];
        existing.push(ratio);
        byType.set(record.type, existing);
    }

    return Array.from(byType.entries()).map(([type, ratios]) => ({
        type,
        averagePaceRatio: ratios.reduce((sum, r) => sum + r, 0) / ratios.length,
        sampleSize: ratios.length,
    }));
}

/**
 * This function adjusts a raw estimate using a learned pace ratio for the task type.
 */
export function applyPaceAdjustment(
    estimatedMinutes: number,
    taskType: string,
    paceByType: PaceByType[],
    minimumSampleSize: number = 3
  ): number {
    const match = paceByType.find((p) => p.type === taskType);
    if (!match || match.sampleSize < minimumSampleSize) return estimatedMinutes;
    return Math.round(estimatedMinutes * match.averagePaceRatio);
  }

export interface PendingTaskForFeasibility {
    estimatedMinutes: number;
    type: string;
  }
  
  export interface FeasibilityResult {
    totalAdjustedMinutesNeeded: number;
    totalFreeMinutesAvailable: number;
    isFeasible: boolean;
    shortfallMinutes: number; // 0 if feasible, otherwise how many minutes short
  }
  
  /**
   * Checks whether the time actually available matches what pace-adjusted
   * estimates say the remaining pending work will really take. This is a
   * genuinely different question from "is the classification goal
   * mathematically achievable" (that's the engine's job) — a goal can be
   * achievable on paper while still being unrealistic given real time
   * constraints, and vice versa isn't true (if there's no time, it's not
   * feasible regardless of the maths).
   */
  export function checkWorkloadFeasibility(
    pendingTasks: PendingTaskForFeasibility[],
    paceByType: PaceByType[],
    totalFreeMinutesAvailable: number
  ): FeasibilityResult {
    const totalAdjustedMinutesNeeded = pendingTasks.reduce((sum, task) => {
      return sum + applyPaceAdjustment(task.estimatedMinutes, task.type, paceByType);
    }, 0);
  
    const isFeasible = totalAdjustedMinutesNeeded <= totalFreeMinutesAvailable;
    const shortfallMinutes = isFeasible ? 0 : totalAdjustedMinutesNeeded - totalFreeMinutesAvailable;
  
    return {
      totalAdjustedMinutesNeeded,
      totalFreeMinutesAvailable,
      isFeasible,
      shortfallMinutes,
    };
  }