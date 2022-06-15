import ora from "ora";
import { getConnection } from "typeorm";
import {
  countVacanciesWithKeyskills,
  selectKeySkills,
  selectRatedKeyskills,
} from "../../db";
import { saveToFile } from "../../utils";

export const analyze_keyskills = async () => {
  const data = await rate_keyskills();

  console.log(data);

  return data;
};
//

const rate_keyskills = async () => {
  const connection = getConnection();
  const num_vacancies_with_keyskills = await countVacanciesWithKeyskills(
    connection
  );

  const rated_skills = await selectRatedKeyskills(connection).then((skills) =>
    skills.map((skill) => {
      return {
        ...skill,
        ratio: parseFloat(
          (skill.count / num_vacancies_with_keyskills).toFixed(3)
        ),
      };
    })
  );

  saveToFile(rated_skills, "analyzed_data", "keyskills.json", 2, false)

  return {
    vacancies_with_keyskills: num_vacancies_with_keyskills,
    key_skills: rated_skills,
    key_skills_count: rated_skills.length,
  };
};
