export interface RecommendableTask {
    id: string;
    title: string;
    estimatedMinutes: number;
    deadline: Date;
    weightingPct: number;
    assessmentComponentName: string;
    moduleName: string;
}

export interface Recommendation {
    task: RecommendableTask;
    explanation: string;
    score: number;
}

// Similar priority formula as scheduler.
function priorityScore(task: RecommendableTask, now: Date): number {
    const msUntilDeadline = task.deadline.getTime() - now.getTime();
    const daysUntilDeadline = Math.max(msUntilDeadline / (1000 * 60 * 60 * 24), 0.5);
    return task.weightingPct / daysUntilDeadline;
}

function formatDaysUntil(deadline: Date, now: Date): string {
    const msUntil = deadline.getTime() - now.getTime();
    const daysUntil = Math.round(msUntil / (1000 * 60 * 60 * 24));
    if (daysUntil <= 0) return "overdue";
    if (daysUntil === 1) return "due tomorrow";
    return `due in ${daysUntil} days`;
}

function buildExplanation(task: RecommendableTask, now: Date): string {
    const dueText = formatDaysUntil(task.deadline, now);
    return `${task.assessmentComponentName} (${task.moduleName}) is worth ${task.weightingPct}% and ${dueText} — this is your highest-priority pending task right now.`;
}

/**
 * This function returns the single most valuable task to work on immediately - as well as an explanation as to why. Returns null if no pending tasks.
 */
export function getTopRecommendation(
    tasks: RecommendableTask[],
    now: Date = new Date()
): Recommendation | null {
    if (tasks.length === 0) return null;

    const sorted = [...tasks].sort((a, b) => priorityScore(b, now) - priorityScore(a, now));
    const topTask = sorted[0];

    return {
        task: topTask,
        explanation: buildExplanation(topTask, now),
        score: priorityScore(topTask, now),
    };
}