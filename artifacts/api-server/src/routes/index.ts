import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recommendationsRouter from "./recommendations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recommendationsRouter);

export default router;
