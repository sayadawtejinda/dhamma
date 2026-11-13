// The teacher's classes are in Pacific time, and "attended" means a session on the same CALENDAR DAY (Pacific) as the class.
// GitHub's runner is in UTC, where a Sunday 5 pm class falls on Monday and a student who joins a few minutes early falls on Sunday:
// that once counted real absences that never happened and doubled every weekly slot. Import this file FIRST in any script that
// counts days (imports run in order, so the zone is set before any other module makes a date), and call assertClassTimezone()
// before using the numbers: a wrong zone then stops the run instead of publishing wrong attendance.
export const CLASS_TZ = 'America/Los_Angeles';
process.env.TZ = CLASS_TZ;

export function assertClassTimezone() {
  const winter = new Date(2026, 0, 15, 12).getTimezoneOffset(); // Pacific Standard Time = UTC-8 -> 480
  const summer = new Date(2026, 6, 15, 12).getTimezoneOffset(); // Pacific Daylight Time = UTC-7 -> 420
  if (winter !== 480 || summer !== 420) {
    throw new Error(`Attendance must be counted in Pacific time (${CLASS_TZ}) but this machine's offsets are ${winter}/${summer}. Nothing was written.`);
  }
}
