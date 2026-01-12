import { Request, Response } from "express";
import * as authService from "./auth.service";
import { catchAsync } from "../../utils/catchAsync";

export const register = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.register(req.body.email, req.body.password);

  res.status(201).json({
    success: true,
    data: result,
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.login(req.body.email, req.body.password);

  res.status(200).json({
    success: true,
    data: result,
  });
});
