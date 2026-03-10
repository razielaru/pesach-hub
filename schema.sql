-- ══════════════════════════════════════════
--  פסח-האב — סכמת Supabase מלאה
--  הרץ בתוך SQL Editor של Supabase
-- ══════════════════════════════════════════

-- יחידות
create table if not exists units (
  id text primary key,
  name text not null,
  icon text default '🛡',
  brigade text,
  pin text,
  is_admin boolean default false,
  is_senior boolean default false,
  logo_url text,
  created_at timestamptz default now()
);

-- כוח אדם
create table if not exists personnel (
  id uuid primary key default gen_random_uuid(),
  unit_id text references units(id) on delete cascade,
  name text not null,
  role text default 'סגל',
  status text default 'available', -- available|zoom|away|leave
  training_status text default 'none', -- none|active|done
  training_start date,
  training_end date,
  created_at timestamptz default now()
);

-- ציוד
create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  unit_id text references units(id) on delete cascade,
  name text not null,
  category text default 'כללי',
  have integer default 0,
  need integer default 1,
  created_at timestamptz default now()
);

-- אזורי ניקיון
create table if not exists cleaning_areas (
  id uuid primary key default gen_random_uuid(),
  unit_id text references units(id) on delete cascade,
  name text not null,
  status text default 'dirty', -- dirty|partial|clean
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- משימות
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  unit_id text references units(id) on delete cascade,
  title text not null,
  description text,
  priority text default 'normal', -- urgent|high|normal
  status text default 'todo', -- todo|doing|done
  due_date date,
  assigned_by text, -- שם היחידה שיצרה
  created_at timestamptz default now()
);

-- חריגים / SOS
create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  unit_id text references units(id) on delete cascade,
  title text not null,
  description text,
  severity text default 'medium', -- low|medium|high|critical
  status text default 'open', -- open|in_progress|resolved
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- שו"ת הלכתי
create table if not exists qna (
  id uuid primary key default gen_random_uuid(),
  unit_id text references units(id) on delete cascade,
  question text not null,
  answer text,
  category text default 'כשרות',
  is_faq boolean default false,
  answered_by text,
  image_url text,
  created_at timestamptz default now(),
  answered_at timestamptz
);

-- אבני דרך (טיימליין)
create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_date date not null,
  category text default 'כללי',
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- סטטוס אבני דרך לפי יחידה
create table if not exists milestone_status (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid references milestones(id) on delete cascade,
  unit_id text references units(id) on delete cascade,
  status text default 'pending', -- pending|in_progress|done
  notes text,
  updated_at timestamptz default now(),
  unique(milestone_id, unit_id)
);

-- יומן ניפוקים
create table if not exists dispatch_log (
  id uuid primary key default gen_random_uuid(),
  unit_id text references units(id) on delete cascade,
  item_name text not null,
  quantity integer default 1,
  notes text,
  dispatched_by text,
  created_at timestamptz default now()
);

-- ── RLS Policies (Row Level Security) ──
-- כרגע פתוח לכולם — ניתן להחמיר בהמשך
alter table units enable row level security;
alter table personnel enable row level security;
alter table equipment enable row level security;
alter table cleaning_areas enable row level security;
alter table tasks enable row level security;
alter table incidents enable row level security;
alter table qna enable row level security;
alter table milestones enable row level security;
alter table milestone_status enable row level security;
alter table dispatch_log enable row level security;

create policy "public read" on units for select using (true);
create policy "public all" on personnel for all using (true);
create policy "public all" on equipment for all using (true);
create policy "public all" on cleaning_areas for all using (true);
create policy "public all" on tasks for all using (true);
create policy "public all" on incidents for all using (true);
create policy "public all" on qna for all using (true);
create policy "public all" on milestones for all using (true);
create policy "public all" on milestone_status for all using (true);
create policy "public all" on dispatch_log for all using (true);

-- ── נתוני ברירת מחדל ── יחידות
insert into units (id, name, icon, brigade, pin, is_admin, is_senior) values
  ('binyamin',   'חטמ"ר בנימין',  '🛡', 'חטמ"רים', null,   false, false),
  ('shomron',    'חטמ"ר שומרון',  '🛡', 'חטמ"רים', null,   false, false),
  ('yehuda',     'חטמ"ר יהודה',   '🛡', 'חטמ"רים', null,   false, false),
  ('etzion',     'חטמ"ר עציון',   '🛡', 'חטמ"רים', null,   false, false),
  ('efraim',     'חטמ"ר אפרים',   '🛡', 'חטמ"רים', null,   false, false),
  ('menashe',    'חטמ"ר מנשה',    '🛡', 'חטמ"רים', null,   false, false),
  ('habikaa',    'חטמ"ר הבקעה',   '🛡', 'חטמ"רים', null,   false, false),
  ('hativa_35',  'חטיבה 35',       '⚔', 'חטיבות',  null,   false, false),
  ('hativa_89',  'חטיבה 89',       '⚔', 'חטיבות',  null,   false, false),
  ('hativa_900', 'חטיבה 900',      '⚔', 'חטיבות',  null,   false, false),
  ('ugdat_877',  'אוגדת 877',       '🎖', 'אוגדות',  '8770', false, true),
  ('ugda_96',    'אוגדת 96',        '🎖', 'אוגדות',  '9600', false, true),
  ('ugda_98',    'אוגדת 98',        '🎖', 'אוגדות',  '9800', false, true),
  ('pikud',      'פיקוד מרכז',      '⭐', 'פיקוד',   '1234', true,  true)
on conflict (id) do nothing;

-- אבני דרך מוגדרות מראש
insert into milestones (title, description, due_date, category, sort_order) values
  ('ניקיון יבש',          'ניקוי ראשוני של כל המרחבים',        '2026-03-25', 'ניקיון',   1),
  ('הגעלת כלים אזורית',  'הגעלת כלי המטבח לפסח',              '2026-03-28', 'כשרות',    2),
  ('בדיקת חמץ',           'בדיקת כל אזורי היחידה',              '2026-04-01', 'כשרות',    3),
  ('ביעור חמץ',            'שריפת וביעור כל החמץ',               '2026-04-02', 'כשרות',    4),
  ('חלוקת מנות קרב',      'חלוקת מנות כשרות לפסח לחיילים',     '2026-04-02', 'לוגיסטיקה',5),
  ('סיום הכשרות',          'כל המכשירנים הוכשרו',               '2026-03-30', 'הכשרה',    6),
  ('ליל הסדר',             'עריכת הסדר ביחידה',                  '2026-04-02', 'סדר',      7)
on conflict do nothing;
