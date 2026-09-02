import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { seedMentions } from "./services/seed.js";
import { startScheduler } from "./services/scheduler.js";
import { runCommunitySeedIfNeeded } from "./migrations/run-community-seed.js";

const app: Express = express();

seedMentions().catch((err) => logger.warn({ err }, "Seed failed"));
runCommunitySeedIfNeeded().catch((err) => logger.warn({ err }, "Community seed failed"));
startScheduler();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
