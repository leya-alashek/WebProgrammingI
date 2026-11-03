const router = require('express').Router();
const todo = require('./notImplemented');

router.get('/', todo('List appointments by role'));
router.post('/', todo('Request or schedule appointment'));
router.get('/:id', todo('View appointment details'));
router.patch('/:id', todo('Reschedule or update status'));
router.delete('/:id', todo('Cancel appointment (sets status to cancelled)'));

module.exports = router;
