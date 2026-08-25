export interface GeneratedTask {
    title: string;
    type: "research" | "draft" | "revise" | "practice" | "submit";
    estimatedMinutes: number;
}

export interface ComponentForTaskGeneration {
    type: "coursework" | "exam";
    weightingPct: number;
    moduleCredits: number;
}

// Rough total effort estimate for a component. Starting heuristic, not precise for now..
function estimateTotalMinutes(component: ComponentForTaskGeneration): number {
    const hoursPerCreditAtFullWeight = 1;
    const totalHours = component.moduleCredits * hoursPerCreditAtFullWeight * (component.weightingPct / 100);
    return Math.round(totalHours * 60);
}

/**
 * Generates a small ordered set of tasks for a singular assessment component.
 * Coursework + exams get different task breakdowns, as they're different types of work.
 */
export function generateTasksForComponent(
    component: ComponentForTaskGeneration
): GeneratedTask[] {
    const totalMinutes = estimateTotalMinutes(component);

    if (component.type === "coursework") {
        return [
            { title: "Research", type: "research", estimatedMinutes: Math.round(totalMinutes * 0.25) },
            { title: "Draft", type: "draft", estimatedMinutes: Math.round(totalMinutes * 0.45) },
            { title: "Revise", type: "revise", estimatedMinutes: Math.round(totalMinutes * 0.2) },
            { title: "Submit", type: "submit", estimatedMinutes: Math.round(totalMinutes * 0.1) },
        ];
    }

    return [
        { title: "Review notes", type: "revise", estimatedMinutes: Math.round(totalMinutes * 0.3) },
        { title: "Practice questions", type: "practice", estimatedMinutes: Math.round(totalMinutes * 0.4) },
        { title: "Mock exam", type: "practice", estimatedMinutes: Math.round(totalMinutes * 0.2) },
        { title: "Review weak areas", type: "practice", estimatedMinutes: Math.round(totalMinutes * 0.1) },
    ];
}