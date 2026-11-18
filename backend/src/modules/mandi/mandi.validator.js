const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 1000;

export const validateMandiQuery = (req, res, next) => {
  const rawLimit = req.query.limit;

  if (rawLimit === undefined) {
    req.validatedQuery = {
      limit: DEFAULT_LIMIT,
    };

    return next();
  }

  const limit = Number(rawLimit);

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_LIMIT
  ) {
    return res.status(400).json({
      success: false,
      message: `Limit must be an integer between 1 and ${MAX_LIMIT}.`,
    });
  }

  req.validatedQuery = {
    limit,
  };

  return next();
};