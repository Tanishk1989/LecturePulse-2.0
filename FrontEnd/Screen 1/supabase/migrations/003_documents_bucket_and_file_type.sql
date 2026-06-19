-- Documents storage bucket + align lectures schema with file_type column

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

create policy "documents_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'documents');

create policy "documents_storage_public_insert"
  on storage.objects for insert
  with check (bucket_id = 'documents');

create policy "documents_storage_public_update"
  on storage.objects for update
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');

create policy "documents_storage_public_delete"
  on storage.objects for delete
  using (bucket_id = 'documents');

-- Rename legacy `type` column to `file_type` when upgrading existing databases
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lectures'
      and column_name = 'type'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'lectures'
      and column_name = 'file_type'
  ) then
    alter table public.lectures rename column type to file_type;
  end if;
end $$;

-- Allow nullable duration (PDFs and unknown media lengths)
alter table public.lectures alter column duration drop not null;
alter table public.lectures alter column duration drop default;
