import {Router} from 'express';

import {
    getAllCommentsHandler,
    getCommentByIdHandler,
    getCommentsByPostIdHandler,
    createCommentHandler,
    updateCommentHandler,
    deleteCommentHandler
} from '../controllers/commentController.js';

import{
    validateId,
    validateCreateComment,
    validateUpdateComment
} from '../middleware/commentValidators.js'

import { authenticateToken } from '../middleware/auth.js';
import { authorizeOwnership } from '../middleware/authorizeOwnership.js';

import { getCommentById } from '../services/commentService.js';


const router = Router();

router.get('/', getAllCommentsHandler);
router.get('/:id', validateId, getCommentByIdHandler);
router.get('/filter-comments/:id', validateId, getCommentsByPostIdHandler);
router.post('/create/:id', authenticateToken, validateCreateComment, createCommentHandler);
router.put('/:id', authenticateToken, validateId, authorizeOwnership(getCommentById), validateUpdateComment, updateCommentHandler);
router.delete('/:id', authenticateToken, validateId, authorizeOwnership(getCommentById), deleteCommentHandler);

export default router;