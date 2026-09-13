import { Request, Response, NextFunction } from "express";
import {
  ChangePasswordSchema,
  LoginControllerSchema,
  RegisterControllerSchema,
  updateRoleControllerSchema,
} from "./validation";
import {
  changePasswordService,
  createUserService,
  getUserById,
  loginService,
  updateroleservice,
} from "./service";
import { APIError } from "../../utils/error";

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { success, error, data } = RegisterControllerSchema.safeParse(req.body);
    if (!success) {
      const errors = error.flatten().fieldErrors;
      res.status(400).json({
        message: "Validation failed",
        data: null,
        isSuccess: false,
        errors,
      });
      return;
    }

    const user = await createUserService(data);

    res.status(201).json({
      message: "User registered successfully",
      isSuccess: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { success, error, data } = LoginControllerSchema.safeParse(req.body);
    if (!success) {
      const errors = error.flatten().fieldErrors;
      res.status(400).json({
        message: "Invalid login credentials",
        data: null,
        isSuccess: false,
        errors,
      });
      return;
    }

    const loginOutput = await loginService(data);
    const { token, user } = loginOutput;

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    res.status(200).json({
      message: "User logged in successfully",
      isSuccess: true,
      data: {
        user,
        accessToken: token,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    res.status(200).json({
      message: "User logged out successfully",
      isSuccess: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function meController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Not authenticated",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const user = await getUserById(req.user.id);

    res.status(200).json({
      message: "User profile retrieved successfully",
      isSuccess: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: (user as any).created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function changePasswordController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const { success, error, data } = ChangePasswordSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({
        message: "Invalid password input",
        isSuccess: false,
        data: null,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    await changePasswordService(req.user.id, data);

    res.status(200).json({
      message: "Password changed successfully",
      isSuccess: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRoleController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { success, error, data } = updateRoleControllerSchema.safeParse(
      req.body
    );
    if (!success) {
      const errors = error.flatten().fieldErrors;
      res.status(400).json({
        message: "Invalid role update request",
        data: null,
        isSuccess: false,
        errors,
      });
      return;
    }

    const updatedUser = await updateroleservice(data);
    res.status(200).json({
      message: "Role updated successfully",
      data: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      isSuccess: true,
    });
  } catch (error) {
    next(error);
  }
}

