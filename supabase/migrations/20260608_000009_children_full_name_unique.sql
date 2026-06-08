-- Enforce one account per child across the whole app.

alter table public.children
  add constraint children_full_name_unique unique (full_name);
