export const validate = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.validated = validated;
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: error.errors?.map(e => ({ path: e.path.join('.'), message: e.message })) || error.message,
    });
  }
};
