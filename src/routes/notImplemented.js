// Placeholder handler until each route gets its real logic
module.exports = (label) => (req, res) =>
  res.status(501).json({ route: label, params: req.params, message: 'Not implemented yet' });
