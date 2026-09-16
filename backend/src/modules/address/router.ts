import { Router } from "express";
import {
  createAddressController,
  deleteAddressController,
  getUserAddressesController,
  setDefaultAddressController,
  updateAddressController,
} from "./controller";
import { checkAuth } from "../auth/middleware";

function createAddressRouter() {
  const router = Router();

  router.use(checkAuth);

  router.get("/", getUserAddressesController);
  router.post("/", createAddressController);
  router.put("/:addressId", updateAddressController);
  router.patch("/:addressId", updateAddressController);
  router.patch("/:addressId/default", setDefaultAddressController);
  router.delete("/:addressId", deleteAddressController);

  return router;
}

export const addressRouter = createAddressRouter();
