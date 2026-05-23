import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recommendationsRouter from "./recommendations";
import emailRouter from "./email";
import scanShelfRouter from "./scan-shelf";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recommendationsRouter);
router.use(emailRouter);
router.use(scanShelfRouter);

export default router;
