const STORAGE_KEY = "se_lecturer_app_v1";
const STORAGE_KEY_BACKUP = "se_lecturer_app_v1_backup";

import { Dexie, type EntityTable } from 'dexie';

// ─── Types (unchanged) ───
export interface Student {
  id: string;
  name: string;
  email: string;
  group: string;
  enrolledCourse: string;
  notes: string;
}

export interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: "draft" | "active" | "closed";
  description: string;
  submissions: number;
  totalStudents: number;
}

export interface TimetableEvent {
  id: string;
  title: string;
  course: string;
  day: number;
  startHour: number;
  duration: number;
  room: string;
  color: string;
  type: "lecture" | "lab" | "seminar" | "meeting";
}

export interface Resource {
  id: string;
  title: string;
  type: "slide" | "code" | "link" | "document" | "video";
  course: string;
  dateAdded: string;
  tags: string[];
  sourceUrl?: string;
  howFound?: string;
  dateAccessed?: string;
  personalNotes?: string;
}

export interface SmartGoal {
  id: string;
  title: string;
  description: string;
  course: string;
  category: "teaching" | "research" | "admin" | "personal" | "professional-dev";
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  milestones: GoalMilestone[];
  progress: number;
  status: "active" | "completed" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  description: string;
  targetDate: string;
  completed: boolean;
  completedAt?: string;
}

