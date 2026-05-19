import './style.css'
import { initAuth, onAuthReady, getAuthHeaders } from './auth.js'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return API_BASE ? `${API_BASE}${normalized}` : normalized
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getProductId(product) {
  if (!product) return null
  const id = product.id ?? product._id
  if (id == null || id === '') return null
  return String(id)
}

async function parseApiResponse(res) {
  const rawText = await res.text()
  let json = null
  try {
    json = rawText ? JSON.parse(rawText) : null
  } catch {
    json = null
  }
  return { json, rawText }
}

async function apiRequest(path, { method = 'GET', body } = {}) {
  const options = { method }
  const headers = { ...getAuthHeaders() }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }
  options.headers = headers
  const res = await fetch(apiUrl(path), options)
  const { json, rawText } = await parseApiResponse(res)
  return { res, json, rawText }
}

/** Turn backend paths into a browser-loadable URL */
function resolveProductImageUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('data:')) return trimmed

  // Full URLs (S3, CDN, etc.) — always use as-is; do not rewrite to /uploads on localhost
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  // Relative path served by backend (dev proxy or API_BASE)
  if (!API_BASE) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }

  const origin = API_BASE
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`
}

/** Backend uses imageUrl; also supports image and images[].url */
function getProductImageUrl(product) {
  if (!product) return null
  if (product.imageUrl && String(product.imageUrl).trim()) return product.imageUrl
  if (product.image && String(product.image).trim()) return product.image
  const images = product.images
  if (Array.isArray(images) && images.length > 0 && images[0]?.url) {
    return images[0].url
  }
  return null
}

function normalizeProduct(product) {
  const imageUrl = getProductImageUrl(product)
  return { ...product, imageUrl, image: imageUrl }
}

let products = []
let activeCategory = 'all'
let searchQuery = ''

const SHOP_CATEGORIES = [
  { id: 'all', label: 'Top Offers', icon: '🏷️' },
  { id: 'Electronics', label: 'Electronics', icon: '📱' },
  { id: 'Accessories', label: 'Fashion', icon: '👕' },
  { id: 'Audio', label: 'Audio', icon: '🎧' },
  { id: 'Bags', label: 'Bags', icon: '🎒' },
  { id: 'Home', label: 'Home', icon: '🏠' },
  { id: 'Tech', label: 'Tech', icon: '💻' },
]

function getFilteredProducts() {
  const q = searchQuery.toLowerCase()
  return products.filter((p) => {
    const cat = (p.category || '').trim()
    const matchCat =
      activeCategory === 'all' || cat.toLowerCase() === activeCategory.toLowerCase()
    const matchSearch =
      !q ||
      [p.name, p.description, p.category].some((s) =>
        String(s || '')
          .toLowerCase()
          .includes(q)
      )
    return matchCat && matchSearch
  })
}

function renderCategoryStrip() {
  const strip = document.getElementById('category-strip')
  if (!strip) return
  strip.innerHTML = SHOP_CATEGORIES.map(
    (c) => `
    <button type="button" class="category-chip ${activeCategory === c.id ? 'active' : ''}" data-category="${escapeHtml(c.id)}">
      <span class="category-icon">${c.icon}</span>
      <span class="category-label">${escapeHtml(c.label)}</span>
    </button>
  `
  ).join('')
}

function fakeRating(productId) {
  const seed = String(productId || '')
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0)
  const rating = (4 + (seed % 10) / 10).toFixed(1)
  const count = 20 + (seed % 200)
  return { rating, count }
}

// Customer listings with avatars
const customers = [
  { id: 1, name: 'Alex Morgan', role: 'Premium Member', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face' },
  { id: 2, name: 'Jordan Lee', role: 'VIP Customer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
  { id: 3, name: 'Sam Taylor', role: 'Regular Buyer', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
  { id: 4, name: 'Riley Chen', role: 'New Customer', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' },
  { id: 5, name: 'Casey Kim', role: 'Premium Member', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face' },
  { id: 6, name: 'Morgan Davis', role: 'VIP Customer', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face' },
]

function productImageMarkup(imageUrl, name) {
  const resolved = resolveProductImageUrl(imageUrl)
  const safeAlt = escapeHtml(name || 'Product')
  if (resolved) {
    return `<img src="${escapeHtml(resolved)}" alt="${safeAlt}" class="product-image" loading="lazy" decoding="async" />`
  }
  return `<div class="product-image-placeholder" aria-hidden="true">
    <span class="product-image-placeholder-icon" aria-hidden="true">📷</span>
    <span>No image</span>
  </div>`
}

function updateProductsSubtitle() {
  const subtitle = document.getElementById('products-subtitle')
  if (!subtitle) return
  const filtered = getFilteredProducts()
  const total = products.length
  if (total === 0) {
    subtitle.textContent = 'No products yet'
    return
  }
  if (filtered.length === total) {
    subtitle.textContent = `${total} item${total === 1 ? '' : 's'}`
  } else {
    subtitle.textContent = `${filtered.length} of ${total} items`
  }
}

function renderProducts() {
  const grid = document.getElementById('products-grid')
  if (!grid) return
  updateProductsSubtitle()
  const list = getFilteredProducts()
  if (products.length === 0) {
    grid.innerHTML = `
      <button type="button" class="add-product-empty" id="empty-add-product">
        <span class="add-product-empty-icon">+</span>
        <strong>Add your first product</strong>
        <span>Click here or use <strong>+ Add Product</strong> in the top bar</span>
      </button>`
    return
  }
  if (list.length === 0) {
    grid.innerHTML =
      '<p class="products-empty">No products match your search or category. Try a different filter.</p>'
    return
  }
  grid.innerHTML = list
    .map((p, i) => {
      const name = escapeHtml(p.name || 'Product')
      const price = p.price != null ? p.price : 0
      const category = escapeHtml(p.category || 'Product')
      const id = getProductId(p)
      const imgUrl = getProductImageUrl(p)
      const { rating, count } = fakeRating(id)
      const actions = id
        ? `<div class="product-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-action="view" data-id="${escapeHtml(id)}">View</button>
        <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${escapeHtml(id)}">Delete</button>
      </div>`
        : ''
      return `
    <article class="product-card animate-in" style="animation-delay: ${i * 0.05}s">
      <div class="product-image-wrap">
        ${productImageMarkup(imgUrl, p.name || 'Product')}
        <span class="product-badge">${category}</span>
      </div>
      <div class="product-info">
        <h3 class="product-name">${name}</h3>
        <p class="product-rating">${rating} ★ (${count})</p>
        <p class="product-price">$${Number(price).toFixed(2)}<span>Free delivery</span></p>
        <p class="product-delivery">Bank offer available</p>
        ${actions}
      </div>
    </article>
  `
    })
    .join('')
}

async function fetchAllProducts() {
  const { res, json, rawText } = await apiRequest('/api/products')
  if (!res.ok) {
    throw new Error((json && json.message) || `Failed to load products (${res.status})`)
  }
  const list = json && json.success && Array.isArray(json.data) ? json.data : []
  return list.map(normalizeProduct)
}

async function fetchProductById(id) {
  const { res, json, rawText } = await apiRequest(
    `/api/products/${encodeURIComponent(id)}`
  )
  if (!res.ok) {
    throw new Error(
      (json && json.message) ||
        (rawText ? `Failed to load product (${res.status})` : `Failed to load product (${res.status})`)
    )
  }
  if (!json || !json.success || !json.data) {
    throw new Error((json && json.message) || 'Unexpected response from server')
  }
  return normalizeProduct(json.data)
}

async function createProduct(payload) {
  const { res, json, rawText } = await apiRequest('/api/products', {
    method: 'POST',
    body: payload,
  })
  if (!res.ok) {
    const msg =
      (json && json.message) ||
      (rawText ? `Server error (${res.status}): ${rawText.slice(0, 160)}` : `Server error (${res.status})`)
    throw new Error(msg)
  }
  if (!json || !json.success || !json.data) {
    throw new Error((json && json.message) || 'Unexpected response from server')
  }
  return json.data
}

async function deleteProductById(id) {
  const { res, json, rawText } = await apiRequest(
    `/api/products/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  )
  if (!res.ok) {
    throw new Error(
      (json && json.message) ||
        (rawText ? `Delete failed (${res.status})` : `Delete failed (${res.status})`)
    )
  }
  if (json && json.success === false) {
    throw new Error(json.message || 'Delete failed')
  }
}

