-- Run this in the Supabase SQL Editor AFTER creating your Supabase project.
-- 1) Create one admin user in Authentication > Users.
-- 2) Replace 06a1dd9b-f2ad-48b6-a2a9-a3e01703d64a below with that user's auth.users.id.
-- 3) Keep public sign-ups disabled. Do not expose a service_role key in frontend code.

create extension if not exists pgcrypto;

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('film','photo')),
  title text not null,
  category text,
  description text,
  video_url text,
  file_path text,
  poster_path text,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.portfolio_items enable row level security;

-- Public visitors can read published portfolio entries.
drop policy if exists "Public can read portfolio" on public.portfolio_items;
create policy "Public can read portfolio" on public.portfolio_items
for select using (true);

-- Admin can add, edit and delete entries. Replace the UUID before running.
drop policy if exists "Admin can manage portfolio" on public.portfolio_items;
create policy "Admin can manage portfolio" on public.portfolio_items
for all to authenticated
using (auth.uid() = '06a1dd9b-f2ad-48b6-a2a9-a3e01703d64a'::uuid)
with check (auth.uid() = '06a1dd9b-f2ad-48b6-a2a9-a3e01703d64a'::uuid);

insert into storage.buckets (id,name,public)
values ('portfolio-media','portfolio-media',true)
on conflict (id) do update set public = true;

-- Public portfolio media is viewable; only the designated admin can mutate it.
drop policy if exists "Public can view portfolio media" on storage.objects;
create policy "Public can view portfolio media" on storage.objects
for select using (bucket_id = 'portfolio-media');

drop policy if exists "Admin can upload portfolio media" on storage.objects;
create policy "Admin can upload portfolio media" on storage.objects
for insert to authenticated
with check (bucket_id = 'portfolio-media' and auth.uid() = '06a1dd9b-f2ad-48b6-a2a9-a3e01703d64a'::uuid);

drop policy if exists "Admin can update portfolio media" on storage.objects;
create policy "Admin can update portfolio media" on storage.objects
for update to authenticated
using (bucket_id = 'portfolio-media' and auth.uid() = '06a1dd9b-f2ad-48b6-a2a9-a3e01703d64a'::uuid)
with check (bucket_id = 'portfolio-media' and auth.uid() = '06a1dd9b-f2ad-48b6-a2a9-a3e01703d64a'::uuid);

drop policy if exists "Admin can delete portfolio media" on storage.objects;
create policy "Admin can delete portfolio media" on storage.objects
for delete to authenticated
using (bucket_id = 'portfolio-media' and auth.uid() = '06a1dd9b-f2ad-48b6-a2a9-a3e01703d64a'::uuid);
