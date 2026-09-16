import { Router } from "express";
import {
  changePasswordController,
  deleteAccountController,
  forgotPasswordController,
  loginController,
  logoutAllSessionsController,
  logoutController,
  meController,
  registerController,
  requestEmailChangeController,
  resetPasswordController,
  sendEmailVerificationController,
  updateProfileController,
  updateRoleController,
  verifyEmailChangeController,
  verifyEmailController,
} from "./controller";
import { checkAdmin, checkAuth } from "./middleware";
import { authRateLimiter } from "../../utils/security";

function createAuthRouter() {
  const router = Router();
  router.post("/register", authRateLimiter, registerController);
  router.post("/login", authRateLimiter, loginController);
  router.post("/logout", logoutController);
  router.post("/logout-all", checkAuth, logoutAllSessionsController);

  // Profile management
  router.get("/me", checkAuth, meController);
  router.get("/profile", checkAuth, meController);
  router.put("/profile", checkAuth, updateProfileController);
  router.patch("/profile", checkAuth, updateProfileController);
  router.delete("/account", checkAuth, deleteAccountController);

  // Password & Security
  router.post("/change-password", checkAuth, changePasswordController);
  router.post("/forgot-password", authRateLimiter, forgotPasswordController);
  router.post("/reset-password", authRateLimiter, resetPasswordController);

  // Email Verification & Change Flow
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
  router.post(
    "/change-email",
    checkAuth,
    authRateLimiter,
    requestEmailChangeController
  );
  router.post(
    "/verify-new-email",
    checkAuth,
    authRateLimiter,
    verifyEmailChangeController
  );

  // Role administration
  router.post("/updateRole", checkAuth, checkAdmin, updateRoleController);

  return router;
}

export const authRouter = createAuthRouter();



