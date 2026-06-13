const router = require('express').Router();
const { body } = require('express-validator');
const { getBranches, getBranch, createBranch, updateBranch } = require('../controllers/branchController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/', getBranches);
router.get('/:id', getBranch);

router.post('/', authorize('director'), [
  body('name').trim().notEmpty().withMessage('Branch name is required.'),
  validate,
], createBranch);

router.put('/:id', authorize('director'), [
  body('name').optional().trim().notEmpty(),
  validate,
], updateBranch);

module.exports = router;