import { API } from "../../types/api/module";
import { saveToFile } from "../../utils";
import { analyze_keyskills } from "./key_skills";

export const analyzeVacancies = async (
  prepared_vacancies: API.PreparedVacancy[],
  found: number
) => {
  console.log("prepared:", prepared_vacancies.length);

  const vac20k = prepared_vacancies
    .filter((vac) => vac?.salary != undefined)
    .filter((vac) => vac.salary?.from != undefined)
    .map((vac) => (vac.salary?.from != undefined ? vac.salary?.from : 0))
    .sort((a, b) => a - b);

  saveToFile(vac20k, "data", "salaries.json");

  const has_test: number = prepared_vacancies.reduce(
    (acc, vac) => (acc += vac.has_test ? 1 : 0),
    0
  );

  const test_required: number = prepared_vacancies.reduce(
    (acc, vac) => (acc += vac.test?.required ? 1 : 0),
    0
  );

  const response_letter_required: number = prepared_vacancies.reduce(
    (acc, vac) => (acc += vac.response_letter_required ? 1 : 0),
    0
  );

  const accept_temporary: number = prepared_vacancies.reduce(
    (acc, vac) => (acc += vac.accept_temporary ? 1 : 0),
    0
  );

  const rated_skills = await analyze_keyskills();

  return {
    has_test: {
      value: has_test,
      ratio: has_test / found,
    },
    test_required: {
      value: test_required,
      ratio: test_required / found,
      has_test_ratio: test_required / has_test,
    },
    accept_temporary: {
      value: accept_temporary,
      ratio: accept_temporary / found,
    },
    response_letter_required: {
      value: response_letter_required,
      ratio: response_letter_required / found,
    },
    key_skills: {
      key_skills_count: rated_skills.key_skills_count,
      vacancies_with_keyskills: {
        value: rated_skills.vacancies_with_keyskills,
        ratio: rated_skills.vacancies_with_keyskills / found,
      },
      top_ten: rated_skills.key_skills.slice(0, 10),
      full_list: rated_skills.key_skills,
    },
  };
};
