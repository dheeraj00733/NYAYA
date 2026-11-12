const express = require('express');
const router = express.Router();
const factController = require('../controllers/factController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', factController.getFacts);
router.post('/', factController.createFact);
router.put('/:id/verify', factController.verifyFact);
router.delete('/:id', factController.deleteFact);

module.exports = router;
