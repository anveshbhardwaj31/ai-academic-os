// A free time slot on a given day, before any tasks are placed into it.
export interface FreeSlot {
    dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
    startMinutes: number; // minutes since midnight, e.g. 9:00am = 540
    endMinutes: number;
  }
  
  export interface CommitmentBlockInput {
    dayOfWeek: number;
    startTime: string; // "HH:MM"
    endTime: string; // "HH:MM"
  }
  
  export interface SchedulableTask {
    id: string;
    estimatedMinutes: number;
    deadline: Date; // the deadline of the task's parent assessment component
    weightingPct: number; // the parent assessment component's weighting
  }
  
  export interface ScheduledTask {
    taskId: string;
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
  }
  
  function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }
  
  /**
   * Given a day's worth of commitment blocks, returns the free time
   * remaining in that day (whole day minus each block), as a list of
   * free slots. Assumes a day runs from 08:00 to 23:00 — a reasonable
   * default "available to work" window, not literally midnight to
   * midnight, since scheduling tasks at 3am isn't useful.
   */
  function computeFreeSlotsForDay(
    dayOfWeek: number,
    blocksForDay: CommitmentBlockInput[],
    earliestStartOverride?: number
  ): FreeSlot[] {
    const defaultDayStart = 8 * 60; // 08:00
    const dayEnd = 23 * 60; // 23:00
    const dayStart = earliestStartOverride !== undefined
      ? Math.max(defaultDayStart, earliestStartOverride)
      : defaultDayStart;
    
    if (dayStart >= dayEnd) return [];
  
    const sortedBlocks = [...blocksForDay].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
  
    const freeSlots: FreeSlot[] = [];
    let cursor = dayStart;
  
    for (const block of sortedBlocks) {
      const blockStart = timeToMinutes(block.startTime);
      const blockEnd = timeToMinutes(block.endTime);
  
      if (blockStart > cursor) {
        freeSlots.push({ dayOfWeek, startMinutes: cursor, endMinutes: blockStart });
      }
      cursor = Math.max(cursor, blockEnd);
    }
  
    if (cursor < dayEnd) {
      freeSlots.push({ dayOfWeek, startMinutes: cursor, endMinutes: dayEnd });
    }
  
    return freeSlots;
  }
  
  /**
   * Computes free time across a whole week (all 7 days), given the
   * user's commitment blocks.
   */
  export function computeWeeklyFreeSlots(
    commitmentBlocks: CommitmentBlockInput[],
    now: Date = new Date()
  ): FreeSlot[] {
    // Known v1 simplification: days are still visited Sunday-first (0-6),
    // not reordered to start from today — so this prevents scheduling
    // into already-past hours *within* today specifically, but doesn't
    // yet prefer today/tomorrow over later days when placing tasks.
    // Worth revisiting once this is in real use.
    const todayDayOfWeek = now.getUTCDay();
    const currentMinutesOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();
  
    const allSlots: FreeSlot[] = [];
    for (let day = 0; day <= 6; day++) {
      const blocksForDay = commitmentBlocks.filter((b) => b.dayOfWeek === day);
      const earliestStartOverride = day === todayDayOfWeek ? currentMinutesOfDay : undefined;
      allSlots.push(...computeFreeSlotsForDay(day, blocksForDay, earliestStartOverride));
    }
    return allSlots;
  }
  
  /**
   * Priority score for a task — higher score means more urgent/important.
   * Simple, explainable formula: closer deadlines and higher-weighted
   * assessments score higher. Deliberately basic for v1 — tune or replace
   * once there's real usage data to learn from, per the roadmap.
   */
  function priorityScore(task: SchedulableTask, now: Date): number {
    const msUntilDeadline = task.deadline.getTime() - now.getTime();
    const daysUntilDeadline = Math.max(msUntilDeadline / (1000 * 60 * 60 * 24), 0.5); // floor to avoid divide-by-near-zero
    return task.weightingPct / daysUntilDeadline;
  }
  
  /**
   * Greedy scheduler: sorts tasks by priority score (highest first), then
   * walks through the week's free slots in order, placing each task into
   * the next slot with enough room. Tasks that don't fit anywhere in the
   * available free time are simply left unscheduled — the caller should
   * surface that clearly rather than silently dropping them.
   */
  export function scheduleTasks(
    tasks: SchedulableTask[],
    commitmentBlocks: CommitmentBlockInput[],
    now: Date = new Date()
  ): { scheduled: ScheduledTask[]; unscheduled: SchedulableTask[] } {
    const freeSlots = computeWeeklyFreeSlots(commitmentBlocks, now).map((s) => ({ ...s })); // mutable copies
  
    const sortedTasks = [...tasks].sort(
      (a, b) => priorityScore(b, now) - priorityScore(a, now)
    );
  
    const scheduled: ScheduledTask[] = [];
    const unscheduled: SchedulableTask[] = [];
  
    for (const task of sortedTasks) {
      let placed = false;
  
      for (const slot of freeSlots) {
        const available = slot.endMinutes - slot.startMinutes;
        if (available >= task.estimatedMinutes) {
          scheduled.push({
            taskId: task.id,
            dayOfWeek: slot.dayOfWeek,
            startMinutes: slot.startMinutes,
            endMinutes: slot.startMinutes + task.estimatedMinutes,
          });
          slot.startMinutes += task.estimatedMinutes; // shrink the slot for the next task
          placed = true;
          break;
        }
      }
  
      if (!placed) {
        unscheduled.push(task);
      }
    }
  
    return { scheduled, unscheduled };
  }