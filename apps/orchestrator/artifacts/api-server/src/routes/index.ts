import { Router, type IRouter } from "express";
import healthRouter from "./health";
import brandRouter from "./brand";
import personasRouter from "./personas";
import eventsRouter from "./events";
import decisionsRouter from "./decisions";
import contentRouter from "./content";
import campaignsRouter from "./campaigns";
import integrationsRouter from "./integrations";
import analyticsRouter from "./analytics";
import rankingsRouter from "./rankings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(brandRouter);
router.use(personasRouter);
router.use(eventsRouter);
router.use(decisionsRouter);
router.use(contentRouter);
router.use(campaignsRouter);
router.use(integrationsRouter);
router.use(analyticsRouter);
router.use(rankingsRouter);

export default router;
