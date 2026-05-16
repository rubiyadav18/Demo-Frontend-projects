import './style.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
// Static image URLs by category (no upload to backend – display only)
const STATIC_IMAGES = {
  Electronics: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
  Accessories: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
  Audio: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
  Bags: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
  Tech: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=400&h=400&fit=crop',
  Home: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop',
  default: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
}

// Product list: static seed + products created via API (with static image)
const staticProducts = [
  { id: 1, name: 'Classic Watch', price: 129, image: STATIC_IMAGES.Accessories, category: 'Accessories' },
  { id: 2, name: 'Wireless Headphones', price: 89, image: STATIC_IMAGES.Audio, category: 'Audio' },
  { id: 3, name: 'Minimal Backpack', price: 79, image: STATIC_IMAGES.Bags, category: 'Bags' },
  { id: 4, name: 'Sunglasses', price: 59, image: STATIC_IMAGES.Accessories, category: 'Accessories' },
  { id: 5, name: 'Smart Speaker', price: 149, image: STATIC_IMAGES.Tech, category: 'Tech' },
  { id: 6, name: 'Desk Lamp', price: 45, image: STATIC_IMAGES.Home, category: 'Home' },
]

let products = [...staticProducts]
let apiProducts = [] // products created via API (backend returns no image; we use static)

// Customer listings with avatars
const customers = [
  { id: 1, name: 'Alex Morgan', role: 'Premium Member', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face' },
  { id: 2, name: 'Jordan Lee', role: 'VIP Customer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
  { id: 3, name: 'Sam Taylor', role: 'Regular Buyer', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
  { id: 4, name: 'Riley Chen', role: 'New Customer', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' },
  { id: 5, name: 'Casey Kim', role: 'Premium Member', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face' },
  { id: 6, name: 'Morgan Davis', role: 'VIP Customer', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face' },
]

function getDisplayProducts() {
  return [...products, ...apiProducts]
}

function getStaticImageForCategory(category) {
  const key = category && STATIC_IMAGES[category] ? category : 'default'
  return STATIC_IMAGES[key]
}

function renderProducts() {
  const grid = document.getElementById('products-grid')
  if (!grid) return
  const list = getDisplayProducts()
  grid.innerHTML = list
    .map(
      (p, i) => {
        const image = p.image || getStaticImageForCategory(p.category)
        const name = p.name || 'Product'
        const price = p.price != null ? p.price : 0
        const category = p.category || 'Product'
        return `
    <article class="product-card animate-in" style="animation-delay: ${i * 0.08}s">
      <div class="product-image-wrap">
        <img src="${image}" alt="${name}" class="product-image" loading="lazy" />
        <span class="product-badge">${category}</span>
      </div>
      <div class="product-info">
        <h3 class="product-name">${name}</h3>
        <p class="product-price">$${Number(price).toFixed(2)}</p>
      </div>
    </article>
  `
      }
    )
    .join('')
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
}

async function uploadProductImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
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

function openCreateProductModal() {
  showView('products')
  openModal()
}

document.getElementById('open-create-product')?.addEventListener('click', openModal)
document.getElementById('nav-open-create-product')?.addEventListener('click', openCreateProductModal)
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
})

form?.addEventListener('submit', async (e) => {
  e.preventDefault()
  showMessage('')

  const name = document.getElementById('product-name').value.trim()
  const price = parseFloat(document.getElementById('product-price').value)
  const description = document.getElementById('product-description').value.trim()
  const category = document.getElementById('product-category').value.trim()
  const imageFile = document.getElementById('product-image')?.files?.[0]

  const payload = { name, price, description, category }
  const submitBtn = document.getElementById('form-submit')
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.textContent = 'Creating…'
  }

  try {
    let uploadedImageUrl = null
    if (imageFile) {
      if (submitBtn) submitBtn.textContent = 'Uploading…'
      try {
        const uploadData = await uploadProductImage(imageFile)
        uploadedImageUrl = uploadData.url
      } catch (uploadErr) {
        showMessage(uploadErr instanceof Error ? uploadErr.message : 'Upload failed', true)
        return
      }
      if (submitBtn) submitBtn.textContent = 'Creating…'
    }

    const res = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
        (rawText ? `Server error (${res.status}): ${rawText.slice(0, 160)}` : `Server error (${res.status})`)
      showMessage(msg, true)
      return
    }

    if (json && json.success && json.data) {
      const created = json.data
      apiProducts.push({
        ...created,
        image: uploadedImageUrl || getStaticImageForCategory(created.category),
      })
      renderProducts()
      closeModal()
    } else {
      showMessage((json && json.message) || 'Unexpected response from server', true)
    }
  } catch (err) {
    showMessage(
      `Network error. Ensure backend is running and VITE_API_URL is correct (current: ${API_BASE || '(empty)'})`,
      true
    )
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.textContent = 'Create Product'
    }
  }
})

// Close modal with Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal?.classList.contains('modal-open')) closeModal()
})

// View switching: home & Products → products, Customers → customers
let currentView = 'products'
const productsSection = document.getElementById('products')
const customersSection = document.getElementById('customers')

function showView(view) {
  currentView = view
  if (modal?.classList.contains('modal-open')) closeModal()
  const showProducts = view === 'products'
  productsSection.classList.toggle('view-hidden', !showProducts)
  productsSection.classList.toggle('view-active', showProducts)
  customersSection.classList.toggle('view-hidden', showProducts)
  customersSection.classList.toggle('view-active', !showProducts)

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

renderProducts()
renderCustomers()
