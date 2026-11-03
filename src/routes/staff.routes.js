const router = require('express').Router();
const todo = require('./notImplemented');

router.post('/', todo('Add staff member (admin)'));
router.patch('/:id', todo('Update staff member (admin)'));

module.exports = router;
