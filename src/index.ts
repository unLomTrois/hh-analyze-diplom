import { createConnection } from "typeorm";
import getCLI from "./cli.js";

import { oraPromise } from "ora";

oraPromise(async () => {
  await createConnection();
}, "подключение к базе данных")
  .then(() => {
    const cli = getCLI();

    cli.parse(process.argv);
  })
  .catch((error) => {
    console.error(error);
  });
