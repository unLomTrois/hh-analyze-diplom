import { Connection, getRepository } from "typeorm";
import { Vacancy } from "../entity/Vacancy.js";
import { API } from "../types/api/module.js";

/**
 * подсчитывает итоговое количество вакансий в базе данных
 * @returns количество вакансий в базе данных
 */
export const countVacancies = async (): Promise<number> => {
  const repository = getRepository(Vacancy);

  const count = await repository.count()

  return count
}

/**
 * вставка в базу данных массива вакансий
 * @param connection соединение с базой данных
 * @param vacancies массив вакансий
 */
export const insertVacancies = async (connection: Connection, vacancies: API.Vacancy[]) => {
  await connection
    .createQueryBuilder()
    .insert()
    .into(Vacancy)
    .values(vacancies)
    .orIgnore(true)
    .execute();
}
