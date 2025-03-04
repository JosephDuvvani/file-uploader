import { Router } from "express";
import {
  loginAuth,
  loginGet,
  logoutGet,
  signupGet,
  signupPost,
} from "../controllers/authControllers.js";

const loginRouter = Router();
const signupRouter = Router();
const logoutRouter = Router();

loginRouter.get("/log-in", loginGet);
loginRouter.post("/log-in", loginAuth);

logoutRouter.get("/log-out", logoutGet);

signupRouter.get("/sign-up", signupGet);
signupRouter.post("/sign-up", signupPost);

export { loginRouter, signupRouter, logoutRouter };
