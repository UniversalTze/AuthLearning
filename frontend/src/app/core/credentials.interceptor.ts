import { HttpInterceptorFn } from '@angular/common/http';

// This interceptor adds withCredentials: true to every outgoing request.
// That tells the browser to include cookies (and other credentials) in cross-origin
// requests. Without this, the browser strips cookies when the frontend (localhost:4200)
// talks to the backend (localhost:3001) because they are different origins.
export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ withCredentials: true }));
