// Catalog of purchasable home-page background images, sold in the Avatar
// Shop (see the 🏠 Home Background category in AvatarApp.jsx) and rendered
// on the student's Tutoring home page (see StudentDashboard in
// TutoringApp.jsx). Shared between the two files so they can never drift
// out of sync on what a given id looks like or costs.
//
// 'default' is the ORIGINAL house picture every student has always seen --
// free and always owned, so it's also the safe fallback if a student's
// `homeBackground` field is missing or points at a since-removed id.
//
// Prices are per-item (not a single flat rate) since the teacher expects
// future backgrounds to be priced differently depending on the image --
// just add a new entry here with its own `cost`.
export const HOME_BACKGROUNDS = [
  { id: 'default', name: 'Traditional Wooden House', image: 'images/0003.jpg', cost: 0 },
  { id: 'condo', name: 'Modern City Condo', image: 'images/0004.jpg', cost: 10000 },
  { id: 'cozy-house', name: 'Cozy Family House', image: 'images/0005.jpg', cost: 10000 },
];

export const getHomeBackground = (id) => HOME_BACKGROUNDS.find(b => b.id === id) || HOME_BACKGROUNDS[0];
