const router = require('express').Router();
const todo = require('./notImplemented');

router.get('/:id', todo('View lab test and result'));
router.patch('/:id', todo('Record lab test result'));

module.exports = router;
