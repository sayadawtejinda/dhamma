// Each student's all-time "weeks attended" (what grows the Bodhi Tree), from the
// static public/studentWeekly.json that scripts/generate-weekly-snapshot.mjs
// rewrites every week -- instead of every Bodhi Tree / Shrine Room open reading
// the student's whole schedule and session history from Firestore. Up to a week
// old by design. Returns null when the file or the student is missing, so the
// caller can fall back to computing it live.
let weeklyPromise = null;
const loadWeekly = () => {
  if (!weeklyPromise) {
    weeklyPromise = fetch(`${import.meta.env.BASE_URL}studentWeekly.json`)
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return weeklyPromise;
};
export async function getAttendedWeeks(studentUid) {
  if (!studentUid) return null;
  const data = await loadWeekly();
  const n = data?.attendedWeeks?.[studentUid];
  return typeof n === 'number' ? n : null;
}

// The weeks that count for the Bodhi Tree and its levels: THIS YEAR's weeks (the tree starts again every January). Falls back to the
// all-time weeks while the file has no yearly numbers yet.
export async function getTreeWeeksMap() {
  const data = await loadWeekly();
  return data?.yearWeeks || data?.attendedWeeks || null;
}

// Every student's weeks at once (uid -> weeks), or null when the file cannot be loaded. A student who
// is not in the file simply has no attended weeks yet, so use `?? 0` for them rather than a live read.
export async function getAttendedWeeksMap() {
  const data = await loadWeekly();
  return data?.attendedWeeks || null;
}
