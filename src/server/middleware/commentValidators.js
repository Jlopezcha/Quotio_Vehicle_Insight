import {param, body} from 'express-validator';
import { handleValidationErrors } from './handleValidationErrors.js';

export const validateId = [
  param('id')
    .trim()
    .escape()
    .isMongoId()
    .withMessage('Invalid Mongo and comment Id'),

  handleValidationErrors,
];

export const validateCreateComment = [
  body('content')
    .exists({ values: 'falsy' })
    .withMessage('Content is required')
    .bail()
    .trim()
    .escape()
    .isString()
    .withMessage('Content must be a string')
    .bail()
    .isLength({ min: 1 })
    .withMessage('Content must be at least 1 character'),

  handleValidationErrors,
];

export const validateUpdateComment = [
  body('content')
    .optional()
    .trim()
    .escape()
    .isString()
    .withMessage('Content must be a string')
    .bail()
    .isLength({ min: 1 })
    .withMessage('Content must be at least 1 character'),

  handleValidationErrors,
];
