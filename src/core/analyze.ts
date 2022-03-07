import { resolve } from "node:path";
import { API } from "../types/api/module";
import { saveToFile } from "../utils";

export const analyze = (
  vacancies: API.PreparedVacancy[],
  clusters: API.FormattedClusters
) => {

  // всего вакансий
  const found: number = clusters?.found ?? vacancies.length;

  // обработка вакансий
  const analyzed_vacancies = analyzeVacancies(vacancies, found);
  saveToFile(analyzed_vacancies, "data", "analyzed_vacancies.json");

  // обработка кластеров
  const analyzed_clusters = analyzeClusters(clusters, found)
  saveToFile(analyzed_clusters, "data", "analyzed_clusters.json");

  const analyzed_data = {
    vacancy_count: found,
    analyzed_clusters,
    analyzed_vacancies
  };

  saveToFile(analyzed_data, "data", "analyzed_data.json");
  console.log("Результаты анализа доступны в файле:", resolve(process.cwd(), "data", "analyzed_data.json"))

  return analyzed_data;
};

const analyzeClusters = (clusters: API.FormattedClusters, found: number) => {
  return {
    salary_info: analyzeSalaryCluster(clusters.salary, found),
    experience_info: analyzeExperienceCluster(clusters.experience, found),
    employment_info: analyzeSimpleCluster(clusters.employment, found),
    schedule_info: analyzeSimpleCluster(clusters.schedule, found),
    industry_info: analyzeSimpleCluster(
      clusters?.industry ?? clusters.sub_industry,
      found
    ),
  }
}

const analyzeSimpleCluster = (simple_cluster: API.Cluster, found: number) => {
  const groups: any[] = simple_cluster.items.map((item) => {
    return {
      name: item.name,
      count: item.count,
      ratio: parseFloat((item.count / found).toFixed(2)),
    };
  });

  return groups;
};

const analyzeSalaryCluster = (salary_cluster: API.Cluster, found: number) => {
  // количество вакансий с указанной зп
  const specified: number =
    salary_cluster.items.find((item) => item.name === "Указан")?.count ?? 0;

  const borders: any[] = [];

  salary_cluster.items.forEach((item, idx) => {
    if (item.name !== "Указан") {
      const next_item = salary_cluster.items[idx + 1];

      const interval_count =
        next_item !== undefined ? item.count - next_item.count : item.count;

      borders.push({
        from: parseFloat(item.name.split(" ")[1]), //полчаем число из фразы "от *число* руб."
        count: item.count,
        interval_count,
        ratio: parseFloat((item.count / found).toFixed(2)),
        ratio_to_specified: parseFloat((item.count / specified).toFixed(2)),
        ratio_of_interval_count_to_specified: parseFloat(
          (interval_count / specified).toFixed(2)
        ),
      });
    }
  });

  (() => {
    const next_item = borders[0];

    const count = specified - next_item.count;

    const interval_count = count;

    borders.unshift({
      from: 20000, //полчаем число из фразы "от *число* руб."
      count: count,
      interval_count,
      ratio: parseFloat((count / found).toFixed(2)),
      ratio_to_specified: parseFloat((count / specified).toFixed(2)),
      ratio_of_interval_count_to_specified: parseFloat(
        (interval_count / specified).toFixed(2)
      ),
    });
  })();

  const mean_salary = borders.reduce((acc, d) => {
    // console.log(acc, d.from, d.count);

    return (acc += d.from * d.count);
  }, 0);

  console.log(mean_salary);

  // результат
  return {
    specified: specified,
    mean_salary: mean_salary / found,
    mean_salary_to_specified: mean_salary / specified,
    specified_ratio: specified / found, // отношение всех вакансий к количеству с указнной зп
    borders,
  };
};

const analyzeExperienceCluster = (
  experience_cluster: API.Cluster,
  found: number
) => {
  const groups: any[] = [
    {
      from: 0,
      to: 1,
      count:
        experience_cluster.items.find((item) => item.name === "Нет опыта")
          ?.count ?? 0,
    },
    {
      from: 1,
      to: 3,
      count:
        experience_cluster.items.find(
          (item) => item.name === "От 1 года до 3 лет"
        )?.count ?? 0,
    },
    {
      from: 3,
      to: 6,
      count:
        experience_cluster.items.find((item) => item.name === "От 3 до 6 лет")
          ?.count ?? 0,
    },
    {
      from: 6,
      to: null,
      count:
        experience_cluster.items.find((item) => item.name === "Более 6 лет")
          ?.count ?? 0,
    },
  ];

  groups.forEach((exp) => {
    exp.ratio = parseFloat((exp.count / found).toFixed(2));
  });

  return groups;
};

const rateKeySkills = (prepared_vacancies: API.PreparedVacancy[]) => {
  const vacancies_with_keyskills = prepared_vacancies.filter(
    (vac) => vac.key_skills != undefined
  );

  console.log("vacancies_with_keyskills:", vacancies_with_keyskills.length);

  const key_skills = vacancies_with_keyskills.flatMap((vac) =>
    vac.key_skills?.map((key_list) => key_list.name)
  );

  const result: any = {};
  key_skills.forEach((skill) => {
    result[skill] = (result[skill] || 0) + 1;
  });

  const result_ents = Object.entries<number>(result);

  console.log("уникальные навыки:", result_ents.length)

  const rated_skills = result_ents
    .map((arr) => {
      return {
        name: arr[0],
        count: arr[1],
        ratio_to_vacancies: parseFloat((arr[1] / vacancies_with_keyskills.length).toFixed(3)),
        ratio_to_key_skills: parseFloat((arr[1] / key_skills.length).toFixed(3)),
      };
    })
    .filter((skill) => skill.ratio_to_vacancies >= 0.01)
    .sort((skill_1, skill_2) =>
      skill_1.count < skill_2.count ? 1 : skill_2.count < skill_1.count ? -1 : 0
    );

  return {
    vacancies_with_keyskills,
    key_skills: rated_skills,
    key_skills_count: key_skills.length
  };
};

const analyzeVacancies = (prepared_vacancies: API.PreparedVacancy[], found: number) => {
  console.log("prepared:", prepared_vacancies.length);

  const vac20k = prepared_vacancies.
    filter(vac => vac?.salary != undefined).
    filter(vac => vac.salary?.from != undefined)
    .map(vac => vac.salary?.from != undefined ? vac.salary?.from : 0)
    .sort((a, b) => (a - b))

  saveToFile(vac20k, "data", "salaries.json")

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

  const accept_incomplete_resume: number = prepared_vacancies.reduce(
    (acc, vac) => (acc += vac.accept_incomplete_resumes ? 1 : 0),
    0
  );

  const accept_temporary: number = prepared_vacancies.reduce(
    (acc, vac) => (acc += vac.accept_temporary ? 1 : 0),
    0
  );

  const rated_skills = rateKeySkills(prepared_vacancies);

  return {
    has_test: {
      value: has_test,
      ratio: has_test / found,
    },
    test_required: {
      value: test_required,
      ratio: test_required / found,
      has_test_ratio:
        test_required / has_test,
    },
    accept_incomplete_resume: {
      value: accept_incomplete_resume,
      ratio: accept_incomplete_resume / found,
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
        value:
          rated_skills.vacancies_with_keyskills.length,
        ratio:
          rated_skills.vacancies_with_keyskills.length /
          found,
      },
      top_ten: rated_skills.key_skills.slice(0, 10),
      full_list: rated_skills.key_skills,
    },
  }
};
