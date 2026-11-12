const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticateToken);

router.get('/', documentController.getDocuments);
router.post('/upload', upload.single('file'), documentController.uploadDocument);
router.get('/:id', documentController.getDocumentById);
router.get('/:id/download', documentController.downloadDocument);
router.delete('/:id', documentController.deleteDocument);
router.post('/:id/summarize', documentController.summarizeDocument);

module.exports = router;
