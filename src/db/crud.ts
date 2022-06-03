import { Connection, getRepository, Not, Raw, Repository } from "typeorm";
import { FullVacancy } from "../entity/FullVacancy.js";
import { Vacancy } from "../entity/Vacancy.js";
import { API } from "../types/api/module.js";

/**
 * подсчитывает итоговое количество вакансий в базе данных
 * @returns количество вакансий в базе данных
 */
export const countVacancies = async (): Promise<number> => {
  const repository = getRepository(Vacancy);

  const count = await repository.count();

  return count;
};

/**
 * вставка в базу данных массива вакансий
 * @param connection соединение с базой данных
 * @param vacancies массив вакансий
 */
export const insertVacancies = async (
  connection: Connection,
  vacancies: API.Vacancy[]
) => {
  await connection
    .createQueryBuilder()
    .insert()
    .into(Vacancy)
    .values(vacancies)
    .orIgnore(true)
    .execute();
};

/**
 * вставка в базу данных массива вакансий
 * @param connection соединение с базой данных
 * @param vacancies массив вакансий
 */
export const insertFullVacancies = async (
  connection: Connection,
  vacancies: any[]
) => {
  await connection
    .createQueryBuilder()
    .insert()
    .into(FullVacancy)
    .values(vacancies)
    .orIgnore(true)
    .execute();
};

/**
 * вставка в базу данных массива вакансий
 * @param connection соединение с базой данных
 * @param vacancies массив вакансий
 */
export const insrtFullVacancy = async (
  connection: Connection,
  vacancy: any
) => {
  await connection.getRepository(FullVacancy).insert(vacancy);
};

export const selectVacancies = async () => {
  const repository = getRepository(Vacancy);

  const vacancies = await repository.find();

  return vacancies;
};

export const selectVacanciesURLs = async () => {
  const repository = getRepository(Vacancy);

  const urls = await repository.find({
    select: ["url"],
    where: [
      // { published_at: Raw((alias) => `${alias} >= :date`, { date: "2022-04-01" }) },
      {
        published_at: Raw((alias) => `${alias} >= :date`, {
          date: "2022-05-01",
        }),
      },
    ],
    take: 5000,
  });

  return urls.map((url_json) => url_json.url);
};

export const existsVacancy = async (
  connection: Connection,
  id: number | string
) => {
  const res: { exists: boolean }[] = await connection.query(
    `select exists(select * from vacancy where vacancy.id = '${id}');`
  );

  return res[0].exists;
};

export const existsFullVacancy = async (
  connection: Connection,
  id: number | string
): Promise<boolean> => {
  const res: { exists: boolean }[] = await connection.query(
    `select exists(select * from full_vacancy where full_vacancy.id = '${id}');`
  );

  return res[0].exists;
};

export const selectFullVacancies = async () => {
  const repository = getRepository(FullVacancy);

  const vacancies = await repository.find();

  return vacancies;
};

export const selectFullVacancy = async (
  connection: Connection,
  id: number | string
) => {
  return await connection.getRepository(FullVacancy).findOne(id);
};

export const selectKeySkills = async (connection: Connection) => {
  const keyskills: { key_skills: { name: string }[] }[] = await connection
    .getRepository(FullVacancy)
    .find({
      select: ["key_skills"],
      where: {
        key_skills: Not("[]"),
      },
    });

  return keyskills
    .flatMap((skill) => skill.key_skills)
    .map((skill) => skill.name);
};

export const countVacanciesWithKeyskills = async (
  connection: Connection
): Promise<number> => {
  const res = await connection.query(
    "select count(full_vacancy.key_skills) from full_vacancy where full_vacancy.key_skills != '[]'"
  );

  return res[0].count;
};
