const router = require('express').Router();
const todo = require('./notImplemented');

router.get('/', todo('List/search doctors'));
router.post('/', todo('Add doctor (admin)'));
router.get('/:id', todo('Doctor details and specialty'));
router.get('/:id/availability', todo('View available time slots'));
router.put('/:id/schedule', todo('Set weekly working hours (doctor/admin)'));

module.exports = router;
