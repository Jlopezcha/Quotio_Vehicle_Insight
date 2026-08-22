import { param, body, oneOf } from 'express-validator';
import { handleValidationErrors } from './handleValidationErrors.js';

export const validateId = [
  param('id')
    .trim()
    .escape()
    .isMongoId()
    .withMessage('Invalid Mongo and post Id'),

  handleValidationErrors,
];

export const validateCreatePost = [
  body('title')
    .exists({ values: 'falsy' })
    .withMessage('Title is required')
    .bail()
    .trim()
    .escape()
    .isLength({ min: 3 })
    .withMessage('Title must be at least 3 characters'),

  body('content')
    .exists({ values: 'falsy' })
    .withMessage('Content is required')
    .bail()
    .trim()
    .escape()
    .isString()
    .withMessage('Content must be a string')
    .bail()
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters'),

  handleValidationErrors,
];

export const validateUpdatePost = [
  oneOf(
    [
      body('title').exists({ values: 'falsy' }),
      body('content').exists({ values: 'falsy' }),
    ],
    { message: 'At least one field (title, content) must be provided' },
  ),

  body('title')
    .optional()
    .trim()
    .escape()
    .isString()
    .withMessage('Title must be a string')
    .bail()
    .isLength({ min: 3 })
    .withMessage('Title must be at least 3 characters'),

  body('content')
    .optional()
    .trim()
    .escape()
    .isString()
    .withMessage('Content must be a string')
    .bail()
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters'),

  handleValidationErrors,
];
