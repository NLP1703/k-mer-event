import { SurveyResponse } from '../models/SurveyResponse.js';
import { emitSurveyResponse } from '../config/realtime.js';

// Questionnaire definition (Chapter 4, Figures 4.1–4.15).
// `multi: true` => the question accepts several values (stored as an array).
const QUESTIONS = [
  { key: 'q1', label: 'Age', multi: false },
  { key: 'q2', label: 'Gender', multi: false },
  { key: 'q3', label: 'Role', multi: false },
  { key: 'q4', label: 'Attendance frequency', multi: false },
  { key: 'q5', label: 'How attendees discover events', multi: true },
  { key: 'q6', label: 'Challenges', multi: true },
  { key: 'q7', label: 'Feature importance', multi: false },
  { key: 'q8', label: 'Most useful features', multi: true },
  { key: 'q9', label: 'Essential event information', multi: true },
  { key: 'q10', label: 'Preferred sharing', multi: false },
  { key: 'q11', label: 'QR ticket security', multi: false },
  { key: 'q12', label: 'Trust measures', multi: true },
  { key: 'q13', label: 'Preferred payment', multi: false },
  { key: 'q14', label: 'Ticket pricing', multi: false },
  { key: 'q15', label: 'Intended usage frequency', multi: false },
];

const hasAnswer = (value) =>
  Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';

// POST /api/survey — record one anonymous response. Public (no auth).
// Body: { q1, q2, ..., q15 }  (multi-choice questions may be arrays)
export const submitSurvey = async (req, res, next) => {
  try {
    const body = req.body || {};

    // Keep only known question keys; reject if any is missing.
    const answers = {};
    const missing = [];
    for (const { key } of QUESTIONS) {
      if (!hasAnswer(body[key])) {
        missing.push(key);
        continue;
      }
      answers[key] = body[key];
    }

    if (missing.length) {
      return res
        .status(400)
        .json({ message: 'Veuillez répondre à toutes les questions.', missing });
    }

    const entry = await SurveyResponse.create({
      answers,
      ip: req.ip,
      user_agent: (req.headers['user-agent'] || '').slice(0, 512),
    });

    // Push a realtime signal so the admin dashboard updates instantly.
    try {
      const total = await SurveyResponse.count();
      emitSurveyResponse(total);
    } catch (_) { /* non-fatal */ }

    return res.status(201).json({ ok: true, id: entry.id });
  } catch (error) {
    next(error);
  }
};

// GET /api/survey/results — aggregated counts per question/option, ready to be
// charted for the figures. Admin-only (wired with authenticate + authorize).
export const getSurveyResults = async (req, res, next) => {
  try {
    const rows = await SurveyResponse.findAll({ attributes: ['answers'] });
    const total = rows.length;

    const results = QUESTIONS.map(({ key, label, multi }) => {
      const counts = {};
      for (const row of rows) {
        // Defensive: tolerate answers stored as a JSON string (legacy rows).
        let answers = row.answers;
        if (typeof answers === 'string') {
          try { answers = JSON.parse(answers); } catch { answers = {}; }
        }
        const value = answers?.[key];
        if (value === undefined || value === null || value === '') continue;
        const values = Array.isArray(value) ? value : [value];
        for (const v of values) counts[v] = (counts[v] || 0) + 1;
      }
      // Sort options by frequency (desc) for readable tables/charts.
      const options = Object.entries(counts)
        .map(([option, count]) => ({
          option,
          count,
          percentage: total ? Math.round((count / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count);
      return { key, label, multi, options };
    });

    return res.json({ total, results });
  } catch (error) {
    next(error);
  }
};
