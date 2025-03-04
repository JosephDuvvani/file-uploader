import passport from "passport";
import { body, validationResult } from "express-validator";
import { addUser, getUserByEmail } from "../db/queries.js";

//---------- Login ----------

const loginGet = (req, res) => {
  if (req.user) {
    res.redirect("/");
    return;
  }
  res.render("login");
};

const loginAuth = (req, res) => {
  passport.authenticate("local", (err, user, options) => {
    if (user) {
      req.login(user, (error) => {
        if (error) {
          res.send(error);
        } else {
          res.redirect("/");
        }
      });
    } else {
      res.render("login", {
        error: options.message || "Invalid login details",
      });
      res.end();
    }
  })(req, res);
};

const redirectLogin = (req, res, next) => {
  if (!req.user) {
    res.redirect("/log-in");
    return;
  }
  next();
};

const logoutGet = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
};

// ---------- Sign Up ----------

const signupGet = (req, res) => {
  if (req.user) {
    res.redirect("/");
    return;
  }
  res.render("signup");
};

const validateUser = [
  body("firstname")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Firstname must be between 1 and 50 characters")
    .isAlpha()
    .withMessage("Firstname must only contain letters"),
  body("lastname")
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ min: 1, max: 50 })
    .withMessage("Lastname must be between 1 and 50 characters")
    .isAlpha()
    .withMessage("Lastname must only contain letters"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email address")
    .custom(async (value) => {
      const user = await getUserByEmail(value);
      if (user) {
        throw new Error("An account with this email already exists");
      } else {
        return true;
      }
    }),
  body("password")
    .isLength({ min: 8, max: 50 })
    .withMessage("Password must be atleast 8 characters"),
  body("confirmPassword").custom((value, { req }) => {
    const match = value === req.body.password;
    if (!match) {
      throw new Error("Passwords do not match");
    } else {
      return true;
    }
  }),
];

const signupPost = [
  validateUser,
  async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      const values = req.body;
      return res.render("signup", { error: result.errors[0], values });
    }
    await addUser(req.body);
    passport.authenticate("local")(req, res, () => res.redirect("/"));
  },
];

const homepageGet = (req, res) => {
  res.render("index");
};

export {
  loginGet,
  redirectLogin,
  signupGet,
  signupPost,
  homepageGet,
  loginAuth,
  logoutGet,
};
