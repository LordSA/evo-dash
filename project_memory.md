# Project Memory: Evo-Dash (Evolvia Dynamic Admin Dashboard)

This document provides a technical overview of the `evo-dash` management dashboard, detailing components, directory structure, database schemas, and integration points with the `evolvia` web portal.

---

## 1. Project Overview & Architecture

`evo-dash` is a lightweight direct management dashboard for the **Evolvia** flagship event by **IEDC CEV** (College of Engineering Vadakara). It operates directly via Supabase public/anon APIs with zero authentication barriers for internal cell event managers.

### Key Capabilities
- **Direct Access (No Auth)**: Direct CRUD operations on events, stalls, speakers, and sponsors using Supabase URL & Anon Key.
- **Events & Pre-Events Management**: Create, edit, reorder, mark completed (with grayscale/completed poster preview), toggle registration closed/open, manage slugs, specifications, date & time, venue, and live registration links.
- **Stalls & Expos**: Manage startup stalls, innovation displays, and robotic expos.
- **Keynote Speakers**: Manage guests, speakers, designations, and domains of expertise.
- **Sponsors & Partners**: Manage sponsor logos, categories/tiers, and ordering.
- **Direct Supabase Media Uploads**: Instant image uploading to Supabase Storage bucket (`evolvia-media`).
- **Graceful Fallback Mode**: If Supabase credentials are not provided, operates in browser LocalStorage mode seamlessly.

### Technical Stack
- **Framework**: Next.js 15 (App Router)
- **UI & Icons**: React 19, Lucide React icons, Tailwind CSS v4
- **Database & Storage**: Supabase SSR (`@supabase/supabase-js`, `@supabase/ssr`)
- **Deployment**: Node 18+

---

## 2. Directory Structure

```
evo-dash/
+-- src/
¦   +-- app/
¦   ¦   +-- globals.css          # Design system variables & base styling
¦   ¦   +-- layout.tsx           # Root dashboard layout & theme
¦   ¦   +-- page.tsx             # Main dashboard view with tabbed managers
¦   +-- components/
¦   ¦   +-- EventCardPreview.tsx # Live card preview reproducing Evolvia aesthetics
¦   ¦   +-- EventsManager.tsx    # Pre-event and Main event CRUD interface
¦   ¦   +-- SpeakersManager.tsx  # Keynote speakers & guests interface
¦   ¦   +-- SponsorsManager.tsx  # Sponsors & brand partners interface
¦   ¦   +-- StallsManager.tsx    # Stalls & expos showcase interface
¦   +-- lib/
¦   ¦   +-- initialData.ts       # Default Evolvia datasets for seeding
¦   ¦   +-- supabase.ts          # Supabase client & storage upload utility
¦   +-- types/
¦       +-- database.ts          # TypeScript schemas for all entities
+-- AGENTS.md                    # Developer rules & comment policies
+-- design.md                    # Visual tokens, colors, and design standards
+-- changelogs.md                # Release history and modifications
+-- README.md                    # Getting started & deployment documentation
+-- package.json
```

---

## 3. Database Schema (Supabase)

| Table Name | Description | Key Fields |
| :--- | :--- | :--- |
| `events` | Pre-events and main events | `id` (UUID), `slug` (text unique), `name` (text), `type` ('pre_event' \| 'main_event'), `description` (text), `spec` (text), `date_time` (text), `venue` (text), `link` (text), `poster_url` (text), `completed_poster_url` (text), `is_completed` (boolean), `is_closed` (boolean), `order_index` (int), `created_at`, `updated_at` |
| `stalls_and_expos` | Stalls and expos | `id` (UUID), `name` (text), `image_url` (text), `description` (text), `order_index` (int), `created_at` |
| `speakers` | Keynote speakers and guests | `id` (UUID), `name` (text), `designation` (text), `expertise` (text), `image_url` (text), `order_index` (int), `created_at` |
| `sponsors` | Event sponsors and partners | `id` (UUID), `name` (text), `image_url` (text), `category` (text), `order_index` (int), `created_at` |
