import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mentionsRouter from "./mentions/index.js";
import compIntelRouter from "./comp-intel/index.js";
import communityRouter from "./community/index.js";
import pagesRouter from "./pages/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mentionsRouter);
router.use(compIntelRouter);
router.use(communityRouter);
router.use(pagesRouter);

export default router;
