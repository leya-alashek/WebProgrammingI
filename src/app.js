const express = require('express');

const app = express();
app.use(express.json());

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/patients', require('./routes/patients.routes'));
app.use('/api/doctors', require('./routes/doctors.routes'));
app.use('/api/clinics', require('./routes/clinics.routes'));
app.use('/api/staff', require('./routes/staff.routes'));
app.use('/api/appointments', require('./routes/appointments.routes'));
app.use('/api/records', require('./routes/records.routes'));
app.use('/api/prescriptions', require('./routes/prescriptions.routes'));
app.use('/api/lab-tests', require('./routes/labTests.routes'));

app.get('/', (req, res) => res.json({ message: 'Medical Clinic Portal API' }));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

module.exports = app;
