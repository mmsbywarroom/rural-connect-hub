# Patiala Rural - Voter Management System

## Overview

Patiala Rural is a comprehensive voter, volunteer, and office management system designed to streamline political operations. It features an Office portal for grievance recording, an Admin panel for managing volunteers and master data, and a Volunteer portal for field activities. The system tracks voters, volunteers, family members, office visitors, and administrative entities such as villages, issues, and departments. The core purpose is to enhance data management, volunteer coordination, and citizen engagement within the Patiala Rural constituency.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod validation
- **UI Components**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON APIs
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Schema**: Shared `shared/schema.ts`
- **Migrations**: Drizzle Kit

### Project Structure
- `client/`: React frontend
- `server/`: Express backend
- `shared/`: Shared code (schemas, types)
- `migrations/`: Database migrations

### Key Design Patterns
- **Storage Interface**: Abstracted database operations in `server/storage.ts`
- **Shared Types**: `shared/schema.ts` for type safety across frontend/backend
- **Query Client**: Centralized API request handling in `client/src/lib/queryClient.ts`
- **Component Composition**: shadcn/ui components copied for customization.

### Database Schema Highlights
Includes master tables for geographical hierarchy (Zone > District > Halka > Block Number > Village/Ward), administrative entities (issues, wings, positions, departments), and core entities (users, volunteers, family members, visitors). Also features tables for Server-Driven UI (SDUI), Harr Sirr te Chatt (HSTC) module, Sukh-Dukh Sahayta Kendra (SDSK) module, and Surveys.

### Village Hierarchy
A detailed hierarchy (Zone > District > Halka > Block Number > Village/Ward) is stored and resolved. User registration maps the full hierarchy to `app_users`.

### Server-Driven UI (SDUI) Architecture
- **Dynamic Task Management**: Admin defines form structures via Task Manager and Form Builder.
- **Configurable Forms**: Task configs store metadata; form fields define structure with multi-language support and conditional logic.
- **Dynamic Rendering**: `task-dynamic.tsx` renders forms based on fetched configurations.
- **Localization**: `getLocalizedText` utility provides multi-language support for UI elements.
- **CSV Operations**: Supports bulk import and export of data.

### Harr Sirr te Chatt (HSTC) Module
- **Social Welfare Initiative**: Manages housing applications for roof repair/construction.
- **Volunteer Form**: Multi-step form with OTP verification, document uploads, and image capture.
- **Admin Management**: Submissions list with search, filter, detail view, document viewer, OCR data display, and an approve/reject workflow.
- **OCR Integration**: Extracts data from Aadhaar and Voter ID for auto-population.
- **Duplicate Prevention**: Prevents multiple submissions for the same mobile number by a volunteer.
- **Edit Control**: Admin can toggle edit access for submissions.

### Key Admin Pages
- **Task Manager**: Create and manage dynamic tasks.
- **Form Builder**: Design forms with drag-and-drop.
- **HSTC Submissions**: Review and manage housing applications.
- **SDSK Submissions**: Manage Sukh-Dukh submissions and categories. Admin accept with note, close with note. Notes visible to user in volunteer portal. API: PATCH /api/sdsk/submissions/:id/accept, PATCH /api/sdsk/submissions/:id/close.
- **Survey Manager**: Create multilingual surveys, view responses, and export data.
- **Birthday Manager**: Track and manage user birthdays.
- **CSV Upload**: Bulk import master data.
- **Data Export**: Export task submissions and user data.

### Analytics & Reporting (Admin)
- **Dashboard**: Overview of platform activity, submission trends, user leaderboards.
- **Task Reports**: Detailed analytics per task, including submission trends and field analytics.
- **User Reports**: Overview of user activity and individual submission history.

### Unit-First Workflow
- **Village-centric Data Entry**: Volunteer portal tasks require unit selection before form submission.
- **Contextual Data**: Submissions are tagged with `selectedVillageId` and `selectedVillageName`.
- **Unit History**: Users can view their past submissions for the selected unit.

### Volunteer Portal Dynamic Tasks
- **Dynamic Task Home**: Displays enabled task cards.
- **Dynamic Form Rendering**: Renders forms based on server configurations.

### Profile Completion
- **Progress Tracking**: Calculates profile completion percentage based on filled fields.
- **Editable Profile**: Users can update their profile information with photo uploads and OCR integration.

### Sunwai (Hearing/Complaint) Module
Grievance redressal system for citizens to submit complaints:
- **Volunteer Form**: /app/task/sunwai - Multi-step flow: Mobile OTP verification → Unit selection → Complaint form (name, father/husband name, mobile, searchable issue category dropdown, text complaint note, audio recording)
- **Admin Page**: /admin/sunwai - Submissions list with search/filter by status, detail view, accept with timeline (expected days), complete with note
- **Journey Tracking**: Every action (submitted, accepted, completed) logged in sunwai_logs table; timeline visible to admin and complainant
- **Database**: sunwai_complaints table (complainant details, issue category, audio note, status, expected days, admin/completion notes, timestamps), sunwai_logs table (action log with performer info)
- **API Routes**: POST /api/sunwai/send-otp, POST /api/sunwai/verify-otp, POST /api/sunwai/submit, GET /api/sunwai/my-complaints/:appUserId, GET /api/sunwai/complaints, GET /api/sunwai/complaints/:id, PATCH /api/sunwai/complaints/:id/accept, PATCH /api/sunwai/complaints/:id/complete
- **Permissions**: sunwai (view, accept, complete) in role management

