import { Request, Response, NextFunction } from "express";
import {
  createAddressService,
  deleteAddressService,
  getUserAddressesService,
  setDefaultAddressService,
  updateAddressService,
} from "./service";

export async function getUserAddressesController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const addresses = await getUserAddressesService(userId);
    res.status(200).json({
      message: "Addresses retrieved successfully",
      isSuccess: true,
      data: addresses,
    });
  } catch (error) {
    next(error);
  }
}

export async function createAddressController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const address = await createAddressService(userId, req.body);
    res.status(201).json({
      message: "Address created successfully",
      isSuccess: true,
      data: address,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAddressController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const addressId = req.params.addressId;
    const address = await updateAddressService(userId, addressId, req.body);
    res.status(200).json({
      message: "Address updated successfully",
      isSuccess: true,
      data: address,
    });
  } catch (error) {
    next(error);
  }
}

export async function setDefaultAddressController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const addressId = req.params.addressId;
    const address = await setDefaultAddressService(userId, addressId);
    res.status(200).json({
      message: "Default address updated",
      isSuccess: true,
      data: address,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAddressController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const addressId = req.params.addressId;
    const result = await deleteAddressService(userId, addressId);
    res.status(200).json({
      message: result.message,
      isSuccess: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
}
