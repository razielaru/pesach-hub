-- טבלת יחידות
create table public.units (
  id text primary key,
  name text,
  pin text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- אזורי ניקיון
create table public.cleaning_areas (
  id uuid default gen_random_uuid() primary key,
  unit_id text references public.units(id) on delete cascade,
  name text not null,
  status text default 'dirty',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- משימות
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  unit_id text references public.units(id) on delete cascade,
  title text not null,
  description text,
  priority text default 'normal',
  due_date text,
  status text default 'todo',
  assigned_by text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- אבני דרך (טיימליין)
create table public.milestones (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  due_date text,
  category text,
  sort_order integer default 99
);

-- סטטוס אבני דרך לכל יחידה
create table public.milestone_status (
  id uuid default gen_random_uuid() primary key,
  milestone_id uuid references public.milestones(id) on delete cascade,
  unit_id text references public.units(id) on delete cascade,
  status text default 'pending',
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(milestone_id, unit_id)
);

-- כוח אדם
create table public.personnel (
  id uuid default gen_random_uuid() primary key,
  unit_id text references public.units(id) on delete cascade,
  name text not null,
  role text,
  status text default 'available',
  training_status text default 'none'
);

-- ציוד ולוגיסטיקה
create table public.equipment (
  id uuid default gen_random_uuid() primary key,
  unit_id text references public.units(id) on delete cascade,
  name text not null,
  category text,
  have integer default 0,
  need integer default 0
);

-- יומן ניפוקים
create table public.dispatch_log (
  id uuid default gen_random_uuid() primary key,
  unit_id text references public.units(id) on delete cascade,
  item_name text not null,
  quantity integer default 1,
  notes text,
  dispatched_by text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- שו"ת וחמ"ל הלכתי
create table public.qna (
  id uuid default gen_random_uuid() primary key,
  unit_id text references public.units(id) on delete cascade,
  question text not null,
  category text,
  is_global boolean default false,
  is_faq boolean default false,
  answer text,
  answered_by text,
  answered_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- צ'אט בין יחידות
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  unit_id text references public.units(id) on delete cascade,
  unit_name text not null,
  channel_name text default 'כללי',
  message text not null,
  is_broadcast boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- מבזקים מהפיקוד
create table if not exists public.broadcast_alerts (
  id uuid default gen_random_uuid() primary key,
  message text not null,
  sent_by text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- שיבוצי ליל הסדר
create table if not exists public.seder_assignments (
  id uuid default gen_random_uuid() primary key,
  unit_id text references public.units(id) on delete cascade,
  base_name text not null,
  rabbi_name text,
  participants integer,
  kit_delivered boolean default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- הרשאות
alter table public.chat_messages enable row level security;
alter table public.broadcast_alerts enable row level security;
alter table public.seder_assignments enable row level security;

create policy "public all" on public.chat_messages for all using (true);
create policy "public all" on public.broadcast_alerts for all using (true);
create policy "public all" on public.seder_assignments for all using (true);
