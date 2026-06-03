alter table public.profiles
add column if not exists must_change_password boolean not null default false;

update public.audit_logs
set after_data = after_data - 'password'
where after_data is not null
  and after_data ? 'password';