### Outdoor Advertisement Module
Outdoor advertising wall space management:
- **Volunteer Form**: /app/task/outdoor-ad - Multi-step flow: Unit selection → Mobile OTP verification → Form (owner name, mobile, wall size, frame type with/without, Google Maps location picker with current location and pin selection)
- **Admin Page**: /admin/outdoor-ads - Submissions list with search/filter by status, detail view with static map, approve with required note
- **Database**: outdoor_ad_submissions table (owner details, wall size, frame type, lat/lng coordinates, location address, status, admin note)
- **API Routes**: POST /api/outdoor-ad/send-otp, POST /api/outdoor-ad/verify-otp, POST /api/outdoor-ad/submit, GET /api/outdoor-ad/my-submissions/:appUserId, GET /api/outdoor-ad/submissions, GET /api/outdoor-ad/submissions/:id, PATCH /api/outdoor-ad/submissions/:id/approve
- **Permissions**: outdoor-ads (view, approve) in role management
- **Google Maps**: Uses VITE_GOOGLE_MAPS_API_KEY for interactive map on volunteer side and static map on admin side

### Gov School Work Module
Government school issue reporting and tracking:
- **Volunteer Form**: /app/task/gov-school - Multi-step flow: Mobile OTP verification → Unit selection → Form (school name, principal name & mobile, issue category dropdown, nodal volunteer name & mobile, description, audio note, Google Maps location)
- **Admin Page**: /admin/gov-school - Two tabs: Submissions (list with search/filter by status, detail view with static map, journey timeline, accept with note, resolve with note) and Categories (add/edit/toggle/delete issue categories)
- **Journey Tracking**: Every action (submitted, accepted, resolved) logged in gov_school_logs table; timeline visible to admin and submitter
- **Database**: gov_school_issue_categories table (name, nameHi, namePa, isActive), gov_school_submissions table (school details, principal details, issue category, nodal volunteer, description, audio, lat/lng, status, admin/completion notes), gov_school_logs table (action log)
- **Default Categories**: Teachers, Equipment, Infrastructure, Manpower/Staff, Grounds, Toilets, Clean Drinking Water (admin can add more)
- **API Routes**: POST /api/gov-school/send-otp, POST /api/gov-school/verify-otp, POST /api/gov-school/submit, GET /api/gov-school/my-submissions/:appUserId, GET /api/gov-school/submissions, GET /api/gov-school/submissions/:id, PATCH /api/gov-school/submissions/:id/accept, PATCH /api/gov-school/submissions/:id/resolve, CRUD /api/gov-school/categories
- **Permissions**: gov-school (view, accept, resolve, categories) in role management
- **Google Maps**: Uses VITE_GOOGLE_MAPS_API_KEY for interactive map on volunteer side and static map on admin side

### Appointment Module
Appointment request and scheduling system:
- **Volunteer Form**: /app/task/appointment - Multi-step flow: Mobile OTP verification → Unit selection → Form (person name, father/husband name, mobile, address, description, audio note)
- **Admin Page**: /admin/appointments - Submissions list with search/filter by status, detail view with journey timeline. Admin schedules appointment date or resolves directly with note
- **Journey Tracking**: Every action (submitted, scheduled, resolved) logged in appointment_logs table
- **Database**: appointments table (person details, mobile, address, description, audio, status pending→scheduled→resolved, appointmentDate, admin/completion notes), appointment_logs table (action log)
- **API Routes**: POST /api/appointment/send-otp, POST /api/appointment/verify-otp, POST /api/appointment/submit, GET /api/appointment/my-appointments/:appUserId, GET /api/appointment/appointments, GET /api/appointment/appointments/:id, PATCH /api/appointment/appointments/:id/schedule, PATCH /api/appointment/appointments/:id/resolve
- **Permissions**: appointments (view, schedule, resolve) in role management
- **Color Theme**: Purple/indigo

### OCR Auto-Populate
- **Client-side OCR**: Uses Tesseract.js for text extraction from Aadhaar and Voter ID.
- **Automatic Field Filling**: Extracted data automatically populates relevant form fields.

### Authentication
- **Office Portal**: User ID and password authentication via `office_managers` table.
- **Volunteer Portal**: Email OR Mobile Number + 4-digit OTP authentication, with Google Sign-In as an alternative.
- **OTP Management**: OTPs sent via email/FAST2SMS, stored in `otp_codes` table with expiry.

## External Dependencies

### Database
- **PostgreSQL**
- **connect-pg-simple** (for session management)

### UI Libraries
- **Radix UI**
- **Tailwind CSS**
- **Lucide React** (Icons)
- **Embla Carousel**
- **Recharts** (Charting)
- **Vaul** (Drawer component)

### Form & Validation
- **React Hook Form**
- **Zod**
- **@hookform/resolvers**

### Build & Development
- **Vite**
- **esbuild**
- **tsx**

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**
- **@replit/vite-plugin-cartographer**
- **@replit/vite-plugin-dev-banner**