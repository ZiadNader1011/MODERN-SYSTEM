import express from 'express';
import upload from '../middleware/upload.js';
import * as operationController from '../controllers/operationController.js';
import { shipmentOperationSchema, validate } from '../middleware/validator.js';


const router = express.Router();


router.get('/',  operationController.getOperations);


router.post(
    '/', 
    upload.array('attachments'), 
   
    validate(shipmentOperationSchema), 
    operationController.createOperation
);


router.put(
    '/:id', 
    upload.array('attachments'), 
    
    validate(shipmentOperationSchema), 
    operationController.updateOperation
);


router.delete('/:id',  operationController.deleteOperation);

export default router;