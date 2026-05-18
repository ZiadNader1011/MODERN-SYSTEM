import express from 'express';
import * as packingListController from '../controllers/packingListController.js';
import upload from '../middleware/upload.js'; 
import { packingListSchema, validate } from '../middleware/validator.js'; 


const router = express.Router();

router.get('/',  packingListController.getPackingLists);


router.post(
    '/', 
    
    upload.array('attachments'), 
    validate(packingListSchema), 
    packingListController.createPackingList
);


router.put(
    '/:id', 

    upload.array('attachments'), 
    validate(packingListSchema), 
    packingListController.updatePackingList
);


router.delete('/:id',  packingListController.deletePackingList);

export default router;