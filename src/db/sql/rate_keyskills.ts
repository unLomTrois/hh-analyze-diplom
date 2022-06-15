export const rate_keyskills = `
select
  jsonb_array_elements(data) -> 'name' as name,
  count(*)
from
  (
    select
      full_vacancy.key_skills as data
    from
      full_vacancy
    where
      full_vacancy.key_skills != '[]'
  ) as dummy
group by
  1
having count(*) > 100
order by count desc
`;
