
import { UserModel } from "./model";
import { TLoginControllerInput, TRegisterControllerInput, TUpdateRolecontrollerInput } from "./validation";
import { comparePassword, generateToken, hashPassword } from "src/utils/auth";
import { TUpdateBookControllerInput } from "../book/validation";
import { APIError } from "src/utils/error";

export async function createUserService(input: TRegisterControllerInput) {
  const { email, username, password } = input;

  const user = await UserModel.findOne({ email });
  if (user) {
    throw APIError.conflict("User already exists");
  }

  const hashedPassword = await hashPassword(password);

  const newUser = new UserModel({
    email,
    username,
    password: hashedPassword,
    role: "user",
  });

  await newUser.save();

  return newUser;
}

export async function loginService(input: TLoginControllerInput) {
  const { email, password } = input;
  const user = await UserModel.findOne({ email });
  if (!user) {
    throw APIError.unauthorized("Invalid credentials");
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw APIError.unauthorized("Invalid credentials");
  }

  const token = generateToken({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
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
  const user = await UserModel.findById(id);
  if (!user) {
    throw APIError.notFound("User not found");
  }

  return user;
}

export async function logoutService() {
  return true
}


export async function updateroleservice(
  input:TUpdateRolecontrollerInput)
{

  const role=await UserModel.findById(input.userId);
  if(!role){
    throw APIError.notFound("Role not found");
  }
  role.role =input.userRole;
await role.save();
return role;
}