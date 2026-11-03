const router = require('express').Router();
const todo = require('./notImplemented');

router.get('/:id', todo('View one medical record'));
router.patch('/:id', todo('Update treatment plan / notes'));
router.post('/:id/diagnoses', todo('Add diagnosis'));
router.post('/:id/prescriptions', todo('Create prescription with items'));
router.post('/:id/lab-tests', todo('Order lab test'));

module.exports = router;
