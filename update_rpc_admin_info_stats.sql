-- RPC: Get Admin Stats for Centers and Classes
-- Used in AdminInfoManagerPage to solve N+1 / pagination issues.

create or replace function public.rpc_get_admin_info_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _center_stats json;
  _class_stats json;
begin
  -- 1. Center Stats:
  --    - class_count: number of classes linked to center
  --    - student_count: number of unique active students in classes of this center
  select json_object_agg(t.center_id, t.stats)
  into _center_stats
  from (
    select
      c.id as center_id,
      json_build_object(
        'classCount', count(distinct cl.id),
        'studentCount', count(distinct cs.student_id)
      ) as stats
    from public.centers c
    left join public.classes cl on cl.center_id = c.id
    left join public.class_students cs on cs.class_id = cl.id and cs.left_at is null
    group by c.id
  ) t;

  -- 2. Class Stats:
  --    - student_count: number of active students in class
  select json_object_agg(t.class_id, t.count)
  into _class_stats
  from (
    select
      cl.id as class_id,
      count(cs.student_id) as count
    from public.classes cl
    left join public.class_students cs on cs.class_id = cl.id and cs.left_at is null
    group by cl.id
  ) t;

  return json_build_object(
    'centerStats', coalesce(_center_stats, '{}'::json),
    'classStudentCounts', coalesce(_class_stats, '{}'::json)
  );
end;
$$;
