const router = require('express').Router();
const todo = require('./notImplemented');

router.get('/:id', todo('View prescription'));
router.patch('/:id', todo('Approve or deny refill (doctor)'));
router.get('/:id/items', todo('List prescribed items'));
router.post('/:id/refill-request', todo('Request prescription refill (patient)'));

module.exports = router;
