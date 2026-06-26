const router = require('express').Router();
const { body } = require('express-validator');
const { getBranches, createBranch, updateBranch, deleteBranch } = require('../controllers/branchController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/', getBranches);

router.post('/', authorize('director'), [
  body('name').trim().notEmpty().withMessage('Branch name is required.'),
  validate,
], createBranch);

router.put('/:id', authorize('director'), [
  body('name').optional().trim().notEmpty(),
  validate,
], updateBranch);

router.delete('/:id', authorize('director'), deleteBranch);

module.exports = router;