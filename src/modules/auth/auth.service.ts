import { ApiError } from "../../utils/ApiError";
import { signAccessToken, signRefreshToken } from "../../utils/jwt";
import { IUser, User } from "../user/user.model";
import bcrypt from "bcryptjs";

// register service
export const register = async (userInfo: IUser) => {
  if (!userInfo.name || !userInfo.email || !userInfo.password)
    throw new ApiError(400, "Please provide name, email, and password");

  const exists = await User.findOne({ email: userInfo.email });
  if (exists) throw new ApiError(409, "User already exists");

  // encrypt password
  const password = await bcrypt.hash(userInfo.password, 10);

  const user = await User.create({
    name: userInfo.name,
    email: userInfo.email,
    password,
  });

  const accessToken = signAccessToken({
    id: user._id,
    role: user.role,
    email: user.email,
  });
  const refreshToken = signRefreshToken({
    id: user._id,
    role: user.role,
    email: user.email,
  });

  return { user, accessToken, refreshToken };
};

// login service
export const login = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, "User not found");

  // compare password with bcrypt
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");

  const { password: _, ...userInfo } = user.toObject();

  const accessToken = signAccessToken({
    id: user._id,
    role: user.role,
    email: user.email,
  });

  const refreshToken = signRefreshToken({
    id: user._id,
    role: user.role,
    email: user.email,
  });

  return { user: userInfo, accessToken, refreshToken };
};

// profile(me)
export const profile = async (userId: string): Promise<Partial<IUser>> => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const { password, ...userInfo } = user.toObject();

  return userInfo;
};
