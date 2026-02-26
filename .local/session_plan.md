# Objective
Build an Appointment System module where volunteers submit appointment requests with OTP verification, unit selection, personal details (name, father/husband name, mobile, address), description, voice note. Admin views submissions and assigns appointment date. If issue resolves before appointment, admin can mark resolved with note.

# Tasks

### T001: Add Schema Tables + Storage + Routes (Backend)
- **Blocked By**: []
- **Details**:
  - Add `appointments` table to `shared/schema.ts`:
    - id (varchar UUID PK), appUserId (ref appUsers), villageId, villageName, personName, fatherHusbandName, mobileNumber, mobileVerified (boolean), address, description, audioNote, status (pending→scheduled→resolved), appointmentDate (date, set by admin), adminNote, completionNote, scheduledAt (timestamp), resolvedAt (timestamp), createdAt
  - Add `appointment_logs` table:
    - id (varchar UUID PK), appointmentId (ref appointments), action, note, performedBy, performedByName, createdAt
  - Add insert schemas, insert types, select types following sunwai pattern
  - Add to IStorage interface + DatabaseStorage: createAppointment, getAppointments, getAppointmentById, updateAppointment, getAppointmentsByUser, createAppointmentLog, getAppointmentLogsByAppointment
  - Add API routes following sunwai pattern:
    - POST /api/appointment/send-otp, POST /api/appointment/verify-otp
    - POST /api/appointment/submit (create + log)
    - GET /api/appointment/my-appointments/:appUserId (with logs)
    - GET /api/appointment/appointments (admin all), GET /api/appointment/appointments/:id (with logs)
    - PATCH /api/appointment/appointments/:id/schedule (admin sets appointmentDate string YYYY-MM-DD + optional adminNote, status→scheduled)
    - PATCH /api/appointment/appointments/:id/resolve (completionNote required, status→resolved)
  - Run `npx drizzle-kit push` to create tables
  - Files: `shared/schema.ts`, `server/storage.ts`, `server/routes.ts`
  - Acceptance: Schema compiles, storage methods work, routes respond correctly, DB tables exist

### T002: Create Volunteer Form Page
- **Blocked By**: [T001]
- **Details**:
  - Create `client/src/pages/app/task-appointment.tsx`
  - Multi-step: Description (intro + previous appointments list) → Verify Mobile (OTP) → Select Unit → Form
  - Form fields: Person Name, Father/Husband Name, Mobile (pre-filled from OTP), Address (textarea), Description (textarea), Audio Note (voice recorder)
  - Use `useTranslation()` hook from `@/lib/i18n` for language (NOT localStorage)
  - Local labels object with en/hi/pa for ALL strings including toasts, following exact pattern from task-sunwai.tsx
  - Previous appointments show status badges (pending=yellow, scheduled=blue with date, resolved=green), journey timeline
  - Purple/indigo color theme (header bg-purple-700, buttons bg-purple-600, badges)
  - data-testid on all interactive elements
  - Files: `client/src/pages/app/task-appointment.tsx`
  - Reference files to follow pattern: `client/src/pages/app/task-sunwai.tsx` for OTP+audio+steps, `client/src/pages/app/task-sdsk.tsx` for previous submissions display
  - Acceptance: Complete multi-step form works end-to-end

### T003: Create Admin Page
- **Blocked By**: [T001]
- **Details**:
  - Create `client/src/pages/admin/appointment-submissions.tsx`
  - Submission list with search (name/mobile) and status filter dropdown (all/pending/scheduled/resolved)
  - Click row → detail view with all person info, description, audio player, journey timeline
  - Schedule dialog: date input (appointmentDate required) + optional adminNote textarea → PATCH /api/appointment/appointments/:id/schedule
  - Resolve dialog: completionNote textarea required → PATCH /api/appointment/appointments/:id/resolve  
  - Area-based filtering using adminAssignedVillages pattern
  - Follow `client/src/pages/admin/sunwai-submissions.tsx` pattern for layout, detail view, dialogs
  - Files: `client/src/pages/admin/appointment-submissions.tsx`
  - Acceptance: Admin can list, search, filter, schedule date, and resolve appointments

### T004: Wire Up Routing & Permissions
- **Blocked By**: [T002, T003]
- **Details**:
  - task-home.tsx: Add appointment card with Calendar icon, purple/indigo border theme, translated names (en: "Appointment", hi: "मुलाकात", pa: "ਮੁਲਾਕਾਤ"), description (en: "Request an appointment and track your scheduled meetings", hi: "मुलाकात का अनुरोध करें और अपनी निर्धारित बैठकों को ट्रैक करें", pa: "ਮੁਲਾਕਾਤ ਦੀ ਬੇਨਤੀ ਕਰੋ ਅਤੇ ਆਪਣੀਆਂ ਤਹਿ ਮੀਟਿੰਗਾਂ ਨੂੰ ਟਰੈਕ ਕਰੋ")
  - app/index.tsx: Import TaskAppointment, add route for /task/appointment
  - admin/index.tsx: Import AppointmentSubmissionsPage, add sidebar entry { id: "appointments", label: "Appointments", icon: CalendarCheck, path: "/admin/appointments", group: "Management" }, add activeSection mapping, add render block
  - role-management.tsx: Add "appointments" permission group: [{ id: "appointments:view", label: "View" }, { id: "appointments:schedule", label: "Schedule" }, { id: "appointments:resolve", label: "Resolve" }]
  - Files: `client/src/pages/app/task-home.tsx`, `client/src/pages/app/index.tsx`, `client/src/pages/admin/index.tsx`, `client/src/pages/admin/role-management.tsx`
  - Acceptance: Navigation works from both volunteer and admin side, permissions configurable
