// How many "outstanding student" announcements may run at the same time. More
// than that would crowd the screen, so extras wait (approved, but scheduled to
// start when a slot frees up) and then take their turn one after another.
// Change this one number to allow more later (4, 5 ...).
export const STAR_MAX_LIVE = 3;
// How long one student announcement runs once its turn comes.
export const STAR_RUN_DAYS = 7;
