import { getMandiPrices } from "./mandi.service.js";

export const getMandiPricesController = async (req, res, next) => {
  try {
    const { limit } = req.validatedQuery;

    const result = await getMandiPrices(limit);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

