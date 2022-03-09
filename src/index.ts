import { createConnection } from "typeorm";
import getCLI from "./cli.js";

await createConnection()

const cli = getCLI();

cli.parse(process.argv);
