import express from 'express';
import { clientSchema, validate } from '../middleware/validator.js'; 
import * as clientController from '../controllers/clientController.js';

const router = express.Router();

router.get('/', clientController.getAllClients); 
router.get('/:id', clientController.getClientDetails);

router.post('/', validate(clientSchema), clientController.createClient);
router.put('/:id',  validate(clientSchema), clientController.updateClient);


router.delete('/:id',  clientController.deleteClient);

export default router;