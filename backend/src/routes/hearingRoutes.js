const express = require('express');
const router = express.Router();
const hearingController = require('../controllers/hearingController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', hearingController.getHearings);
router.post('/', hearingController.createHearing);
router.put('/:id', hearingController.updateHearing);
router.delete('/:id', hearingController.deleteHearing);

module.exports = router;
