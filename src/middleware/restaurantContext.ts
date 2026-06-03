import { Request, Response, NextFunction } from "express";

export const requireRestaurantContext = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const user = req.user;
  const restaurantId =
    user && user.kind === "employee" ? user.restaurantId : undefined;

  if (!restaurantId) {
    res.status(400).json({
      status: "error",
      message: "Restaurant context required",
    });
    return;
  }

  (req as any).restaurantId = restaurantId;
  next();
};