async function loadProductsFromApi() {
  const grid = document.getElementById('products-grid')
  if (grid) {
    grid.innerHTML = '<p class="products-empty">Loading products…</p>'
  }
  try {
    products = await fetchAllProducts()
    renderProducts()
  } catch (err) {
    products = []
    updateProductsSubtitle()
    if (grid) {
      const hint = err instanceof Error ? err.message : 'Could not load products'
      grid.innerHTML = `<p class="products-empty products-empty-error">${escapeHtml(hint)}</p>`
    }
  }
}

function renderCustomers() {
  const grid = document.getElementById('customers-grid')
  if (!grid) return
  grid.innerHTML = customers
    .map(
      (c, i) => `
    <article class="customer-card animate-in" style="animation-delay: ${i * 0.08}s">
      <div class="customer-avatar-wrap">
        <img src="${c.avatar}" alt="${c.name}" class="customer-avatar" loading="lazy" />
      </div>
      <h3 class="customer-name">${c.name}</h3>
      <p class="customer-role">${c.role}</p>
    </article>
  `
    )
    .join('')
}

// ----- Create Product modal & API -----
const modal = document.getElementById('create-product-modal')
const form = document.getElementById('create-product-form')
const formMessage = document.getElementById('form-message')

function showMessage(text, isError = false) {
  if (!formMessage) return
  formMessage.textContent = text
  formMessage.classList.toggle('form-message-error', isError)
  formMessage.classList.toggle('form-message-success', !isError)
  formMessage.hidden = !text
}

