import { useEffect, useState } from 'react';

// Badges are EARNED by the numbers (public/badges.json, written weekly from files already on GitHub), but a badge only counts once
// the TEACHER has given it (approved it in the Teacher Dashboard). What was given is kept on the student's own record
// (students/{uid}.badgesGiven: { badgeId: time, 'award-trophy': tier ... }), which the Home page already listens to (no extra read),
// and the weekly job copies it to public/badgesGiven.json so friends who visit see it too.
let promise = null;
export const loadBadgeData = () => {
  if (!promise) {
    const base = import.meta.env.BASE_URL;
    promise = Promise.all([
      fetch(`${base}badges.json`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${base}badgesGiven.json`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([earned, given]) => ({
      earned: earned || { students: {}, awards: {} },
      given: (given && given.given) || {},
      generatedAt: (earned && earned.generatedAt) || null,
    })).catch(() => { promise = null; return { earned: { students: {}, awards: {} }, given: {}, generatedAt: null }; });
  }
  return promise;
};

export function useBadgeData() {
  const [data, setData] = useState(null);
  useEffect(() => { let off = false; loadBadgeData().then(d => { if (!off) setData(d); }); return () => { off = true; }; }, []);
  return data;
}

// the badges given to a student: from their own live record when we have it, else from the weekly file (by name)
export const givenOf = (data, name, profile) => (profile ? (profile.badgesGiven || {}) : ((data && data.given[name]) || {}));