export interface LectureNote {
  id: string;
  title: string;
  content: string;
  course: string;
  topic: string;
  sessionDate: string;
  timetableEventId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  mood: "great" | "good" | "okay" | "tough" | "burnout";
  wins: string[];
  blockers: string[];
  notes: string;
  timeSpent: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalTask {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in-progress" | "review" | "done" | "blocked";
  dueDate?: string;
  course?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface LabExercise {
  id: string;
  course: string;
  title: string;
  description: string;
  rubric: LabRubricItem[];
  scheduledDate: string;
  submissionsReceived: number;
  totalStudents: number;
  commonErrors: string[];
  status: "planned" | "active" | "completed" | "graded";
  createdAt: string;
  updatedAt: string;
}

export interface LabRubricItem {
  id: string;
  criterion: string;
  maxPoints: number;
  description: string;
}

export interface Commitment {
  id: string;
  title: string;
  description: string;
  category: "teaching" | "research" | "personal" | "admin";
  targetDate: string;
  checkInFrequency: "daily" | "weekly" | "bi-weekly";
  checkIns: CheckIn[];
  status: "active" | "completed" | "missed";
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  id: string;
  commitmentId: string;
  date: string;
  completed: boolean;
  notes: string;
  mood: "great" | "good" | "okay" | "tough";
}

export interface AppData {
  students: Student[];
  assignments: Assignment[];
  timetable: TimetableEvent[];
  resources: Resource[];
  courses: string[];
  userName: string;
  smartGoals: SmartGoal[];
  lectureNotes: LectureNote[];
  journalEntries: JournalEntry[];
  personalTasks: PersonalTask[];
  labExercises: LabExercise[];
  commitments: Commitment[];
}

export const defaultData: AppData = {
  students: [],
  assignments: [],
  timetable: [],
  resources: [],
  courses: [
    "Software Engineering 101",
    "Advanced Web Development",
    "Database Systems",
    "Software Architecture",
  ],
  userName: "Dr. Smith",
  smartGoals: [],
  lectureNotes: [],
  journalEntries: [],
  personalTasks: [],
  labExercises: [],
  commitments: [],
};

// ─── Dexie Database Definition ───
class AppDatabase extends Dexie {
  students!: EntityTable<Student, 'id'>;
  assignments!: EntityTable<Assignment, 'id'>;
  timetable!: EntityTable<TimetableEvent, 'id'>;
  resources!: EntityTable<Resource, 'id'>;
  smartGoals!: EntityTable<SmartGoal, 'id'>;
  lectureNotes!: EntityTable<LectureNote, 'id'>;
  journalEntries!: EntityTable<JournalEntry, 'id'>;
  personalTasks!: EntityTable<PersonalTask, 'id'>;
  labExercises!: EntityTable<LabExercise, 'id'>;
  commitments!: EntityTable<Commitment, 'id'>;
  meta!: EntityTable<{ key: string; value: string }, 'key'>;

  constructor() {
    super('se-lecturer-hub');
    this.version(1).stores({
      students: 'id, name, group, enrolledCourse',
      assignments: 'id, title, course, dueDate, status',
      timetable: 'id, title, course, day, startHour',
      resources: 'id, title, type, course, dateAdded',
      smartGoals: 'id, title, course, category, status, createdAt',
      lectureNotes: 'id, title, course, topic, sessionDate',
      journalEntries: 'id, date, mood, createdAt',
      personalTasks: 'id, title, priority, status, dueDate, course',
      labExercises: 'id, course, title, status, scheduledDate',
      commitments: 'id, title, category, status, targetDate',
      meta: 'key',
    });
  }
}

export const db = new AppDatabase();

// ─── Migration: localStorage → Dexie (runs once) ───
async function migrateFromLocalStorage(): Promise<void> {
  // FIX: Set schemaVersion immediately so we never re-attempt migration
  await db.meta.put({ key: 'schemaVersion', value: '1' });

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // No localStorage data — fresh install, just ensure meta defaults exist
    await db.meta.put({ key: 'userName', value: defaultData.userName });
    await db.meta.put({ key: 'courses', value: JSON.stringify(defaultData.courses) });
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;

    // AUDIT: Check for unknown keys in parsed data
    const knownKeys = new Set([
      'students', 'assignments', 'timetable', 'resources',
      'courses', 'userName', 'smartGoals', 'lectureNotes',
      'journalEntries', 'personalTasks', 'labExercises', 'commitments'
    ]);
    const unknownKeys = Object.keys(parsed).filter(k => !knownKeys.has(k));
    if (unknownKeys.length > 0) {
      console.warn(`[Migration] Unknown keys in localStorage data (will be ignored):`, unknownKeys);
      // Could also throw here if you prefer fail-loud:
      // throw new Error(`Unknown keys in localStorage data: ${unknownKeys.join(', ')}`);
    }

    await db.transaction('rw',
      [db.students, db.assignments, db.timetable, db.resources,
       db.smartGoals, db.lectureNotes, db.journalEntries,
       db.personalTasks, db.labExercises, db.commitments, db.meta],
      async () => {
        await Promise.all([
          parsed.students?.length ? db.students.bulkPut(parsed.students) : Promise.resolve(),
          parsed.assignments?.length ? db.assignments.bulkPut(parsed.assignments) : Promise.resolve(),
          parsed.timetable?.length ? db.timetable.bulkPut(parsed.timetable) : Promise.resolve(),
          parsed.resources?.length ? db.resources.bulkPut(parsed.resources) : Promise.resolve(),
          parsed.smartGoals?.length ? db.smartGoals.bulkPut(parsed.smartGoals) : Promise.resolve(),
          parsed.lectureNotes?.length ? db.lectureNotes.bulkPut(parsed.lectureNotes) : Promise.resolve(),
          parsed.journalEntries?.length ? db.journalEntries.bulkPut(parsed.journalEntries) : Promise.resolve(),
          parsed.personalTasks?.length ? db.personalTasks.bulkPut(parsed.personalTasks) : Promise.resolve(),
          parsed.labExercises?.length ? db.labExercises.bulkPut(parsed.labExercises) : Promise.resolve(),
          parsed.commitments?.length ? db.commitments.bulkPut(parsed.commitments) : Promise.resolve(),
          db.meta.put({ key: 'userName', value: parsed.userName ?? defaultData.userName }),
          db.meta.put({ key: 'courses', value: JSON.stringify(parsed.courses ?? defaultData.courses) }),
        ]);
      }
    );

    // RENAME instead of delete — gives you an undo button
    localStorage.setItem(STORAGE_KEY_BACKUP, raw);
    localStorage.removeItem(STORAGE_KEY);
    console.log('[Migration] localStorage data migrated successfully, backup at:', STORAGE_KEY_BACKUP);
  } catch (err) {
    // ERROR HANDLING: Don't lose data on migration failure
    console.error('[Migration] Failed to migrate localStorage to IndexedDB:', err);
    throw new Error(
      `Migration failed: ${err instanceof Error ? err.message : String(err)}. ` +
      `Your data is still safe in localStorage under key "${STORAGE_KEY}". ` +
      `Open DevTools → Application → LocalStorage to copy it manually.`
    );
  }
}

// ─── Persist storage so browser doesn't evict under pressure ───
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  navigator.storage.persist().then(granted => {
    console.log(`[Storage] Persistent storage ${granted ? 'granted' : 'denied'}`);
  });
}

