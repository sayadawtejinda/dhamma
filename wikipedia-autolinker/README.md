# Wikipedia Auto-Linker

React + Firebase (Firestore) helper for finishing Wikipedia articles: it auto-links saved keywords in the text,
lets you review each link, and copies the final wikitext. Saved keywords are stored in Firestore.

`App.jsx` expects the host environment to provide `__firebase_config`, `__app_id` and `__initial_auth_token`.
