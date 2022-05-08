import { Connection, getRepository } from "typeorm";
import { Vacancy } from "../entity/Vacancy.js";
import { API } from "../types/api/module.js";

export const countVacancies = async (): Promise<number> => {
  const repository = getRepository(Vacancy);

  const count = await repository.count()

  return count
}

export const insertVacancies = async (connection: Connection, vacancies: API.Vacancy[]) => {
  await connection
    .createQueryBuilder()
    .insert()
    .into(Vacancy)
    .values(vacancies)
    .orIgnore(true)
    .execute();
}
