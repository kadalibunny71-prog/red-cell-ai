import { asyncHandler, AppError } from '../utils/http.js';
import { getSessionUser } from '../services/sessions.js';

function tokenFromRequest(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.redcell_session || null;
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = tokenFromRequest(req);
  if (!token) throw AppError('Please sign in to continue.', 401, 'UNAUTHENTICATED');
  const user = await getSessionUser(token);
  if (!user) throw AppError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
  req.user = user;
  req.sessionToken = token;
  next();
});

export { tokenFromRequest };
