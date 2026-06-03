import { Request, Response } from "express";
import reservationService from "./reservation.service";

const reservationController = {
  create: async (req: Request, res: Response) => {
    const restaurantId = (req as any).restaurantId;
    const result = await reservationService.create(req.body, restaurantId);

    if (!result.success) {
      return res.status(result.code || 400).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(201).json({
      status: "success",
      data: result.data,
    });
  },

  list: async (req: Request, res: Response) => {
    const filters = (req as any).validatedQuery;
    const restaurantId = (req as any).restaurantId;

    const result = await reservationService.list(filters, restaurantId);

    if (!result.success) {
      return res.status(result.code || 400).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(200).json({
      status: "success",
      data: result.data,
    });
  },

  getById: async (req: Request, res: Response) => {
    const restaurantId = (req as any).restaurantId;

    const result = await reservationService.getById(req.params.id, restaurantId);

    if (!result.success) {
      return res.status(result.code || 404).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(200).json({
      status: "success",
      data: result.data,
    });
  },

  update: async (req: Request, res: Response) => {
    const restaurantId = (req as any).restaurantId;

    const result = await reservationService.update(req.params.id, req.body, restaurantId);

    if (!result.success) {
      return res.status(result.code || 400).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(200).json({
      status: "success",
      data: result.data,
    });
  },

  updateStatus: async (req: Request, res: Response) => {
    const restaurantId = (req as any).restaurantId;

    const result = await reservationService.updateStatus(req.params.id, req.body, restaurantId);

    if (!result.success) {
      return res.status(result.code || 400).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(200).json({
      status: "success",
      data: result.data,
    });
  },

  delete: async (req: Request, res: Response) => {
    const restaurantId = (req as any).restaurantId;

    const result = await reservationService.delete(req.params.id, restaurantId);

    if (!result.success) {
      return res.status(result.code || 400).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(204).send();
  },

  checkAvailability: async (req: Request, res: Response) => {
    const restaurantId = (req as any).restaurantId;
    const { tableId, scheduledAt } = (req as any).validatedQuery;

    const result = await reservationService.checkAvailability(tableId, scheduledAt, restaurantId);

    if (!result.success) {
      return res.status(result.code || 400).json({
        status: "error",
        message: result.error,
      });
    }

    return res.status(200).json({
      status: "success",
      data: result.data,
    });
  },
};

export default reservationController;
