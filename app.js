import express from "express";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import bcrypt from "bcryptjs";
import path from "path";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { PrismaClient } from "@prisma/client";
import { driveRouter } from "./routes/driveRouter.js";
import {
  loginRouter,
  logoutRouter,
  signupRouter,
} from "./routes/authRouter.js";

const app = express();

app.set("views", "views");
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

const __dirname = path.resolve();
const assetsPath = path.join(__dirname, "public");

app.use(express.static(assetsPath));
app.use(express.json());

app.use(
  session({
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
    secret: "full moon",
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(new PrismaClient(), {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);

app.use(passport.session());

const LocalStrategy = Strategy;
const prisma = new PrismaClient();

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (username, password, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: {
            email: username,
          },
        });
        if (!user) {
          return done(null, false, { message: "Incorrect email address" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

app.use(driveRouter, loginRouter, signupRouter, logoutRouter);

app.listen(3000);