let previewObjectUrl = null

function revokeProductImagePreview() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = null
  }
  const wrap = document.getElementById('product-image-preview-wrap')
  const img = document.getElementById('product-image-preview')
  const nameEl = document.getElementById('product-image-filename')
  if (img) img.src = ''
  if (wrap) wrap.hidden = true
  if (nameEl) nameEl.textContent = ''
  document.getElementById('upload-zone')?.classList.remove('upload-zone-has-file')
}

async function uploadProductImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(apiUrl('/api/upload'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  })
  const rawText = await res.text()
  let json = null
  try {
    json = rawText ? JSON.parse(rawText) : null
  } catch {
    json = null
  }
  if (!res.ok) {
    const msg =
      (json && json.message) ||
      (rawText ? `Upload failed (${res.status}): ${rawText.slice(0, 160)}` : `Upload failed (${res.status})`)
    throw new Error(msg)
  }
  if (!json || !json.success || !json.data || !json.data.url) {
    throw new Error((json && json.message) || 'Unexpected response from upload')
  }
  return json.data
}

function openModal() {
  if (modal) {
    modal.classList.add('modal-open')
    modal.setAttribute('aria-hidden', 'false')
    showMessage('')
    revokeProductImagePreview()
    form?.reset()
    setTimeout(() => document.getElementById('product-name')?.focus(), 0)
  }
}

function closeModal() {
  if (modal) {
    modal.classList.remove('modal-open')
    modal.setAttribute('aria-hidden', 'true')
    showMessage('')
    revokeProductImagePreview()
  }
}

// ----- Product detail (GET /api/products/:id) & delete -----
const detailModal = document.getElementById('product-detail-modal')
const detailBody = document.getElementById('product-detail-body')

function renderProductDetail(product) {
  if (!detailBody) return
  const name = escapeHtml(product.name || 'Product')
  const price = product.price != null ? Number(product.price).toFixed(2) : '0.00'
  const category = escapeHtml(product.category || '—')
  const description = escapeHtml(product.description || 'No description')
  const id = escapeHtml(getProductId(product) || '—')
  const imageBlock = productImageMarkup(getProductImageUrl(product), product.name || 'Product')
  detailBody.innerHTML = `
    <div class="product-detail-layout">
      <div class="product-detail-image">${imageBlock}</div>
      <div class="product-detail-meta">
        <p class="product-detail-id"><span>ID</span> ${id}</p>
        <h4 class="product-detail-name">${name}</h4>
        <p class="product-detail-price">$${price}</p>
        <p class="product-detail-category"><span>Category</span> ${category}</p>
        <p class="product-detail-description">${description}</p>
      </div>
    </div>
  `
}

function openDetailModal() {
  if (detailModal) {
    detailModal.classList.add('modal-open')
    detailModal.setAttribute('aria-hidden', 'false')
  }
}

function closeDetailModal() {
  if (detailModal) {
    detailModal.classList.remove('modal-open')
    detailModal.setAttribute('aria-hidden', 'true')
  }
}

async function openProductDetailModal(id) {
  if (!detailBody) return
  detailBody.innerHTML = '<p class="products-empty">Loading product…</p>'
  openDetailModal()
  try {
    const product = await fetchProductById(id)
    renderProductDetail(product)
  } catch (err) {
    const hint = err instanceof Error ? err.message : 'Could not load product'
    detailBody.innerHTML = `<p class="products-empty products-empty-error">${escapeHtml(hint)}</p>`
  }
}

async function handleDeleteProduct(id, button) {
  const name =
    products.find((p) => getProductId(p) === id)?.name || 'this product'
  if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return

  if (button) {
    button.disabled = true
    button.textContent = 'Deleting…'
  }
  try {
    await deleteProductById(id)
    if (detailModal?.classList.contains('modal-open')) closeDetailModal()
    await loadProductsFromApi()
  } catch (err) {
    const hint = err instanceof Error ? err.message : 'Delete failed'
    window.alert(hint)
  } finally {
    if (button) {
      button.disabled = false
      button.textContent = 'Delete'
    }
  }
}

document.getElementById('product-detail-close')?.addEventListener('click', closeDetailModal)
document.getElementById('product-detail-backdrop')?.addEventListener('click', closeDetailModal)

