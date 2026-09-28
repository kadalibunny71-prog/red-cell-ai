export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function AppError(message, status = 400, code = 'BAD_REQUEST') {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export function publicProfile(profile) {
  if (!profile) return null;
  const { password_hash, ...safeProfile } = profile;
  return safeProfile;
}
