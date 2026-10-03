-- Statut transitoire « en cours d'envoi » : une relance est réservée avant
-- l'appel au fournisseur, ce qui empêche deux exécutions de l'envoyer en double.
alter type public.reminder_status add value if not exists 'sending' after 'pending_approval';

-- Enregistrement d'une séquence en une seule transaction. Les contraintes
-- d'unicité sont différées pour permettre d'échanger des délais entre étapes.
alter table public.sequence_steps
  drop constraint sequence_steps_sequence_id_position_key,
  drop constraint sequence_steps_sequence_id_offset_days_key;
alter table public.sequence_steps
  add constraint sequence_steps_sequence_id_position_key unique (sequence_id, position) deferrable initially deferred,
  add constraint sequence_steps_sequence_id_offset_days_key unique (sequence_id, offset_days) deferrable initially deferred;

-- security invoker : la RLS de l'appelant s'applique (on ne touche que son org)
create or replace function public.save_sequence(p_sequence_id uuid, p_steps jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_org uuid := public.current_org_id();
  v_step jsonb;
  v_pos int := 0;
  v_keep uuid[] := '{}';
  v_new uuid;
begin
  if not exists (select 1 from public.sequences where id = p_sequence_id and organization_id = v_org) then
    raise exception 'sequence not found' using errcode = '42501';
  end if;

  for v_step in select value from jsonb_array_elements(p_steps) order by (value->>'offsetDays')::int loop
    v_pos := v_pos + 1;
    if (v_step->>'id') is not null and exists (
      select 1 from public.sequence_steps where id = (v_step->>'id')::uuid and sequence_id = p_sequence_id
    ) then
      update public.sequence_steps set
        position = v_pos,
        offset_days = (v_step->>'offsetDays')::int,
        tone = (v_step->>'tone')::public.reminder_tone,
        is_active = coalesce((v_step->>'active')::boolean, true),
        subject_fr = nullif(btrim(v_step->>'subjectFr'), ''),
        body_fr = nullif(btrim(v_step->>'bodyFr'), ''),
        subject_en = nullif(btrim(v_step->>'subjectEn'), ''),
        body_en = nullif(btrim(v_step->>'bodyEn'), '')
      where id = (v_step->>'id')::uuid;
      v_keep := v_keep || (v_step->>'id')::uuid;
    else
      insert into public.sequence_steps (organization_id, sequence_id, position, offset_days, tone, is_active, subject_fr, body_fr, subject_en, body_en)
      values (v_org, p_sequence_id, v_pos, (v_step->>'offsetDays')::int, (v_step->>'tone')::public.reminder_tone,
              coalesce((v_step->>'active')::boolean, true),
              nullif(btrim(v_step->>'subjectFr'), ''), nullif(btrim(v_step->>'bodyFr'), ''),
              nullif(btrim(v_step->>'subjectEn'), ''), nullif(btrim(v_step->>'bodyEn'), ''))
      returning id into v_new;
      v_keep := v_keep || v_new;
    end if;
  end loop;

  delete from public.sequence_steps where sequence_id = p_sequence_id and not (id = any (v_keep));
end $$;
grant execute on function public.save_sequence(uuid, jsonb) to authenticated;
