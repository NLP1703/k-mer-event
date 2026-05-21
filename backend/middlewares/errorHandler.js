export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Log backend details (Sequelize/MySQL errors are often nested)
  // This will help identify the exact cause of the 500 during sign-up.
  // eslint-disable-next-line no-console
  console.error('API Error:', {
    message: err?.message,
    name: err?.name,
    statusCode,
    stack: err?.stack,
    original: err?.original,
    sql: err?.sql,
    fields: err?.fields,
  });

  const payload = {
    message: err.message || 'Internal server error',
    details:
      process.env.NODE_ENV === 'production'
        ? undefined
        : {
            stack: err.stack,
            original: err.original,
            sql: err.sql,
            fields: err.fields,
          },
  };

  res.status(statusCode).json(payload);
};

