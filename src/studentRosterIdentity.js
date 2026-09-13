import { doc, getDoc, getDocs, setDoc, collection, query, where } from 'firebase/firestore';

// Every per-app roster doc in this suite used to be keyed by a sanitized
// display name (doc(ROSTER_PATH, sanitizeXKey(studentName))) -- fragile the
// moment a student is renamed, since the doc id itself doesn't move with
// them. This is the same fix already proven in AbhidhammaApp.jsx
// (migrateOldAbhiRosterDoc), pulled out here so every app uses the exact
// same pattern instead of a bespoke copy each.

// A roster doc keyed by the student's stable studentUid instead of their
// (renameable) display name.
export function rosterDocRefByUid(db, rosterPath, uid) {
  return doc(db, rosterPath, uid);
}

// Call once, inline, the first time a student's own ping/heartbeat effect
// finds no doc yet under their uid (see any app's "roster doesn't exist yet
// -- create it" branch). Looks for an OLD name-keyed doc for this student —
// `doc(rosterPath, sanitizeName(name))`, using the exact sanitize rule the
// app already uses for that collection — copies its fields onto the new
// uid-keyed doc, and marks the old one `{migratedTo: uid}` (never deleted,
// cheap insurance). Returns the old doc's carried-over fields (studentName/
// name/migratedTo/renamedTo stripped) so the caller can spread them into
// the fresh doc it's about to create, or null if there was nothing to
// carry forward.
export async function migrateNameKeyedRosterDoc(db, rosterPath, uid, name, sanitizeName) {
  if (!name) return null;
  try {
    // The old doc's own id already IS the sanitized name, so a direct getDoc
    // covers the common case -- but a student's CURRENT display name might
    // not match the name their old doc was created under if a rename
    // already happened once before this fix shipped, so fall back to a
    // query scan by studentName field too.
    let oldDocRef = doc(db, rosterPath, sanitizeName(name));
    let oldSnap = await getDoc(oldDocRef);
    if (!oldSnap.exists() || oldSnap.data().migratedTo) {
      const rosterCol = collection(db, rosterPath);
      const byNameSnap = await getDocs(query(rosterCol, where('studentName', '==', name)));
      const found = byNameSnap.docs.find(d => d.id !== uid && !d.data().migratedTo);
      if (!found) return null;
      oldDocRef = found.ref;
      oldSnap = found;
    }
    if (!oldSnap.exists() || oldSnap.data().migratedTo) return null;
    await setDoc(oldDocRef, { migratedTo: uid }, { merge: true });
    const data = { ...oldSnap.data() };
    delete data.renamedTo; delete data.migratedTo; delete data.studentName; delete data.name;
    return data;
  } catch (e) {
    console.error('Roster migration lookup error:', e);
    return null;
  }
}
