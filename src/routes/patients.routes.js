const router = require('express').Router();
const todo = require('./notImplemented');

router.get('/', todo('List patients (staff only)'));
router.post('/', todo('Register patient (staff)'));
router.get('/:id', todo('Get authorized patient profile'));
router.patch('/:id', todo('Update patient demographics'));

router.get('/:id/records', todo("Patient's authorized record history"));
router.post('/:id/records', todo('Create consultation record'));

module.exports = router;
