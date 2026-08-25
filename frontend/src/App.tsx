import { useEffect, useState } from "react";
import {
  Module,
  ClassificationStatus,
  getModules,
  createModule,
  createAssessmentComponent,
  updateAssessmentComponentMark,
  getClassificationStatus,
} from "./api";

// Small reusable wrapper so every field gets a consistent label above it.
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moduleName, setModuleName] = useState("");
  const [moduleCredits, setModuleCredits] = useState(20);
  const [moduleYear, setModuleYear] = useState(3);

  async function refreshAll() {
    setError(null);
    try {
      const [modulesData, statusData] = await Promise.all([
        getModules(),
        getClassificationStatus(),
      ]);
      setModules(modulesData);
      setStatus(statusData);
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

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Academic Strategist</h1>

      {error && (
        <p style={{ color: "#b00020", background: "#fde8e8", padding: 12, borderRadius: 6 }}>
          {error}
        </p>
      )}

      <section style={{ marginBottom: 32, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
        <h2>Your current position</h2>
        {status ? (
          <>
            <p>Target classification: <strong>{status.targetClassification}</strong></p>
            {status.completedYears.length > 0 ? (
              <ul>
                {status.completedYears.map((y) => (
                  <li key={y.year}>Year {y.year} average: {y.average.toFixed(1)}%</li>
                ))}
              </ul>
            ) : (
              <p>No fully completed years yet.</p>
            )}
            {status.requiredForRemainingYear && (
              <p>
                For Year {status.requiredForRemainingYear.year}, you need an average of{" "}
                <strong>{status.requiredForRemainingYear.requiredAverage.toFixed(1)}%</strong>{" "}
                to hit a {status.targetClassification}.{" "}
                {!status.requiredForRemainingYear.isAchievable && (
                  <span style={{ color: "#b00020" }}>
                    That's above 100% — not achievable with this target given current marks.
                  </span>
                )}
              </p>
            )}
          </>
        ) : (
          <p>No status available yet.</p>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Add a module</h2>
        <form onSubmit={handleAddModule} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="Module name">
            <input
              placeholder="e.g. Software Engineering"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              style={{ padding: 8, minWidth: 220 }}
            />
          </Field>
          <Field label="Credits">
            <input
              type="number"
              value={moduleCredits}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setModuleCredits(Number(e.target.value))}
              style={{ width: 80, padding: 8 }}
            />
          </Field>
          <Field label="Year">
            <select
              value={moduleYear}
              onChange={(e) => setModuleYear(Number(e.target.value))}
              style={{ padding: 8 }}
            >
              <option value={1}>Year 1</option>
              <option value={2}>Year 2</option>
              <option value={3}>Year 3</option>
              <option value={4}>Year 4</option>
            </select>
          </Field>
          <button type="submit" style={{ padding: "8px 16px" }}>Add module</button>
        </form>
      </section>

      <section>
        <h2>Your modules</h2>
        {modules.length === 0 && <p>No modules yet — add one above.</p>}
        {modules.map((m) => (
          <ModuleCard key={m.id} module={m} onChanged={refreshAll} />
        ))}
      </section>
    </div>
  );
}

function ModuleCard({ module, onChanged }: { module: Module; onChanged: () => void }) {
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
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h3>{module.name} <span style={{ fontWeight: "normal", color: "#666" }}>· {module.credits} credits · Year {module.year}</span></h3>

      {module.assessmentComponents.length === 0 && <p>No assessment components yet.</p>}
      {module.assessmentComponents.map((c) => (
        <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 8 }}>
          <span style={{ flex: 1 }}>{c.name} ({c.weightingPct}%, {c.type})</span>
          <Field label="Mark">
            <input
              type="number"
              placeholder="—"
              defaultValue={c.mark ?? ""}
              onFocus={(e) => e.target.select()}
              onBlur={(e) => e.target.value && handleMarkChange(c.id, e.target.value)}
              style={{ width: 70, padding: 6 }}
            />
          </Field>
        </div>
      ))}

      <form onSubmit={handleAddComponent} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
        <Field label="Component name">
          <input
            placeholder="e.g. Coursework Essay"
            value={componentName}
            onChange={(e) => setComponentName(e.target.value)}
            style={{ padding: 6, minWidth: 180 }}
          />
        </Field>
        <Field label="Weighting %">
          <input
            type="number"
            value={weighting}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setWeighting(Number(e.target.value))}
            style={{ width: 90, padding: 6 }}
          />
        </Field>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as "coursework" | "exam")} style={{ padding: 6 }}>
            <option value="coursework">Coursework</option>
            <option value="exam">Exam</option>
          </select>
        </Field>
        <Field label="Deadline">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={{ padding: 6 }}
          />
        </Field>
        <button type="submit" style={{ padding: "6px 12px" }}>Add</button>
      </form>
    </div>
  );
}