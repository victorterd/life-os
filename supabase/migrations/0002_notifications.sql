-- =====================================================================
-- LifeOS — notificări pentru obiceiuri și tratamente
-- __CRON_SECRET__ se înlocuiește cu valoarea CRON_SECRET (din .env.local / Vercel).
-- Rulează varianta completată: supabase/local/0002_notifications.filled.sql
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Profil pentru utilizatorii creați înainte de trigger
insert into public.profiles (user_id)
select id from auth.users
on conflict do nothing;

-- „due” = la ora programată, „reminder” = după 30 de minute dacă nu e bifat
alter table public.notification_log add column if not exists kind text not null default 'due';
alter table public.notification_log drop constraint if exists notification_log_habit_id_date_slot_key;
create unique index if not exists notification_log_uniq on public.notification_log (habit_id, date, slot, kind);

create or replace function public.send_due_notifications()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r record;
  s record;
  payload jsonb := '[]'::jsonb;
  title text;
  body text;
begin
  for r in
    with cfg as (
      select p.user_id, (now() at time zone p.timezone) as local_now
      from public.profiles p
    ),
    slots as (
      select h.id as habit_id, h.user_id, h.name, h.emoji, h.detail, t.slot,
             c.local_now::date as d,
             date_trunc('minute', c.local_now)::time as now_t
      from public.habits h
      join cfg c on c.user_id = h.user_id
      cross join lateral unnest(h.times) as t(slot)
      where not h.archived
        and h.notify
        and h.kind = 'scheduled'
        and extract(isodow from c.local_now)::int = any (h.days_of_week)
    ),
    due as (
      select *,
        case
          when now_t >= slot and now_t < slot + interval '30 minutes' then 'due'
          when now_t >= slot + interval '30 minutes' and now_t < slot + interval '90 minutes' then 'reminder'
        end as kind
      from slots
    )
    select * from due
    where kind is not null
      and not exists (
        select 1 from public.habit_logs l
        where l.habit_id = due.habit_id and l.date = due.d and l.slot = due.slot
      )
      and not exists (
        select 1 from public.notification_log n
        where n.habit_id = due.habit_id and n.date = due.d and n.slot = due.slot and n.kind = due.kind
      )
  loop
    insert into public.notification_log (user_id, habit_id, date, slot, kind)
    values (r.user_id, r.habit_id, r.d, r.slot, r.kind)
    on conflict do nothing;

    if r.kind = 'due' then
      title := coalesce(r.emoji || ' ', '') || r.name;
      body := to_char(r.slot, 'HH24:MI') || coalesce(' · ' || r.detail, '') || ' · Atinge ca să bifezi.';
    else
      title := 'Ai uitat? ' || coalesce(r.emoji || ' ', '') || r.name;
      body := 'Era programat la ' || to_char(r.slot, 'HH24:MI') || '. Bifează când e gata.';
    end if;

    for s in select endpoint, p256dh, auth from public.push_subscriptions where user_id = r.user_id loop
      payload := payload || jsonb_build_array(jsonb_build_object(
        'subscription', jsonb_build_object('endpoint', s.endpoint, 'keys', jsonb_build_object('p256dh', s.p256dh, 'auth', s.auth)),
        'title', title,
        'body', body,
        'url', '/obiceiuri',
        'tag', r.habit_id::text || '-' || to_char(r.slot, 'HH24MI')
      ));
    end loop;
  end loop;

  if jsonb_array_length(payload) > 0 then
    perform net.http_post(
      url := 'https://life-os-victor.vercel.app/api/push',
      body := jsonb_build_object('notifications', payload),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '__CRON_SECRET__')
    );
  end if;
end;
$$;

revoke all on function public.send_due_notifications() from public, anon, authenticated;

-- Rulează în fiecare minut
select cron.unschedule('lifeos-notify') where exists (select 1 from cron.job where jobname = 'lifeos-notify');
select cron.schedule('lifeos-notify', '* * * * *', 'select public.send_due_notifications()');
