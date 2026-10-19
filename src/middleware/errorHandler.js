function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} was not found.`,
    },
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message:
        statusCode >= 500
          ? "An unexpected server error occurred."
          : err.message || "Request failed.",
      ...(err.fields ? { fields: err.fields } : {}),
    },
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};