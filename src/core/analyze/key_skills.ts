import { getConnection } from "typeorm";
import { countVacanciesWithKeyskills, selectKeySkills } from "../../db";
import { saveToFile } from "../../utils";

export const analyze_keyskills = async () => {
  const connection = getConnection();

  const count = await countVacanciesWithKeyskills(connection);
  const keyskills = await selectKeySkills(connection);

  return rate_keyskills(keyskills, count);
};

const rate_keyskills = (
  key_skills: string[],
  vacancies_with_keyskills: number
) => {
  const result: any = {};
  key_skills.forEach((skill) => {
    result[skill] = (result[skill] || 0) + 1;
  });

  const result_ents = Object.entries<number>(result);
  saveToFile(result, "data", "result.json");

  console.log("уникальные навыки:", result_ents.length);

  const rated_skills = result_ents
    .map((arr) => {
      return {
        name: arr[0],
        count: arr[1],
        ratio_to_vacancies: parseFloat(
          (arr[1] / vacancies_with_keyskills).toFixed(3)
        ),
        ratio_to_key_skills: parseFloat(
          (arr[1] / key_skills.length).toFixed(3)
        ),
      };
    })
    .filter((skill) => skill.ratio_to_vacancies >= 0.001)
    .sort((skill_1, skill_2) =>
      skill_1.count < skill_2.count ? 1 : skill_2.count < skill_1.count ? -1 : 0
    );

  return {
    vacancies_with_keyskills,
    key_skills: rated_skills,
    key_skills_count: key_skills.length,
  };
};
