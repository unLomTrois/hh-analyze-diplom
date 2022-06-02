import { Connection, getRepository, Raw, Repository } from "typeorm";
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
        published_at: Raw((alias) => `${alias} <= :date`, {
          date: "2022-05-01",
        }),
      },
    ],
  });

  return urls.map((url_json) => url_json.url);
};

export const existsVacancy = async (connection: Connection, id: number | string) => {
  const res: {exists: boolean}[] = await connection.query(
    `select exists(select * from vacancy where vacancy.id = '${id}');`
  );

  return res[0].exists
};
