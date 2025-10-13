-- Agar upsert profiles oleh user (via session) bisa jalan aman sesuai RLS
create policy "profiles self insert" on public.profiles
for insert with check (auth.uid() = id);
