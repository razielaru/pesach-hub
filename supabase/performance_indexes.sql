create index if not exists idx_personnel_unit_id on public.personnel (unit_id);
create index if not exists idx_equipment_unit_id on public.equipment (unit_id);
create index if not exists idx_cleaning_areas_unit_id on public.cleaning_areas (unit_id);
create index if not exists idx_tasks_unit_id_status_created_at on public.tasks (unit_id, status, created_at desc);
create index if not exists idx_incidents_unit_id_status_created_at on public.incidents (unit_id, status, created_at desc);
create index if not exists idx_unit_posts_unit_id_status on public.unit_posts (unit_id, status);
create index if not exists idx_chat_messages_channel_created_at on public.chat_messages (channel_name, created_at desc);
