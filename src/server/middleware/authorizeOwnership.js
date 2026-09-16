export function authorizeOwnership(getResourceById) {
  return async function (req, res, next) {
    try {
      const id = req.params.id;
      const resource = await getResourceById(id);

      if (String(resource.author) !== req.user.userId) {
        const error = new Error("Forbidden: insufficient permission.");
        error.status = 403;
        return next(error);
      }
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
}
