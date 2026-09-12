# Evo-Dash: Evolvia Event Management Dashboard

A modern, fast admin dashboard to manage events, pre-events, stalls, speakers, and sponsors for **Evolvia (IEDC CEV)**.

---

## ?? Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Supabase (Optional for Local Storage mode)**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Add your Supabase project URL and anon public key.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## ?? Features

- **Events & Pre-Events**: Full CRUD, slug management, poster uploads, completed hover poster uploads, status toggles.
- **Stalls & Expos**: Interactive stall catalog management.
- **Speakers**: Keynote speaker profiles with photos and designations.
- **Sponsors**: Brand partner management and tier categorization.
- **Supabase Integration**: PostgreSQL schema, RLS policies, storage bucket configuration, and 1-click database seeding.
