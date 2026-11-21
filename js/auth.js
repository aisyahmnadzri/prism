// PRISM — demo authentication (prototype only; real login will be server-side)
const SESSION_KEY = 'prism_session';

function login(email, password) {
  const user = USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || password !== passwordFor(user.id)) return null;
  try { sessionStore().setItem(SESSION_KEY, user.id); } catch (e) { /* ignore */ }
  return user;
}

function currentUser() {
  try { return userById(sessionStore().getItem(SESSION_KEY)); } catch (e) { return null; }
}

function logout() {
  try { sessionStore().removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  window.location.href = 'index.html';
}

function requireAuth() {
  const user = currentUser();
  if (!user) window.location.href = 'index.html';
  return user;
}
