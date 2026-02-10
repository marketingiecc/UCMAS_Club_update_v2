-- RPC: Get Admin Stats for Centers and Classes
-- Used in AdminInfoManagerPage to solve N+1 / pagination issues.

-- 1. Ensure Admin has access to class_students (Fixes client-side fallback)
ALTER TABLE IF EXISTS public.class_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS class_students_select_admin ON public.class_students;
CREATE POLICY class_students_select_admin ON public.class_students
    FOR SELECT
    USING (public.is_admin());

-- 2. The RPC Function
DROP FUNCTION IF EXISTS public.rpc_get_admin_info_stats();

CREATE OR REPLACE FUNCTION public.rpc_get_admin_info_stats()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _center_stats json;
  _class_stats json;
BEGIN
  -- 1. Center Stats:
  --    - class_count: number of classes linked to center
  --    - student_count: number of unique active students in classes of this center
  -- IMPORTANT: normalize JSON keys to lowercase text (case-insensitive lookups on client)
  SELECT json_object_agg(t.center_key, t.stats)
  INTO _center_stats
  FROM (
    SELECT
      lower(c.id::text) AS center_key,
      json_build_object(
        'classCount', count(DISTINCT cl.id),
        'studentCount', count(DISTINCT cs.student_id)
      ) AS stats
    FROM public.centers c
    LEFT JOIN public.classes cl ON cl.center_id = c.id
    LEFT JOIN public.class_students cs ON cs.class_id = cl.id AND cs.left_at IS NULL
    GROUP BY c.id
  ) t;

  -- 2. Class Stats:
  --    - student_count: number of active students in class
  -- IMPORTANT: normalize JSON keys to lowercase text (case-insensitive lookups on client)
  SELECT json_object_agg(t.class_key, t.count)
  INTO _class_stats
  FROM (
    SELECT
      lower(cl.id::text) AS class_key,
      count(DISTINCT cs.student_id) AS count
    FROM public.classes cl
    LEFT JOIN public.class_students cs ON cs.class_id = cl.id AND cs.left_at IS NULL
    GROUP BY cl.id
  ) t;

  RETURN json_build_object(
    'centerStats', COALESCE(_center_stats, '{}'::json),
    'classStudentCounts', COALESCE(_class_stats, '{}'::json)
  );
END;
$$;
