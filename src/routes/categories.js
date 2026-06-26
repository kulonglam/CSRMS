const router = require('express').Router();
const { body } = require('express-validator');
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/', getCategories);

router.post('/', authorize('manager'), [
  body('name').trim().notEmpty().withMessage('Category name is required.'),
  validate,
], createCategory);

router.put('/:id', authorize('manager'), [
  body('name').optional().trim().notEmpty(),
  validate,
], updateCategory);

router.delete('/:id', authorize('manager'), deleteCategory);

module.exports = router;