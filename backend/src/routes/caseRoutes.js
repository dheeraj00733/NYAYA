const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, requireCaseAccess } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', caseController.getCases);
router.post('/', requireRole('lawyer', 'admin'), caseController.createCase);
router.get('/:id', requireCaseAccess('view'), caseController.getCaseById);
router.put('/:id', requireCaseAccess('edit'), caseController.updateCase);
router.delete('/:id', caseController.deleteCase);

// Case Members
router.post('/:id/members', requireCaseAccess('edit'), caseController.addCaseMember);
router.delete('/:id/members/:userId', requireCaseAccess('edit'), caseController.removeCaseMember);

// Case Parties
router.post('/:id/parties', requireCaseAccess('edit'), caseController.addCaseParty);

module.exports = router;