// ─── Public API (UNCHANGED SIGNATURES) ───
export async function getStore(): Promise<AppData> {
  // Run migration on first call if schemaVersion not set
  if (!(await db.meta.get('schemaVersion'))) {
    await migrateFromLocalStorage();
  }
  const [
    students, assignments, timetable, resources,
    smartGoals, lectureNotes, journalEntries,
    personalTasks, labExercises, commitments,
    userNameMeta, coursesMeta,
  ] = await Promise.all([
    db.students.toArray(),
    db.assignments.toArray(),
    db.timetable.toArray(),
    db.resources.toArray(),
    db.smartGoals.toArray(),
    db.lectureNotes.toArray(),
    db.journalEntries.toArray(),
    db.personalTasks.toArray(),
    db.labExercises.toArray(),
    db.commitments.toArray(),
    db.meta.get('userName'),
    db.meta.get('courses'),
  ]);
  return {
    students, assignments, timetable, resources,
    smartGoals, lectureNotes, journalEntries,
    personalTasks, labExercises, commitments,
    userName: userNameMeta?.value ?? defaultData.userName,
    courses: coursesMeta ? JSON.parse(coursesMeta.value) : defaultData.courses,
  };
}

export async function saveStore(data: AppData): Promise<void> {
  // Full-blob rewrite (Phase 1 stopgap — Phase 4 will make this granular)
  await db.transaction('rw',
    [db.students, db.assignments, db.timetable, db.resources,
     db.smartGoals, db.lectureNotes, db.journalEntries,
     db.personalTasks, db.labExercises, db.commitments, db.meta],
    async () => {
      const ops: Promise<any>[] = [
        data.students.length > 0 ?
          db.students.clear().then(() => db.students.bulkPut(data.students)) :
          db.students.clear(),
        data.assignments.length > 0 ?
          db.assignments.clear().then(() => db.assignments.bulkPut(data.assignments)) :
          db.assignments.clear(),
        data.timetable.length > 0 ?
          db.timetable.clear().then(() => db.timetable.bulkPut(data.timetable)) :
          db.timetable.clear(),
        data.resources.length > 0 ?
          db.resources.clear().then(() => db.resources.bulkPut(data.resources)) :
          db.resources.clear(),
        data.smartGoals.length > 0 ?
          db.smartGoals.clear().then(() => db.smartGoals.bulkPut(data.smartGoals)) :
          db.smartGoals.clear(),
        data.lectureNotes.length > 0 ?
          db.lectureNotes.clear().then(() => db.lectureNotes.bulkPut(data.lectureNotes)) :
          db.lectureNotes.clear(),
        data.journalEntries.length > 0 ?
          db.journalEntries.clear().then(() => db.journalEntries.bulkPut(data.journalEntries)) :
          db.journalEntries.clear(),
        data.personalTasks.length > 0 ?
          db.personalTasks.clear().then(() => db.personalTasks.bulkPut(data.personalTasks)) :
          db.personalTasks.clear(),
        data.labExercises.length > 0 ?
          db.labExercises.clear().then(() => db.labExercises.bulkPut(data.labExercises)) :
          db.labExercises.clear(),
        data.commitments.length > 0 ?
          db.commitments.clear().then(() => db.commitments.bulkPut(data.commitments)) :
          db.commitments.clear(),
        db.meta.put({ key: 'userName', value: data.userName }),
        db.meta.put({ key: 'courses', value: JSON.stringify(data.courses) }),
      ];
      await Promise.all(ops);
    }
  );
}

export async function initializeStore(): Promise<AppData> {
  const data = await getStore();
  const isEmpty = !data.students.length && !data.assignments.length && !data.timetable.length;
  if (isEmpty) {
    const seeded: AppData = {
      ...defaultData,
      ...data, // preserve any meta that might exist (userName, courses)
      // seed arrays from defaultData
      students: defaultData.students,
      assignments: defaultData.assignments,
      timetable: defaultData.timetable,
      resources: defaultData.resources,
    };
    await saveStore(seeded);
    // FIX: Ensure schemaVersion is set for fresh users too
    await db.meta.put({ key: 'schemaVersion', value: '1' });
    return seeded;
  }
  return data;
}

// ─── Export / Import (backup insurance) ───
export async function exportToJson(): Promise<string> {
  const data = await getStore();
  return JSON.stringify(data, null, 2);
}

export async function importFromJson(json: string, updateStore: (updater: (prev: AppData) => AppData) => Promise<void>): Promise<void> {
  const parsed = JSON.parse(json) as Partial<AppData>;
  // Validate required structure
  const requiredArrays = ['students', 'assignments', 'timetable', 'resources', 'smartGoals', 'lectureNotes', 'journalEntries', 'personalTasks', 'labExercises', 'commitments'];
  for (const key of requiredArrays) {
    if (!Array.isArray(parsed[key as keyof AppData])) {
      throw new Error(`Invalid import: missing or non-array field "${key}"`);
    }
  }
  if (typeof parsed.userName !== 'string') throw new Error('Invalid import: userName must be string');
  if (!Array.isArray(parsed.courses)) throw new Error('Invalid import: courses must be array');
  
  await updateStore(() => parsed as AppData);
}

/** Utility: derive initials from a display name */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}