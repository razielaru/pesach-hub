-- טבלת נקודות מפה מותאמות
create table if not exists map_pins (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  note text,
  color text default 'blue',
  lat double precision not null,
  lng double precision not null,
  created_by text,
  created_at timestamptz default now()
);
alter table map_pins enable row level security;
drop policy if exists "public all" on map_pins;
create policy "public all" on map_pins for all using (true);
