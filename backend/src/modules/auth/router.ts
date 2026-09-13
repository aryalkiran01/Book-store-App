import { Router } from "express";
import {
  changePasswordController,
  loginController,
  logoutController,
  meController,
  registerController,
  updateRoleController,
} from "./controller";
import { checkAdmin, checkAuth } from "./middleware";
import { authRateLimiter } from "../../utils/security";

function createAuthRouter() {
  const router = Router();
  router.post("/register", authRateLimiter, registerController);
  router.post("/login", authRateLimiter, loginController);
  router.post("/logout", logoutController);

  router.get("/me", checkAuth, meController);
  router.post("/change-password", checkAuth, changePasswordController);
  router.post("/updateRole", checkAuth, checkAdmin, updateRoleController);

  return router;
}

export const authRouter = createAuthRouter();


