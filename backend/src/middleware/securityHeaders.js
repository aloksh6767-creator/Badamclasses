const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (/^\/api\/(auth|payments|enrollments|student|instructor|upload|automation)\b/.test(req.path)) {
    res.setHeader("Cache-Control", "no-store");
  }

  next();
};

export default securityHeaders;
