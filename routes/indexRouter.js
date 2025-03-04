import { Router } from "express";
import { homepageGet, redirectLogin } from "../controllers/authControllers.js";

const indexRouter = Router();

indexRouter.get("/", redirectLogin, homepageGet);

export { indexRouter };
