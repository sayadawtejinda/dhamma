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
//
// isCanonicalRosterDoc guards against a real failure mode on a device whose
// anonymous-auth session keeps getting reset (private browsing, a shared
// device used by more than one student, a tablet that clears site data
// between uses): each reset hands out a brand-new uid before this app's own
// identity has settled, which used to let this function find an ALREADY
// correctly uid-keyed doc (from an earlier, correct visit -- someone's real
// coins/progress) and treat it as if it were an old orphaned name-keyed
// doc, copying it onto yet another throwaway uid and marking the real one
// migratedTo. Repeated across several resets, a student's data cascades
// across a trail of dead-end uids and whichever doc is "current" ends up
// with only a partial, stale copy. A doc whose own id already equals its
// own uid field is already canonical and must never be used as a migration
// source, no matter what name it carries -- this is the same fix applied
// to AbhidhammaApp.jsx's local migration helper, pulled into the one
// shared utility so every app that calls this function is protected.
function isCanonicalRosterDoc(docSnap, sanitizeName) {
  const data = docSnap.data();
  // Most apps' create/ping writes include a `userId` field carrying their
  // own doc id -- when present, this is the most direct signal: a doc
  // whose id equals its own userId field was created by the uid-keyed
  // path and is canonical, full stop.
  if (data.userId && docSnap.id === data.userId) return true;
  // Not every app writes that field, so fall back to the name-based
  // signal: a genuine OLD name-keyed doc's id is exactly
  // sanitizeName(its own studentName) -- a doc whose id does NOT match
  // that is either already uid-keyed (canonical) or something else, never
  // a safe migration source.
  const ownName = data.studentName || data.name;
  if (ownName) return docSnap.id !== sanitizeName(ownName);
  // No userId field and no name to check either way -- can't prove this
  // is an old orphaned name-keyed doc (those always carry a studentName),
  // so default to protecting it rather than risk cascading someone's real
  // data onto a throwaway uid.
  return true;
}
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
    if (!oldSnap.exists() || oldSnap.data().migratedTo || isCanonicalRosterDoc(oldSnap, sanitizeName)) {
      const rosterCol = collection(db, rosterPath);
      const byNameSnap = await getDocs(query(rosterCol, where('studentName', '==', name)));
      const found = byNameSnap.docs.find(d => d.id !== uid && !d.data().migratedTo && !isCanonicalRosterDoc(d, sanitizeName));
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
