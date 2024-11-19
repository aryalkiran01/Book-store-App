/**
 * This file contains all routes related to authentication
 */

import { Router } from "express";
import {
  loginController,
  logoutController,
  meController,
  registerController,
  updateRoleController,
} from "./controller";
import { checkAuth } from "./middleware";

function createAuthRouter() {
  const router = Router();
  router.post("/register", registerController);
  router.post("/login", loginController);
  router.post("/logout", logoutController);

  router.get("/me", checkAuth, meController);
  router.post("/updateRole",updateRoleController)

  return router;
}

export const authRouter = createAuthRouter();
