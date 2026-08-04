// Central models index for convenience
const User = require('./User');
const Student = require('./Student');
const Laboratory = require('./Laboratory');
const Machine = require('./Machine');
const Session = require('./Session');
const AttendanceRecord = require('./AttendanceRecord');
const Telemetry = require('./Telemetry');
const Policy = require('./Policy');
const ViolationLog = require('./ViolationLog');
const RemoteCommandLog = require('./RemoteCommandLog');
const AuditLog = require('./AuditLog');

module.exports = {
  User,
  Student,
  Laboratory,
  Machine,
  Session,
  AttendanceRecord,
  Telemetry,
  Policy,
  ViolationLog,
  RemoteCommandLog,
  AuditLog,
};