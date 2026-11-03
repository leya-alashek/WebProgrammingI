// One import for controllers: const { Patient, Appointment } = require('../models');
module.exports = {
  User: require('./user.model'),
  Token: require('./token.model'),
  Patient: require('./patient.model'),
  Doctor: require('./doctor.model'),
  Clinic: require('./clinic.model'),
  Staff: require('./staff.model'),
  Appointment: require('./appointment.model'),
  Record: require('./record.model'),
  Prescription: require('./prescription.model'),
  LabTest: require('./labTest.model'),
  ...require('./helpers'),
};
