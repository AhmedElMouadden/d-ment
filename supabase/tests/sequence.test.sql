-- save_sequence : échange de délais, ajout, retrait, isolation entre organisations.
\set ON_ERROR_STOP on
begin;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@x.ca'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@x.ca');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';

do $$ declare seq uuid; s1 uuid; s7 uuid; begin
  select id into seq from public.sequences where is_default;
  select id into s1 from public.sequence_steps where offset_days = 1;
  select id into s7 from public.sequence_steps where offset_days = 7;
  -- échange J+1 ↔ J+7, ajoute J+60 avec texte perso, retire toutes les autres
  perform public.save_sequence(seq, jsonb_build_array(
    jsonb_build_object('id', s1, 'offsetDays', 7, 'tone', 'firm', 'active', true, 'subjectFr', '  ', 'bodyFr', 'Coucou'),
    jsonb_build_object('id', s7, 'offsetDays', 1, 'tone', 'courteous', 'active', false),
    jsonb_build_object('id', null, 'offsetDays', 60, 'tone', 'final', 'active', true)
  ));
  assert (select count(*) from public.sequence_steps) = 3, 'nombre d''étapes';
  assert (select offset_days from public.sequence_steps where id = s1) = 7, 'échange';
  assert (select subject_fr is null and body_fr = 'Coucou' from public.sequence_steps where id = s1), 'textes';
  assert (select array_agg(offset_days order by position) from public.sequence_steps) = array[1,7,60], 'positions';
  assert (select not is_active from public.sequence_steps where id = s7), 'désactivée';
end $$;

-- une autre org ne peut pas modifier cette séquence
do $$ declare seq uuid; begin
  select id into seq from public.sequences where is_default;
  perform set_config('test.seq_a', seq::text, true);
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  perform public.save_sequence(current_setting('test.seq_a')::uuid, '[]'::jsonb);
  raise exception 'ÉCHEC : B a modifié la séquence de A';
exception when insufficient_privilege then null;
end $$;
\echo 'Séquences : tous les tests passent ✅'
rollback;
