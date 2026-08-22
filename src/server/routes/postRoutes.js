import { Router } from 'express';

import {
  getAllPostsHandler,
  getPostByIdHandler,
  createPostHandler,
  updatePostHandler,
  deletePostHandler,
} from '../controllers/postController.js';

import {
  validateId,
  validateCreatePost,
  validateUpdatePost,
} from '../middleware/postValidators.js';

import { authenticateToken } from '../middleware/auth.js';
import { authorizeOwnership } from '../middleware/authorizeOwnership.js';

const router = Router();

router.get('/', getAllPostsHandler);
router.get('/:id', validateId, getPostByIdHandler);
router.post('/', authenticateToken, validateCreatePost, createPostHandler);
router.put(
  '/:id',
  authenticateToken,
  validateId,
  authorizeOwnership,
  validateUpdatePost,
  updatePostHandler,
);
router.delete(
  '/:id',
  authenticateToken,
  validateId,
  authorizeOwnership,
  deletePostHandler,
);

export default router;