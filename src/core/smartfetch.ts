import fetch from "node-fetch";
import ora from "ora";
import { Connection } from "typeorm";
import { existsFullVacancy, insrtFullVacancy, selectFullVacancy } from "../db";
import { FullVacancy } from "../entity/FullVacancy";
import { hh_headers } from "./requests";

/**
 * функция проверяет, есть ли в базе данных таблица с id, взятым из ссылки url,
 * и если есть, возвращает таблицу оттуда
 * а если нет, то скачивает вакансию по ссылке
 *
 * @async
 * @param {Connection} connection
 * @param {string} url
 */
export const smart_fetch = async (
  connection: Connection,
  url: string
): Promise<FullVacancy> => {
  const id = getIDfromURL(url);
  const isInDB = await existsFullVacancy(connection, id);

  if (isInDB) {
    // ora().info("already in db")
    return selectFullVacancy(connection, id);
  }

  // make new fetch and get json
  const vacancy: FullVacancy = await fetch(url, { headers: hh_headers })
    .then((res) => res.json())
    .catch((err) => {
      ora().fail(err);
    });

  try {
    await insrtFullVacancy(connection, vacancy);
  } catch (error) {
    ora().fail(JSON.stringify(vacancy));
  }

  return vacancy;
};

const getIDfromURL = (url: string) => url.split("/")[4].split("?")[0];
