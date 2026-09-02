import { useEffect, useState } from "react";
import {
  Module,
  ClassificationStatus,
  CommitmentBlock,
  ScheduleResponse,
  RecommendationResponse,
  UserSettings,
  University,
  getModules,
  createModule,
  createAssessmentComponent,
  updateAssessmentComponentMark,
  getClassificationStatus,
  getCommitmentBlocks,
  createCommitmentBlock,
  deleteCommitmentBlock,
  generateTasks,
  getSchedule,
  getRecommendation,
  getUser,
  getUniversities,
  updateUser,
} from "./api";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function minutesToTime(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes / 5) * 5;
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-group">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}

export default function App() {
  const [modules, setModules] = useState<Module[]>([]);
  const [status, setStatus] = useState<ClassificationStatus | null>(null);
  const [commitmentBlocks, setCommitmentBlocks] = useState<CommitmentBlock[]>([]);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moduleName, setModuleName] = useState("");
  const [moduleCredits, setModuleCredits] = useState(20);
  const [moduleYear, setModuleYear] = useState(3);

  const [blockLabel, setBlockLabel] = useState("");
  const [blockDay, setBlockDay] = useState(1);
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("11:00");

  async function refreshAll() {
    setError(null);
    try {
      const [modulesData, statusData, blocksData, scheduleData, recommendationData, userData, universitiesData] =
        await Promise.all([
          getModules(),
          getClassificationStatus(),
          getCommitmentBlocks(),
          getSchedule(),
          getRecommendation(),
          getUser(),
          getUniversities(),
        ]);
      setModules(modulesData);
      setStatus(statusData);
      setCommitmentBlocks(blocksData);
      setSchedule(scheduleData);
      setRecommendation(recommendationData);
      setUserSettings(userData);
      setUniversities(universitiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  async function handleAddModule(e: React.FormEvent) {
    e.preventDefault();
    if (!moduleName.trim()) return;
    await createModule({ name: moduleName, credits: moduleCredits, year: moduleYear });
    setModuleName("");
    await refreshAll();
  }

  async function handleAddBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockLabel.trim()) return;
    try {
      await createCommitmentBlock({ label: blockLabel, dayOfWeek: blockDay, startTime: blockStart, endTime: blockEnd });
      setBlockLabel("");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add commitment block");
    }
  }

  async function handleDeleteBlock(id: string) {
    await deleteCommitmentBlock(id);
    await refreshAll();
  }

  async function handleGenerateTasks(componentId: string) {
    try {
      await generateTasks(componentId);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate tasks");
    }
  }

  async function handleUpdateSettings(data: { universityId?: string; currentYear?: number; targetClassification?: string }) {
    try {
      await updateUser(data);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update settings");
    }
  }

  if (loading) return <div className="app-shell">Loading…</div>;

  return (
    <div className="app-shell">
      <div className="masthead">
        <h1 className="masthead-name">Academic Strategist</h1>
        <span className="masthead-tag">{userSettings?.university.name}</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {recommendation?.recommendation ? (
        <div className="recommendation">
          <div className="recommendation-eyebrow">Right now</div>
          <h2 className="recommendation-title">{recommendation.recommendation.task.title}</h2>
          <p className="recommendation-explanation">{recommendation.recommendation.explanation}</p>
          <p className="recommendation-meta">Estimated {recommendation.recommendation.task.estimatedMinutes} minutes</p>
        </div>
      ) : (
        recommendation && <div className="recommendation-empty">{recommendation.message}</div>
      )}

      <section className="section">
        <h2 className="section-title">Your current position</h2>
        <hr className="rule" />
        {status && (
          <>
            <div className="position-grid">
              {status.completedYears.map((y) => (
                <div className="position-figure" key={y.year}>
                  <span className="position-figure-label">Year {y.year} average</span>
                  <span className="position-figure-value">{y.average.toFixed(1)}%</span>
                </div>
              ))}
              {status.requiredForRemainingYear && (
                <div className="position-figure">
                  <span className="position-figure-label">
                    Needed in Year {status.requiredForRemainingYear.year} for a {status.targetClassification}
                  </span>
                  <span className="position-figure-value is-target">
                    {status.requiredForRemainingYear.requiredAverage.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            {status.completedYears.length === 0 && <p className="position-note">No fully completed years yet.</p>}
            {status.requiredForRemainingYear && !status.requiredForRemainingYear.isAchievable && (
              <p className="position-note is-warning">
                That's above 100% — not achievable for a {status.targetClassification} given current marks.
              </p>
            )}
          </>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Settings</h2>
        <hr className="rule" />
        {userSettings && (
          <div className="form-row">
            <Field label="University">
              <select
                className="input"
                value={userSettings.universityId}
                onChange={(e) => handleUpdateSettings({ universityId: e.target.value })}
              >
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Current year">
              <select
                className="input"
                value={userSettings.currentYear}
                onChange={(e) => handleUpdateSettings({ currentYear: Number(e.target.value) })}
              >
                <option value={1}>Year 1</option>
                <option value={2}>Year 2</option>
                <option value={3}>Year 3</option>
                <option value={4}>Year 4</option>
              </select>
            </Field>
            <Field label="Target classification">
              <select
                className="input"
                value={userSettings.targetClassification}
                onChange={(e) => handleUpdateSettings({ targetClassification: e.target.value })}
              >
                <option value="First">First</option>
                <option value="2:1">2:1</option>
                <option value="2:2">2:2</option>
                <option value="Third">Third</option>
              </select>
            </Field>
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Add a module</h2>
        <hr className="rule" />
        <form onSubmit={handleAddModule} className="form-row">
          <Field label="Module name">
            <input
              className="input"
              placeholder="e.g. Software Engineering"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              style={{ minWidth: 220 }}
            />
          </Field>
          <Field label="Credits">
            <input
              className="input"
              type="number"
              value={moduleCredits}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setModuleCredits(Number(e.target.value))}
              style={{ width: 70 }}
            />
          </Field>
          <Field label="Year">
            <select className="input" value={moduleYear} onChange={(e) => setModuleYear(Number(e.target.value))}>
              <option value={1}>Year 1</option>
              <option value={2}>Year 2</option>
              <option value={3}>Year 3</option>
              <option value={4}>Year 4</option>
            </select>
          </Field>
          <button type="submit" className="btn">Add module</button>
        </form>
      </section>

      <section className="section">
        <h2 className="section-title">Your modules</h2>
        <hr className="rule" />
        {modules.length === 0 && <p className="position-note">No modules yet — add one above.</p>}
        {modules.map((m) => (
          <ModuleBlock key={m.id} module={m} onChanged={refreshAll} onGenerateTasks={handleGenerateTasks} />
        ))}
      </section>

      <section className="section">
        <h2 className="section-title">Fixed commitments</h2>
        <hr className="rule" />
        <form onSubmit={handleAddBlock} className="form-row" style={{ marginBottom: 16 }}>
          <Field label="Label">
            <input
              className="input"
              placeholder="e.g. Lectures"
              value={blockLabel}
              onChange={(e) => setBlockLabel(e.target.value)}
              style={{ minWidth: 160 }}
            />
          </Field>
          <Field label="Day">
            <select className="input" value={blockDay} onChange={(e) => setBlockDay(Number(e.target.value))}>
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </Field>
          <Field label="Start time">
            <input className="input" type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
          </Field>
          <Field label="End time">
            <input className="input" type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
          </Field>
          <button type="submit" className="btn">Add commitment</button>
        </form>

        {commitmentBlocks.length === 0 ? (
          <p className="position-note">No fixed commitments yet.</p>
        ) : (
          <ul className="commitment-list">
            {commitmentBlocks.map((b) => (
              <li className="commitment-row" key={b.id}>
                <span className="commitment-row-label">
                  {DAY_NAMES[b.dayOfWeek]} · {b.startTime}–{b.endTime} · {b.label}
                </span>
                <button className="btn btn-quiet" onClick={() => handleDeleteBlock(b.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">This week's schedule</h2>
        <hr className="rule" />
        {!schedule || (schedule.scheduled.length === 0 && schedule.unscheduled.length === 0) ? (
          <p className="position-note">No tasks scheduled yet — generate tasks for an assessment component above.</p>
        ) : (
          <>
            {DAY_NAMES.map((dayName, dayIndex) => {
              const dayTasks = schedule.scheduled
                .filter((t) => t.dayOfWeek === dayIndex)
                .sort((a, b) => a.startMinutes - b.startMinutes);
              if (dayTasks.length === 0) return null;
              return (
                <div className="day-block" key={dayIndex}>
                  <h3 className="day-name">{dayName}</h3>
                  {dayTasks.map((t) => (
                    <div className="task-row" key={t.taskId}>
                      <span className="task-time">{minutesToTime(t.startMinutes)}–{minutesToTime(t.endMinutes)}</span>
                      <span className="task-title">{t.title}</span>
                      <span className="task-context">{t.assessmentComponentName}</span>
                    </div>
                  ))}
                </div>
              );
            })}

            {schedule.unscheduled.length > 0 && (
              <div className="unscheduled-block">
                <strong>Couldn't fit this week</strong>
                {schedule.unscheduled.map((t) => (
                  <div key={t.taskId} style={{ marginTop: 6 }}>{t.title} · {t.assessmentComponentName}</div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function ModuleBlock({
  module,
  onChanged,
  onGenerateTasks,
}: {
  module: Module;
  onChanged: () => void;
  onGenerateTasks: (componentId: string) => void;
}) {
  const [componentName, setComponentName] = useState("");
  const [weighting, setWeighting] = useState(50);
  const [type, setType] = useState<"coursework" | "exam">("coursework");
  const [deadline, setDeadline] = useState("");

  async function handleAddComponent(e: React.FormEvent) {
    e.preventDefault();
    if (!componentName.trim() || !deadline) return;
    await createAssessmentComponent({
      moduleId: module.id,
      name: componentName,
      weightingPct: weighting,
      type,
      deadline: new Date(deadline).toISOString(),
    });
    setComponentName("");
    setDeadline("");
    await onChanged();
  }

  async function handleMarkChange(componentId: string, mark: string) {
    const value = Number(mark);
    if (Number.isNaN(value)) return;
    await updateAssessmentComponentMark(componentId, value);
    await onChanged();
  }

  return (
    <div className="module-block">
      <div className="module-heading">
        <h3 className="module-name">{module.name}</h3>
        <span className="module-meta">{module.credits} credits · Year {module.year}</span>
      </div>

      {module.assessmentComponents.map((c) => (
        <div className="component-row" key={c.id}>
          <span className="component-name">{c.name} ({c.weightingPct}%, {c.type})</span>
          <input
            className="input component-mark-input"
            type="number"
            placeholder="—"
            defaultValue={c.mark ?? ""}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => e.target.value && handleMarkChange(c.id, e.target.value)}
          />
          <button className="btn btn-quiet" onClick={() => onGenerateTasks(c.id)}>Generate tasks</button>
        </div>
      ))}

      <form onSubmit={handleAddComponent} className="form-row" style={{ marginTop: 12 }}>
        <Field label="Component name">
          <input
            className="input"
            placeholder="e.g. Coursework Essay"
            value={componentName}
            onChange={(e) => setComponentName(e.target.value)}
            style={{ minWidth: 180 }}
          />
        </Field>
        <Field label="Weighting %">
          <input
            className="input"
            type="number"
            value={weighting}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setWeighting(Number(e.target.value))}
            style={{ width: 80 }}
          />
        </Field>
        <Field label="Type">
          <select className="input" value={type} onChange={(e) => setType(e.target.value as "coursework" | "exam")}>
            <option value="coursework">Coursework</option>
            <option value="exam">Exam</option>
          </select>
        </Field>
        <Field label="Deadline">
          <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
        <button type="submit" className="btn btn-quiet">Add</button>
      </form>
    </div>
  );
}