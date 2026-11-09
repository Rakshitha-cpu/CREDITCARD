export const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled Application Error:', err);
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const fields = err.meta?.target ? ` (${err.meta.target.join(', ')})` : '';
    return res.status(409).json({
      success: false,
      message: `A record with this identifier already exists${fields}.`,
    });
  }

  // Prisma foreign key constraint violation
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference: Related entity does not exist or cannot be deleted.',
    });
  }

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultMessage = statusCode === 500 && isProduction 
    ? 'Internal server error occurred.' 
    : (err.message || 'Internal server error occurred.');

  return res.status(statusCode).json({
    success: false,
    message: defaultMessage,
    errors: err.errors || undefined,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
