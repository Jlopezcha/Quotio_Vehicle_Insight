import { getPostById } from '../services/postService.js';

export async function authorizeOwnership(req, res, next) {
  const id = req.params.id;
  const post = await getPostById(id);
  if (String(post.author) !== req.user.userId) {
    const error = new Error('Forbidden: insufficient permission.');
    error.status = 403;
    return next(error);
  }
  next();
}
