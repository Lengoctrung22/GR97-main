export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Route not found" });
};

export const errorHandler = (err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);

  if (err?.name === "MongoServerError" && err?.code === 11000) {
    const duplicateField = Object.keys(err?.keyPattern || {})[0] || "field";
    return res.status(409).json({
      message: `${duplicateField} already exists`,
    });
  }

  if (err?.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }

  return res.status(500).json({ message: "Internal server error" });
};