document.getElementById('products-grid')?.addEventListener('click', (e) => {
  if (e.target.closest('#empty-add-product')) {
    showView('products')
    openModal()
    return
  }
  const btn = e.target.closest('[data-action][data-id]')
  if (!btn) return
  const { action, id } = btn.dataset
  if (!id) return
  if (action === 'view') {
    openProductDetailModal(id)
  } else if (action === 'delete') {
    handleDeleteProduct(id, btn)
  }
})

document.getElementById('open-create-product')?.addEventListener('click', () => {
  showView('products')
  openModal()
})
document.getElementById('modal-close')?.addEventListener('click', closeModal)
document.getElementById('modal-backdrop')?.addEventListener('click', closeModal)
document.getElementById('form-cancel')?.addEventListener('click', closeModal)

document.getElementById('product-image')?.addEventListener('change', (e) => {
  revokeProductImagePreview()
  const file = e.target.files?.[0]
  const preview = document.getElementById('product-image-preview')
  const wrap = document.getElementById('product-image-preview-wrap')
  const nameEl = document.getElementById('product-image-filename')
  if (!preview || !wrap) return
  if (!file || !file.type.startsWith('image/')) {
    wrap.hidden = true
    if (nameEl) nameEl.textContent = ''
    return
  }
  if (nameEl) nameEl.textContent = file.name
  previewObjectUrl = URL.createObjectURL(file)
  preview.src = previewObjectUrl
  preview.alt = file.name || 'Selected image preview'
  wrap.hidden = false
  document.getElementById('upload-zone')?.classList.add('upload-zone-has-file')
})

form?.addEventListener('submit', async (e) => {
  e.preventDefault()
  showMessage('')

  const name = document.getElementById('product-name').value.trim()
  const price = parseFloat(document.getElementById('product-price').value)
  const description = document.getElementById('product-description').value.trim()
  const category = document.getElementById('product-category').value.trim()
  const imageFile = document.getElementById('product-image')?.files?.[0]

  if (!imageFile) {
    showMessage('Please choose a product image to upload.', true)
    return
  }

  const submitBtn = document.getElementById('form-submit')
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.textContent = 'Creating…'
  }

  try {
    let uploadedImageUrl = null
    if (submitBtn) submitBtn.textContent = 'Uploading…'
    try {
      const uploadData = await uploadProductImage(imageFile)
      uploadedImageUrl = uploadData.url
    } catch (uploadErr) {
      showMessage(uploadErr instanceof Error ? uploadErr.message : 'Upload failed', true)
      return
    }
    if (submitBtn) submitBtn.textContent = 'Creating…'

    const payload = { name, price, description, category }
    if (uploadedImageUrl) payload.imageUrl = uploadedImageUrl

    await createProduct(payload)
    closeModal()
    await loadProductsFromApi()
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network error'
    showMessage(
      `${detail}. Check that the backend is running and reachable (API: ${API_BASE || 'same origin via proxy'})`,
      true
    )
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.textContent = 'Add Product'
    }
  }
})

// Close modals with Escape
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (detailModal?.classList.contains('modal-open')) closeDetailModal()
  else if (modal?.classList.contains('modal-open')) closeModal()
})

// View switching: home & Products → products, Customers → customers
let currentView = 'products'
const productsSection = document.getElementById('products')
const customersSection = document.getElementById('customers')

function showView(view) {
  currentView = view
  if (detailModal?.classList.contains('modal-open')) closeDetailModal()
  if (modal?.classList.contains('modal-open')) closeModal()
  const showProducts = view === 'products'
  productsSection.classList.toggle('view-hidden', !showProducts)
  productsSection.classList.toggle('view-active', showProducts)
  customersSection.classList.toggle('view-hidden', showProducts)
  customersSection.classList.toggle('view-active', !showProducts)

  document.querySelectorAll('.home-only').forEach((el) => {
    el.classList.toggle('view-hidden', !showProducts)
  })

  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('nav-active', link.dataset.view === view)
  })
}

document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault()
    const view = link.dataset.view
    if (view) showView(view)
  })
})

renderCategoryStrip()

document.getElementById('category-strip')?.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-category]')
  if (!chip) return
  activeCategory = chip.dataset.category || 'all'
  renderCategoryStrip()
  renderProducts()
})

document.getElementById('search-form')?.addEventListener('submit', (e) => {
  e.preventDefault()
  searchQuery = document.getElementById('product-search')?.value.trim() || ''
  renderProducts()
})

document.getElementById('product-search')?.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim()
  renderProducts()
})

let storeInitialized = false

function initStore() {
  if (storeInitialized) {
    loadProductsFromApi()
    return
  }
  storeInitialized = true
  loadProductsFromApi()
  renderCustomers()
}

initAuth()
onAuthReady(() => initStore())
