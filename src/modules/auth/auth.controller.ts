import { Request, Response } from "express";
import * as authService from "./auth.service";
import { catchAsync } from "../../utils/catchAsync";

// Register Controller
export const registerController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  }
);

// Login Controller
export const loginController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await authService.login(req.body);

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: result,
    });
  }
);
