import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

type JwtExpiresIn = NonNullable<SignOptions["expiresIn"]>;

export const signAccessToken = (payload: object) => {
  const secret: string = env.JWT_ACCESS_SECRET;
  const signOptions: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as JwtExpiresIn,
  };
  return jwt.sign(payload, secret, signOptions);
};

export const signRefreshToken = (payload: object) => {
  const secret: string = env.JWT_REFRESH_SECRET;
  const signOptions: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as JwtExpiresIn,
  };
  return jwt.sign(payload, secret, signOptions);
};

export const verifyAccessToken = (token: string) => {
  const secret: string = env.JWT_ACCESS_SECRET;
  return jwt.verify(token, secret);
};
