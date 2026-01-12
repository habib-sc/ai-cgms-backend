import { ApiError } from "../../utils/ApiError";
import { signToken } from "../../utils/jwt";
import { User } from "../user/user.model";

export const register = async (email: string, password: string) => {
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, "User already exists");

  const user = await User.create({ email, password });

  const token = signToken({ id: user._id });

  return { user, token };
};

export const login = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password)))
    throw new ApiError(401, "Invalid credentials");

  const token = signToken({ id: user._id });

  return { user, token };
};
