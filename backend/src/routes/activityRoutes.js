const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', activityController.getActivities);

module.exports = router;
