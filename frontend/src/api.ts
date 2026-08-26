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
    mode: "full_year" | "partial_year";
    requiredAverage: number;
    isAchievable: boolean;
    alreadySecured: boolean;
  } | null;
}

export interface CommitmentBlock {
  id: string;
  label: string;
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  startTime: string;
  endTime: string;
}

export interface ScheduledTaskItem {
  taskId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  title: string;
  type: string;
  assessmentComponentName: string;
}

export interface UnscheduledTaskItem {
  taskId: string;
  title: string;
  type: string;
  assessmentComponentName: string;
}

export interface ScheduleResponse {
  scheduled: ScheduledTaskItem[];
  unscheduled: UnscheduledTaskItem[];
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

export async function getCommitmentBlocks(): Promise<CommitmentBlock[]> {
  const res = await fetch("/api/commitment-blocks");
  return handleResponse(res);
}

export async function createCommitmentBlock(data: {
  label: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): Promise<CommitmentBlock> {
  const res = await fetch("/api/commitment-blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteCommitmentBlock(id: string): Promise<void> {
  const res = await fetch(`/api/commitment-blocks/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
}

export async function generateTasks(assessmentComponentId: string): Promise<void> {
  const res = await fetch(`/api/assessment-components/${assessmentComponentId}/generate-tasks`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
}

export async function getSchedule(): Promise<ScheduleResponse> {
  const res = await fetch("/api/schedule");
  return handleResponse(res);
}

export interface RecommendationResponse {
  recommendation: {
    task: {
      id: string;
      title: string;
      estimatedMinutes: number;
      deadline: string;
      weightingPct: number;
      assessmentComponentName: string;
      moduleName: string;
    };
    explanation: string;
    score: number;
  } | null;
  message?: string;
}

export async function getRecommendation(): Promise<RecommendationResponse> {
  const res = await fetch("/api/recommendation");
  return handleResponse(res);
}

export interface University {
  id: string;
  name: string;
}

export interface UserSettings {
  id: string;
  name: string;
  universityId: string;
  currentYear: number;
  targetClassification: string;
  university: University;
}

export async function getUser(): Promise<UserSettings> {
  const res = await fetch("/api/user");
  return handleResponse(res);
}

export async function getUniversities(): Promise<University[]> {
  const res = await fetch("/api/user/universities");
  return handleResponse(res);
}

export async function updateUser(data: {
  universityId?: string;
  currentYear?: number;
  targetClassification?: string;
}): Promise<UserSettings> {
  const res = await fetch("/api/user", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}