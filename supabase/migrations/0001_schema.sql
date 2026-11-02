-- =====================================================================
-- LifeOS — schema v1
-- Rulează tot fișierul o singură dată: Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------- Profil + gamificare ----------
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null default 'Victor',
  timezone text not null default 'Europe/Bucharest',
  daily_xp_goal int not null default 150,
  created_at timestamptz not null default now()
);

-- Ariile de viață: health | fitness | mind | work | personal
create type public.area as enum ('health', 'fitness', 'mind', 'work', 'personal');

-- Fiecare acțiune care dă XP lasă o urmă aici. Anularea acțiunii șterge rândul.
create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  area public.area not null,
  amount int not null,
  source text not null,          -- 'task' | 'habit' | 'workout' | 'journal' | 'mood' | 'ritual'
  source_id uuid not null,
  created_at timestamptz not null default now(),
  unique (source, source_id)
);
create index if not exists xp_events_user_idx on public.xp_events (user_id, created_at);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,             -- ex: 'streak_7', 'first_workout'
  unlocked_at timestamptz not null default now(),
  unique (user_id, key)
);

-- ---------- Taskuri (cascadă lună → săptămână → zi) ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  area public.area not null default 'work',
  color text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create type public.horizon as enum ('month', 'week', 'day');
create type public.priority as enum ('low', 'medium', 'high');

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  area public.area not null default 'personal',
  priority public.priority not null default 'medium',
  project_id uuid references public.projects (id) on delete set null,
  parent_id uuid references public.tasks (id) on delete set null,  -- obiectivul lunar / taskul săptămânal din care vine
  horizon public.horizon not null default 'day',
  period date,                    -- 1 a lunii / luni din săptămână / ziua. null = Inbox
  start_time time,                -- pentru calendar (time blocking)
  duration_min int,
  recurrence jsonb,               -- ex: {"freq":"weekly","interval":1,"days":[1,3,5]}
  done boolean not null default false,
  done_at timestamptz,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_period_idx on public.tasks (user_id, horizon, period);
create index if not exists tasks_parent_idx on public.tasks (parent_id);

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order double precision not null default 0
);
create index if not exists subtasks_task_idx on public.subtasks (task_id);

-- Ritualuri: planificare dimineața, review seara, planificare săptămânală
create type public.ritual_kind as enum ('plan_day', 'review_day', 'plan_week');

create table if not exists public.rituals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.ritual_kind not null,
  date date not null,
  notes text,
  completed_at timestamptz not null default now(),
  unique (user_id, kind, date)
);

-- ---------- Obiceiuri + tratamente ----------
-- scheduled: în anumite zile, la una sau mai multe ore (pastile, suplimente)
-- weekly:    de X ori pe săptămână (sală)
-- quantity:  țintă zilnică cu unitate (2.5 L apă)
create type public.habit_kind as enum ('scheduled', 'weekly', 'quantity');

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  emoji text,
  area public.area not null default 'health',
  kind public.habit_kind not null default 'scheduled',
  times time[] not null default '{}',             -- scheduled: {08:00,20:00}
  days_of_week int[] not null default '{1,2,3,4,5,6,7}', -- 1 = luni ... 7 = duminică
  weekly_target int,                               -- weekly: 4
  target_value numeric,                            -- quantity: 2.5
  unit text,                                       -- quantity: 'L'; scheduled: '1 capsulă'
  step_value numeric,                              -- quantity: cât adaugă butonul + (0.25)
  detail text,                                     -- ex: '1 capsulă', 'după masă'
  notify boolean not null default true,
  xp int not null default 10,
  archived boolean not null default false,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id, archived);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  date date not null,                 -- ziua la care se referă
  slot time,                          -- ora programată bifată (scheduled); null altfel
  logged_at timestamptz not null default now(),  -- ora reală (editabilă)
  value numeric,                      -- quantity: cât s-a adăugat
  note text,
  created_at timestamptz not null default now()
);
create unique index if not exists habit_logs_slot_uniq on public.habit_logs (habit_id, date, slot) where slot is not null;
create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, date);

-- ---------- Gym ----------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  muscle_group text,               -- piept, spate, picioare...
  equipment text,                  -- bară, gantere, aparat...
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,              -- Push, Pull, Legs
  color text,
  sort_order double precision not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  target_sets int not null default 3,
  target_reps text,                -- '8-12'
  rest_sec int not null default 90,
  sort_order double precision not null default 0
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id uuid references public.workout_templates (id) on delete set null,
  name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists workouts_user_idx on public.workouts (user_id, started_at desc);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  set_index int not null,
  weight_kg numeric,
  reps int,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists workout_sets_exercise_idx on public.workout_sets (user_id, exercise_id, created_at desc);

-- ---------- Jurnal + mood ----------
create table if not exists public.mood_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  mood int not null check (mood between 1 and 5),
  energy int check (energy between 1 and 5),
  sleep_hours numeric,
  tags text[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);
create index if not exists mood_user_date_idx on public.mood_checkins (user_id, date);

-- free:     jurnal liber
-- reframe:  NEGATIV ↔ POZITIV (perechile sunt în reframe_items)
create type public.journal_kind as enum ('free', 'reframe');

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.journal_kind not null default 'free',
  date date not null,
  title text,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_user_date_idx on public.journal_entries (user_id, date desc);

create table if not exists public.reframe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_id uuid not null references public.journal_entries (id) on delete cascade,
  negative text not null,          -- frica / ce mă apasă
  positive text,                   -- aceeași situație, văzută pozitiv
  sort_order double precision not null default 0
);

-- ---------- Notificări push ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Ce notificări au plecat deja (ca să nu trimitem de două ori)
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  date date not null,
  slot time not null,
  sent_at timestamptz not null default now(),
  unique (habit_id, date, slot)
);

-- =====================================================================
-- Securitate (RLS): fiecare vede și modifică doar rândurile lui
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','xp_events','achievements','projects','tasks','subtasks','rituals',
    'habits','habit_logs','exercises','workout_templates','template_exercises',
    'workouts','workout_sets','mood_checkins','journal_entries','reframe_items',
    'push_subscriptions','notification_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Profil creat automat la primul login
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
