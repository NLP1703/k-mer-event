import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

// Anonymous responses to the K-MER EVENT user-acceptance survey (Chapter 4).
// The 15 answers are kept together in a single JSON column so the questionnaire
// can evolve without a schema migration; aggregation for the figures is done at
// read-time in the controller.
// Table: survey_responses (migration: scripts/migrate-survey.js).
export const SurveyResponse = sequelize.define('SurveyResponse', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  // { q1: 'value', q5: ['a','b'], ... q15: 'value' }
  // Stored as JSON text. The live DB maps the JSON type to LONGTEXT (MariaDB
  // style), which made Sequelize's native JSON type double-encode the value and
  // return a string on read. Using TEXT with an explicit get/set guarantees
  // clean single-encoded storage and a parsed object on read.
  answers: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    get() {
      const v = this.getDataValue('answers');
      if (v == null || typeof v !== 'string') return v;
      try { return JSON.parse(v); } catch { return {}; }
    },
    set(value) {
      this.setDataValue('answers', typeof value === 'string' ? value : JSON.stringify(value));
    },
  },
  // Best-effort context for de-duplication / analytics — never shown publicly.
  ip: { type: DataTypes.STRING, allowNull: true },
  user_agent: { type: DataTypes.STRING(512), allowNull: true },
});
