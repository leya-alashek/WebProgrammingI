const router = require('express').Router();
const todo = require('./notImplemented');

router.get('/', todo('List clinics'));
router.get('/:id', todo('Clinic details'));
router.get('/:id/staff', todo('List clinic staff (staff/admin)'));

module.exports = router;
