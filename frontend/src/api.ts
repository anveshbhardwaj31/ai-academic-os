// Thin wrapper around the backend API. Centralizing these calls here
// means the rest of the app never has to know about URLs, JSON parsing,
// or error handling for HTTP — it just calls a typed function.

export interface AssessmentComponent {
    id: string;
    moduleId: string;
    name: string;
    weightingPct: number;
    type: "coursework" | "exam";
    deadline: string;
    mark: number | null;
    status: string;
  }
  
  export interface Module {
    id: string;
    name: string;
    credits: number;
    year: number;
    assessmentComponents: AssessmentComponent[];
  }
  
  export interface ClassificationStatus {
    targetClassification: string;
    completedYears: { year: number; average: number }[];
    incompleteYears: number[];
    requiredForRemainingYear: {
      year: number;
      requiredAverage: number;
      isAchievable: boolean;
      alreadySecured: boolean;
    } | null;
  }
  
  async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Request failed with status ${res.status}`);
    }
    return res.json();
  }
  
  export async function getModules(): Promise<Module[]> {
    const res = await fetch("/api/modules");
    return handleResponse(res);
  }
  
  export async function createModule(data: {
    name: string;
    credits: number;
    year: number;
  }): Promise<Module> {
    const res = await fetch("/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  }
  
  export async function createAssessmentComponent(data: {
    moduleId: string;
    name: string;
    weightingPct: number;
    type: "coursework" | "exam";
    deadline: string;
  }): Promise<AssessmentComponent> {
    const res = await fetch("/api/assessment-components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  }
  
  export async function updateAssessmentComponentMark(
    id: string,
    mark: number
  ): Promise<AssessmentComponent> {
    const res = await fetch(`/api/assessment-components/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark, status: "graded" }),
    });
    return handleResponse(res);
  }
  
  export async function getClassificationStatus(): Promise<ClassificationStatus> {
    const res = await fetch("/api/classification/status");
    return handleResponse(res);
  }