import { Router } from "express";
import {
  changePasswordController,
  forgotPasswordController,
  loginController,
  logoutController,
  meController,
  registerController,
  resetPasswordController,
  sendEmailVerificationController,
  updateRoleController,
  verifyEmailController,
} from "./controller";
import { checkAdmin, checkAuth } from "./middleware";
import { authRateLimiter } from "../../utils/security";

function createAuthRouter() {
  const router = Router();
  router.post("/register", authRateLimiter, registerController);
  router.post("/login", authRateLimiter, loginController);
  router.post("/logout", logoutController);

  router.post("/forgot-password", authRateLimiter, forgotPasswordController);
  router.post("/reset-password", authRateLimiter, resetPasswordController);

  router.post(
    "/email-verification/send",
    checkAuth,
    authRateLimiter,
    sendEmailVerificationController
  );
  router.post(
    "/email-verification/verify",
    authRateLimiter,
    verifyEmailController
  );

  router.get("/me", checkAuth, meController);
  router.post("/change-password", checkAuth, changePasswordController);
  router.post("/updateRole", checkAuth, checkAdmin, updateRoleController);

  return router;
}

export const authRouter = createAuthRouter();


