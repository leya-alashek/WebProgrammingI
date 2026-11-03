const router = require('express').Router();
const todo = require('./notImplemented');

router.get('/me', todo('Get current user profile'));
router.patch('/me', todo('Update own profile'));

module.exports = router;
