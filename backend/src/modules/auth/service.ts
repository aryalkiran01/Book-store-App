import {
  TChangePasswordInput,
  TLoginControllerInput,
  TRegisterControllerInput,
  TUpdateRolecontrollerInput,
} from "./validation";
import { comparePassword, generateToken, hashPassword } from "../../utils/auth";
import { APIError } from "../../utils/error";
import { UserModel } from "./model";
import { validateObjectId } from "../../utils/security";

export async function createUserService(input: TRegisterControllerInput) {
  const { email, username, password } = input;

  const existingEmail = await UserModel.findOne({ email });
  if (existingEmail) {
    throw APIError.conflict("An account with this email already exists");
  }

  const existingUsername = await UserModel.findOne({ username });
  if (existingUsername) {
    throw APIError.conflict("An account with this username already exists");
  }

  const hashedPassword = await hashPassword(password);

  const newUser = new UserModel({
    email,
    username,
    password: hashedPassword,
    role: "user", // Default always user - never allow privilege escalation on signup
  });

  await newUser.save();

  return newUser;
}

export async function loginService(input: TLoginControllerInput) {
  const { email, password } = input;
  const user = await UserModel.findOne({ email });
  if (!user) {
    throw APIError.unauthorized("Invalid email or password");
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw APIError.unauthorized("Invalid email or password");
  }

  const token = generateToken({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role as "admin" | "user",
  });

  return {
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    },
    token,
  };
}

export async function getUserById(id: string) {
  validateObjectId(id, "User ID");
  const user = await UserModel.findById(id).select("-password");
  if (!user) {
    throw APIError.notFound("User not found");
  }

  return user;
}

export async function changePasswordService(
  userId: string,
  input: TChangePasswordInput
) {
  validateObjectId(userId, "User ID");
  const user = await UserModel.findById(userId);
  if (!user) {
    throw APIError.notFound("User not found");
  }

  const isMatch = await comparePassword(input.oldPassword, user.password);
  if (!isMatch) {
    throw APIError.badRequest("Current password is incorrect");
  }

  const hashedNew = await hashPassword(input.newPassword);
  user.password = hashedNew;
  await user.save();

  return true;
}

export async function logoutService() {
  return true;
}

export async function updateroleservice(input: TUpdateRolecontrollerInput) {
  validateObjectId(input.userId, "Target User ID");
  const user = await UserModel.findById(input.userId);
  if (!user) {
    throw APIError.notFound("Target user not found");
  }
  user.role = input.userRole;
  await user.save();
  return user;
}

