import './auth.css'

const TOKEN_KEY = 'store_auth_token'
const USER_KEY = 'store_auth_user'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return API_BASE ? `${API_BASE}${normalized}` : normalized
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getAuthUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return Boolean(getAuthToken())
}

export function getAuthHeaders() {
  const token = getAuthToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

function saveSession(data) {
  if (data?.token) localStorage.setItem(TOKEN_KEY, data.token)
  if (data?.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

async function authRequest(path, body) {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const rawText = await res.text()
  let json = null
  try {
    json = rawText ? JSON.parse(rawText) : null
  } catch {
    json = null
  }
  if (!res.ok) {
    throw new Error(
      (json && json.message) ||
        (rawText ? `Request failed (${res.status})` : `Request failed (${res.status})`)
    )
  }
  if (!json || !json.success) {
    throw new Error((json && json.message) || 'Unexpected response from server')
  }
  return json
}

function showMessage(el, text, isError = true) {
  if (!el) return
  el.textContent = text
  el.hidden = !text
  el.classList.toggle('auth-message-error', isError)
  el.classList.toggle('auth-message-success', !isError)
}

function showAuthPage(page) {
  const loginPage = document.getElementById('auth-login')
  const signupPage = document.getElementById('auth-signup')
  loginPage?.classList.toggle('view-hidden', page !== 'login')
  signupPage?.classList.toggle('view-hidden', page !== 'signup')
}

function showStore(show) {
  const authApp = document.getElementById('auth-app')
  const storeApp = document.getElementById('store-app')
  if (authApp) authApp.classList.toggle('view-hidden', show)
  if (storeApp) storeApp.classList.toggle('view-hidden', !show)
  document.body.classList.toggle('store-active', show)
}

function updateUserMenu() {
  const user = getAuthUser()
  const greeting = document.getElementById('user-greeting')
  if (greeting) {
    greeting.textContent = user?.name ? `Hi, ${user.name}` : ''
    greeting.hidden = !user?.name
  }
}

function bindPasswordToggle(btnId, inputId) {
  const btn = document.getElementById(btnId)
  const input = document.getElementById(inputId)
  if (!btn || !input) return
  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password'
    input.type = isPassword ? 'text' : 'password'
    btn.textContent = isPassword ? '🙈' : '👁'
    btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password')
  })
}

let storeInitCallback = null

export function onAuthReady(callback) {
  storeInitCallback = callback
  if (isAuthenticated()) callback()
}

export function initAuth() {
  const loginForm = document.getElementById('login-form')
  const signupForm = document.getElementById('signup-form')
  const loginMsg = document.getElementById('login-message')
  const signupMsg = document.getElementById('signup-message')

  bindPasswordToggle('login-toggle-pw', 'login-password')
  bindPasswordToggle('signup-toggle-pw', 'signup-password')

  document.getElementById('go-to-signup')?.addEventListener('click', (e) => {
    e.preventDefault()
    showAuthPage('signup')
  })

  const goLogin = (e) => {
    e.preventDefault()
    showAuthPage('login')
  }
  document.getElementById('go-to-login')?.addEventListener('click', goLogin)
  document.getElementById('go-to-login-footer')?.addEventListener('click', goLogin)

  document.getElementById('auth-nav-signup')?.addEventListener('click', (e) => {
    e.preventDefault()
    showAuthPage('signup')
  })

  document.getElementById('auth-nav-login')?.addEventListener('click', (e) => {
    e.preventDefault()
    showAuthPage('login')
  })

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    clearSession()
    showStore(false)
    showAuthPage('login')
    loginForm?.reset()
    signupForm?.reset()
  })

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    showMessage(loginMsg, '')

    const email = document.getElementById('login-email')?.value.trim()
    const password = document.getElementById('login-password')?.value

    if (!email || !password) {
      showMessage(loginMsg, 'Email and password are required.')
      return
    }

    const submitBtn = loginForm.querySelector('[type="submit"]')
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.textContent = 'Logging in…'
    }

    try {
      const json = await authRequest('/api/auth/login', { email, password })
      if (!json.data?.token) throw new Error('No token received from server')
      saveSession(json.data)
      updateUserMenu()
      showStore(true)
      if (storeInitCallback) storeInitCallback()
    } catch (err) {
      showMessage(loginMsg, err instanceof Error ? err.message : 'Login failed')
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = 'Log In'
      }
    }
  })

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    showMessage(signupMsg, '')

    const name = document.getElementById('signup-name')?.value.trim()
    const email = document.getElementById('signup-email')?.value.trim()
    const password = document.getElementById('signup-password')?.value

    if (!name || !email || !password) {
      showMessage(signupMsg, 'All fields are required.')
      return
    }

    const submitBtn = signupForm.querySelector('[type="submit"]')
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.textContent = 'Creating account…'
    }

    try {
      const json = await authRequest('/api/auth/signup', { name, email, password })
      if (!json.data?.token) throw new Error('No token received from server')
      saveSession(json.data)
      showMessage(signupMsg, json.message || 'Account created!', false)
      updateUserMenu()
      setTimeout(() => {
        showStore(true)
        if (storeInitCallback) storeInitCallback()
      }, 600)
    } catch (err) {
      showMessage(signupMsg, err instanceof Error ? err.message : 'Signup failed')
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = 'Sign Up'
      }
    }
  })

  if (isAuthenticated()) {
    updateUserMenu()
    showStore(true)
  } else {
    showStore(false)
    showAuthPage('login')
  }
}
