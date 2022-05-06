import { createConnection } from "typeorm";
import getCLI from "./cli.js";

await createConnection().then(() => {
  console.log("Connection established!")

  const cli = getCLI();

  cli.parse(process.argv);
}).catch(error => {
  console.error(error)
})
