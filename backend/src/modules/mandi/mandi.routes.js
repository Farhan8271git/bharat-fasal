import { Router } from "express";

import {
  getMandiPricesController,
} from "./mandi.controller.js";

import {
  validateMandiQuery,
} from "./mandi.validator.js";

const router = Router();

router.get(
  "/",
  validateMandiQuery,
  getMandiPricesController
);

export default router;