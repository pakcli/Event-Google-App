# Event Inbox 📅

A mobile-friendly, shared event calendar with request approvals, Claude AI screenshot extraction, and one-tap Google Calendar integration.

## Core Features

- **Shared Event List**: Low-noise event list (Work, Social, Reminder, Other).
- **Role-Based Permissions**:
  - **Viewer**: Propose events (up to 5 pending suggestions capped). Edit/delete own pending suggestions. Duplicate events into new pending suggestions.
  - **Admin**: Publish events directly, approve or reject pending viewer suggestions, edit or delete any event, and manage user roles.
- **Direct Google Calendar Integration**: One-tap deep link (`https://calendar.google.com/calendar/render`) pre-filled with event details.
- **Claude AI Screenshot Extraction**: Zero paid Vision API backend cost. Click "Open in Claude to extract events", paste your flyer/screenshot, copy Claude's single-line OTP JSON response back into the app.
- **CSV Import & Export**: Import batch events via CSV or JSON; export visible events to CSV/JSON files.

## Project Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Motion
- **Backend & Database**: Firebase Firestore & Firebase Auth
- **Data Model**:
  - `events` collection: title, start, startTime, end, endTime, location, type, status, requestedBy, added
  - `roles` collection: email to role mapping (`admin` vs `viewer`)

## Setup & Deployment Instructions

1. **Clone Repository & Install Dependencies**:
   ```bash
   npm install
   ```
2. **Configure Firebase**:
   - Create a Firebase project in the Firebase Console.
   - Enable Firestore Database and Google Authentication.
   - Copy client credentials into `firebase-applet-config.json` or environment variables in `.env`.
3. **Admin Configuration**:
   - Admin roles are looked up in the Firestore `roles` collection or defined via `VITE_ADMIN_EMAILS` environment variable.
4. **Run Local Server**:
   ```bash
   npm run dev
   ```

## License

MIT License. Open source.
