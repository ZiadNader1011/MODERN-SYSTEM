import { Router } from 'express';
import { getAllFiles, createArchiveFile, deleteArchiveFile } from '../controllers/archiveController.js';

const router = Router();

router.get('/', getAllFiles);
router.post('/', createArchiveFile);
router.delete('/:id', deleteArchiveFile);

export default router;