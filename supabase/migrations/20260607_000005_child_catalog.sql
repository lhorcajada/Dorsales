create table if not exists public.child_name_catalog (
  id uuid primary key default gen_random_uuid(),
  full_name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.child_name_catalog enable row level security;

create policy child_name_catalog_select_public
  on public.child_name_catalog
  for select
  using (true);

delete from public.child_name_catalog;

insert into public.child_name_catalog (full_name)
values
  ('Esteban Soriano Santiago'),
  ('Marcos Fuentes García'),
  ('Lucas Sacristán Álvarez'),
  ('Marcos Muñoz Rubio'),
  ('Jaime Martín Díaz'),
  ('Alejandro Vargas Salas'),
  ('Joao Vitor Leite Braga Vital'),
  ('Gonzalo Cascales Sanchez'),
  ('Sergio García Valero'),
  ('Erik Fernández Garcinuño'),
  ('Iker Fernández Martín'),
  ('Alejandro Araque Tapias'),
  ('Álvaro Santiago Palomino'),
  ('Hugo Naranjo Hermoso'),
  ('Hugo García Canterla'),
  ('Álvaro Zurita Serrano'),
  ('Izan Cabezas Palomares'),
  ('Nicolás Montoyo Villaverde'),
  ('Pablo Santana Gómez'),
  ('Fernando Huertas Hoyos'),
  ('Álvaro Aparicio Espada'),
  ('Alejandro Castaño Arias')
on conflict (full_name) do nothing;