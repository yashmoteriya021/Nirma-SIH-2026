import Scheme from '../models/Scheme.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/schemes?lang=en&category=business
 * List all active schemes with optional filters.
 */
export const getSchemes = asyncHandler(async (req, res) => {
  const { lang = 'en', category } = req.query;
  const filter = { is_active: true };

  if (category) {
    filter.category = category;
  }

  const schemes = await Scheme.find(filter).sort({ scheme_id: 1 });

  // Optionally localize: return only the requested language description
  const localized = schemes.map(s => {
    const obj = s.toObject();
    if (lang && obj.description) {
      obj.description_text = obj.description[lang] || obj.description.en;
    }
    return obj;
  });

  return successResponse(res, { schemes: localized, count: localized.length }, 'Schemes retrieved');
});

/**
 * GET /api/schemes/:scheme_id?lang=hi
 * Get a single scheme by scheme_id.
 */
export const getSchemeById = asyncHandler(async (req, res) => {
  const { scheme_id } = req.params;
  const { lang = 'en' } = req.query;

  const scheme = await Scheme.findOne({ scheme_id, is_active: true });
  if (!scheme) {
    return errorResponse(res, 'SCHEME_NOT_FOUND', `Scheme '${scheme_id}' not found.`, 404);
  }

  const obj = scheme.toObject();
  if (lang && obj.description) {
    obj.description_text = obj.description[lang] || obj.description.en;
  }

  return successResponse(res, { scheme: obj }, 'Scheme retrieved');
});

/**
 * GET /api/schemes/search?q=education&lang=en
 * Text search on scheme name + descriptions.
 */
export const searchSchemes = asyncHandler(async (req, res) => {
  const { q, lang = 'en' } = req.query;

  if (!q || q.trim().length === 0) {
    return errorResponse(res, 'MISSING_QUERY', 'Search query "q" is required.', 400);
  }

  const schemes = await Scheme.find(
    { $text: { $search: q }, is_active: true },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });

  const localized = schemes.map(s => {
    const obj = s.toObject();
    if (lang && obj.description) {
      obj.description_text = obj.description[lang] || obj.description.en;
    }
    return obj;
  });

  return successResponse(res, { schemes: localized, count: localized.length }, 'Search results');
});

