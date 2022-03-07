import chalk from "chalk";
import fetch from "node-fetch";
import { URL } from "url";
import { API } from "../types/api/module";

const silent_mode = false;

/**
 * делает запрос и получает индекс территории
 * @param text - название территории, например: "Россия", "Москва"
 * @param language - локализация запроса, дефолт: "RU"
 */
export const getArea = async (text: string, language = "RU"): Promise<number> => {
  // проверка что text является числом
  if (!isNaN(Number(text))) {
    const id = Number(text);
    // валидация
    if (!(await isValidID(id))) {
      throw new Error("указан невалидный код территории");
    }

    return id;
  }

  const url = `https://api.hh.ru/suggests/areas?text=${text}&locale=${language}`;

  const data: API.SuggestAreasResponse = await fetch(new URL(url)).then((res) =>
    res.json()
  );

  const area = data.items[0];

  if (!silent_mode) {
    console.log(
      chalk.yellow("территория поиска вакансий:"),
      chalk.green(area.text)
    );
  }

  return Number(area.id);
};

const isValidID = async (id: number): Promise<boolean> => {
  const url = `https://api.hh.ru/areas/${id}`;

  const data: any = await fetch(new URL(url)).then((res) => res.json());

  if (!silent_mode) {
    console.log(
      chalk.yellow("территория поиска вакансий:"),
      chalk.green(data.name)
    );
  }

  // проверка на отсутствие поля "errors"
  return data.errors === undefined;
};
