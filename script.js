// SkillWay - ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ
const SUPABASE_URL = 'https://nrwlxqhkzbvggftyestg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yd2x4cWhremJ2Z2dmdHllc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTcwMDcsImV4cCI6MjA5NTUzMzAwN30._rbBlzZSxyxlIHExKyFVH-k5aPslAdCYINRlW_TOk74'

let supabaseClient = null
let currentUser = null
let allCourses = []
let allMasterclasses = []
let allReviews = []

document.addEventListener('DOMContentLoaded', async function() {
    console.log('SkillWay загружается...')
    
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    await loadAllData()
    await checkUser()
    renderAll()
    
    const preloader = document.getElementById('preloader')
    if (preloader) preloader.style.display = 'none'
})

async function loadAllData() {
    try {
        const [courses, masterclasses, reviews] = await Promise.all([
            supabaseClient.from('courses').select('*'),
            supabaseClient.from('masterclasses').select('*'),
            supabaseClient.from('reviews').select('*')
        ])
        allCourses = courses.data || []
        allMasterclasses = masterclasses.data || []
        allReviews = reviews.data || []
        console.log(`Загружено: ${allCourses.length} курсов, ${allMasterclasses.length} МК, ${allReviews.length} отзывов`)
    } catch (error) {
        console.error('Ошибка загрузки:', error)
    }
}

async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (user) {
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        currentUser = { ...user, ...profile }
    }
    updateAuthUI()
}

function updateAuthUI() {
    const container = document.getElementById('authBlock')
    if (!container) return
    if (currentUser) {
        container.innerHTML = `<span class="user-name"><i class="fas fa-user-circle"></i> ${currentUser.name || currentUser.email}</span>
            <button class="btn btn-outline btn-sm" onclick="navigateTo('profile')">Кабинет</button>
            <button class="btn btn-outline btn-sm" onclick="logout()">Выйти</button>`
    } else {
        container.innerHTML = `<button class="btn btn-outline btn-sm" onclick="openModal('loginModal')">Войти</button>
            <button class="btn btn-primary btn-sm" onclick="openModal('registerModal')">Регистрация</button>`
    }
}

function renderAll() {
    renderCourses()
    renderFeaturedCourses()
    renderMasterclasses()
    renderReviews()
    renderHeroStats()
    if (currentUser) renderProfile()
}

function renderCourses() {
    const container = document.getElementById('allCourses')
    if (!container) return
    if (allCourses.length === 0) {
        container.innerHTML = '<div class="empty-state">Курсов пока нет</div>'
        return
    }
    container.innerHTML = allCourses.map(course => createCourseCard(course)).join('')
}

function renderFeaturedCourses() {
    const container = document.getElementById('featuredCourses')
    if (!container) return
    const featured = allCourses.filter(c => c.featured)
    if (featured.length === 0) return
    container.innerHTML = featured.map(course => createCourseCard(course)).join('')
}

function renderMasterclasses() {
    const container = document.getElementById('masterclassesGrid')
    if (!container) return
    if (allMasterclasses.length === 0) {
        container.innerHTML = '<div class="empty-state">Мастер-классов пока нет</div>'
        return
    }
    container.innerHTML = allMasterclasses.map(mc => createMasterclassCard(mc)).join('')
}

function renderReviews() {
    const container = document.getElementById('reviewsGrid')
    if (!container) return
    if (allReviews.length === 0) {
        container.innerHTML = '<div class="empty-state">Отзывов пока нет</div>'
        return
    }
    container.innerHTML = allReviews.map(r => `
        <div class="review-card">
            <div class="review-header">
                <div>
                    <span class="review-name">${escapeHtml(r.user_name)}</span>
                    <div class="review-date">${r.date}</div>
                </div>
                <div class="review-rating">${getStars(r.rating)}</div>
            </div>
            <p class="review-text">${escapeHtml(r.text)}</p>
        </div>
    `).join('')
    
    // Обновляем сумму отзывов
    const summary = document.getElementById('reviewsSummary')
    if (summary) {
        const avg = allReviews.length ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1) : 0
        summary.innerHTML = `<div><span class="rating-number">${avg}</span><div class="stars">${getStars(avg)}</div></div><div>${allReviews.length} отзывов</div>`
    }
}

function createCourseCard(course) {
    const discount = course.old_price ? Math.round((1 - course.price / course.old_price) * 100) : 0
    const icon = { 'Программирование': 'code', 'Дизайн': 'pencil-ruler', 'Маркетинг': 'chart-line', 'Бизнес': 'briefcase', 'Data Science': 'chart-bar' }[course.category] || 'graduation-cap'
    
    return `<div class="course-card" onclick="openCourseDetail(${course.id})">
        <div class="course-image">
            <div class="image-fallback"><i class="fas fa-${icon} fa-3x"></i></div>
            ${discount > 0 ? `<span class="course-badge hot">-${discount}%</span>` : ''}
        </div>
        <div class="course-content">
            <span class="course-category">${course.category}</span>
            <h3 class="course-title">${escapeHtml(course.title)}</h3>
            <p class="course-description">${escapeHtml(course.description)}</p>
            <div class="course-meta">
                <span><i class="far fa-clock"></i> ${course.duration}</span>
                <span><i class="fas fa-users"></i> ${course.students || 0}</span>
            </div>
            <div class="course-footer">
                <div>
                    <span class="course-price">${course.price.toLocaleString()} ₽</span>
                    ${course.old_price ? `<span class="course-price-old">${course.old_price.toLocaleString()} ₽</span>` : ''}
                </div>
                <div class="stars">${getStars(course.rating)}</div>
            </div>
            <button class="btn btn-primary" style="margin-top:16px; width:100%" onclick="event.stopPropagation(); openBookingModal(${course.id})">Записаться</button>
        </div>
    </div>`
}

function createMasterclassCard(mc) {
    return `<div class="course-card" onclick="openMasterclassDetail(${mc.id})">
        <div class="course-image">
            <div class="image-fallback"><i class="fas fa-chalkboard-user fa-3x"></i></div>
            <span class="course-badge hot">Мастер-класс</span>
        </div>
        <div class="course-content">
            <span class="course-category">Интенсив</span>
            <h3 class="course-title">${escapeHtml(mc.title)}</h3>
            <p class="course-description">${escapeHtml(mc.description)}</p>
            <div class="course-meta">
                <span><i class="far fa-calendar"></i> ${new Date(mc.datetime).toLocaleDateString()}</span>
                <span><i class="fas fa-hourglass-half"></i> ${mc.duration}</span>
            </div>
            <div class="course-footer">
                <span class="course-price">${mc.price.toLocaleString()} ₽</span>
                <button class="btn btn-primary" onclick="event.stopPropagation(); bookMasterclass(${mc.id})">Записаться</button>
            </div>
        </div>
    </div>`
}

function openCourseDetail(id) {
    const course = allCourses.find(c => c.id === id)
    if (!course) return
    
    const modalBody = document.getElementById('detailModalBody')
    if (!modalBody) return
    
    const discount = course.old_price ? Math.round((1 - course.price / course.old_price) * 100) : 0
    
    modalBody.innerHTML = `
        <h2>${escapeHtml(course.title)}</h2>
        <div class="stars" style="margin:10px 0">${getStars(course.rating)} ${course.rating}</div>
        <div class="detail-price" style="font-size:28px; color:var(--primary-dark); font-weight:700; margin:15px 0">
            ${course.price.toLocaleString()} ₽
            ${course.old_price ? `<span style="text-decoration:line-through;color:gray;margin-left:8px;font-size:18px;">${course.old_price.toLocaleString()} ₽</span> <span style="color:#ef4444;font-size:16px;">-${discount}%</span>` : ''}
        </div>
        <div class="detail-meta" style="display:flex; gap:20px; margin:15px 0; padding:15px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border)">
            <div><i class="far fa-clock"></i> ${course.duration}</div>
            <div><i class="fas fa-user-tie"></i> ${course.instructor}</div>
            <div><i class="fas fa-users"></i> ${course.students} студентов</div>
        </div>
        <p style="line-height:1.6">${escapeHtml(course.long_description || course.description)}</p>
        <div class="detail-actions" style="margin-top:30px; display:flex; gap:15px">
            <button class="btn btn-primary" onclick="closeModal('detailModal'); openBookingModal(${course.id})">Записаться на курс</button>
            <button class="btn btn-outline" onclick="closeModal('detailModal')">Закрыть</button>
        </div>
    `
    openModal('detailModal')
}

function openMasterclassDetail(id) {
    const mc = allMasterclasses.find(m => m.id === id)
    if (!mc) return
    
    const modalBody = document.getElementById('detailModalBody')
    if (!modalBody) return
    
    modalBody.innerHTML = `
        <h2>${escapeHtml(mc.title)}</h2>
        <div class="detail-price" style="font-size:28px; color:var(--primary-dark); font-weight:700; margin:15px 0">
            ${mc.price.toLocaleString()} ₽
        </div>
        <div class="detail-meta" style="display:flex; gap:20px; margin:15px 0; padding:15px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border)">
            <div><i class="far fa-calendar"></i> ${new Date(mc.datetime).toLocaleString()}</div>
            <div><i class="fas fa-hourglass-half"></i> ${mc.duration}</div>
            <div><i class="fas fa-user-tie"></i> ${mc.instructor}</div>
        </div>
        <p style="line-height:1.6">${escapeHtml(mc.long_description || mc.description)}</p>
        <div class="detail-actions" style="margin-top:30px; display:flex; gap:15px">
            <button class="btn btn-primary" onclick="closeModal('detailModal'); bookMasterclass(${mc.id})">Записаться</button>
            <button class="btn btn-outline" onclick="closeModal('detailModal')">Закрыть</button>
        </div>
    `
    openModal('detailModal')
}

function renderHeroStats() {
    const container = document.getElementById('heroStats')
    if (!container) return
    container.innerHTML = `
        <div class="hero-stat"><span class="hero-stat-number">${allCourses.length}</span><span class="hero-stat-label">курсов</span></div>
        <div class="hero-stat"><span class="hero-stat-number">5000+</span><span class="hero-stat-label">студентов</span></div>
        <div class="hero-stat"><span class="hero-stat-number">98</span><span class="hero-stat-label">% довольны</span></div>
    `
}

// ========== АВТОРИЗАЦИЯ ==========
async function register() {
    const name = document.getElementById('regName').value
    const email = document.getElementById('regEmail').value
    const password = document.getElementById('regPassword').value
    
    if (!name || !email || !password) { showNotification('Заполните все поля'); return }
    if (password.length < 6) { showNotification('Пароль не менее 6 символов'); return }
    
    const { error } = await supabaseClient.auth.signUp({ email, password, options: { data: { name } } })
    if (error) { showNotification(error.message); return }
    
    showNotification(`Добро пожаловать, ${name}!`)
    closeModal('registerModal')
    await checkUser()
    updateAuthUI()
}

async function login() {
    const email = document.getElementById('loginEmail').value
    const password = document.getElementById('loginPassword').value
    
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password })
    if (error) { showNotification('Неверный email или пароль'); return }
    
    await checkUser()
    updateAuthUI()
    showNotification('Вход выполнен!')
    closeModal('loginModal')
    if (currentUser) renderProfile()
}

async function logout() {
    await supabaseClient.auth.signOut()
    currentUser = null
    updateAuthUI()
    showNotification('Вы вышли из аккаунта')
    navigateTo('home')
}

// ========== ЗАПИСЬ ==========
async function openBookingModal(courseId) {
    if (!currentUser) { showNotification('Войдите в аккаунт'); openModal('loginModal'); return }
    const course = allCourses.find(c => c.id === courseId)
    if (!course) return
    
    const { error } = await supabaseClient.from('bookings').insert([{
        user_id: currentUser.id,
        type: 'course',
        item_id: courseId,
        title: course.title,
        price: course.price,
        status: 'pending'
    }])
    
    if (error) { showNotification('Ошибка при записи'); return }
    showNotification(`Вы записаны на курс "${course.title}"!`)
}

async function bookMasterclass(id) {
    if (!currentUser) { showNotification('Войдите в аккаунт'); openModal('loginModal'); return }
    const mc = allMasterclasses.find(m => m.id === id)
    if (!mc) return
    
    const { error } = await supabaseClient.from('bookings').insert([{
        user_id: currentUser.id,
        type: 'masterclass',
        item_id: id,
        title: mc.title,
        price: mc.price,
        status: 'pending'
    }])
    
    if (error) { showNotification('Ошибка при записи'); return }
    showNotification(`Вы записаны на "${mc.title}"!`)
}

// ========== ПРОФИЛЬ ==========
async function renderProfile() {
    if (!currentUser) return
    
    document.getElementById('profileAvatar').innerHTML = currentUser.name?.charAt(0) || '?'
    document.getElementById('profileName').textContent = currentUser.name || currentUser.email
    document.getElementById('profileEmail').textContent = currentUser.email
    
    const { data: bookings } = await supabaseClient.from('bookings').select('*').eq('user_id', currentUser.id)
    
    const bookingsContainer = document.getElementById('myBookingsList')
    if (bookingsContainer) {
        if (!bookings?.length) {
            bookingsContainer.innerHTML = '<div class="empty-state">У вас пока нет записей</div>'
        } else {
            bookingsContainer.innerHTML = bookings.map(b => `
                <div class="profile-list-item">
                    <div><h4>${b.type === 'course' ? 'Курс' : 'МК'}: ${b.title}</h4><p>Статус: ${b.status === 'pending' ? 'Ожидает' : 'Подтвержден'}</p></div>
                    <div><span class="course-price">${b.price?.toLocaleString()} ₽</span></div>
                </div>
            `).join('')
        }
    }
    
    document.getElementById('profileCoursesCount').textContent = bookings?.filter(b => b.type === 'course').length || 0
    document.getElementById('profileBookingsCount').textContent = bookings?.length || 0
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function getStars(rating) {
    let stars = ''
    for (let i = 0; i < 5; i++) {
        stars += i < Math.floor(rating) ? '<i class="fas fa-star"></i>' : (i < rating ? '<i class="fas fa-star-half-alt"></i>' : '<i class="far fa-star"></i>')
    }
    return stars
}

function escapeHtml(str) {
    if (!str) return ''
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function showNotification(msg) {
    const notification = document.getElementById('notification')
    const text = document.getElementById('notificationText')
    if (notification && text) { text.textContent = msg; notification.classList.add('show'); setTimeout(() => notification.classList.remove('show'), 3000) }
}

function openModal(modalName) { const modal = document.getElementById(modalName); if (modal) { modal.style.display = 'flex'; document.body.style.overflow = 'hidden' } }
function closeModal(modalName) { const modal = document.getElementById(modalName); if (modal) { modal.style.display = 'none'; document.body.style.overflow = 'auto' } }

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
    document.getElementById(`${page}-page`).classList.add('active')
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
    window.scrollTo({ top: 0 })
    if (page === 'profile' && currentUser) renderProfile()
}

// Инициализация фильтров
function initFilters() {
    const container = document.getElementById('filterTabs')
    if (!container) return
    const cats = ['all', 'Программирование', 'Дизайн', 'Маркетинг', 'Бизнес', 'Data Science']
    const names = { all: 'Все', Программирование: 'Программирование', Дизайн: 'Дизайн', Маркетинг: 'Маркетинг', Бизнес: 'Бизнес', 'Data Science': 'Data Science' }
    container.innerHTML = cats.map(c => `<button class="filter-tab ${c === 'all' ? 'active' : ''}" data-category="${c}" onclick="filterByCategory('${c}')">${names[c]}</button>`).join('')
}

function filterByCategory(category) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'))
    document.querySelector(`.filter-tab[data-category="${category}"]`).classList.add('active')
    const container = document.getElementById('allCourses')
    if (!container) return
    if (category === 'all') {
        container.innerHTML = allCourses.map(course => createCourseCard(course)).join('')
    } else {
        const filtered = allCourses.filter(c => c.category === category)
        container.innerHTML = filtered.length ? filtered.map(course => createCourseCard(course)).join('') : '<div class="empty-state">Нет курсов в этой категории</div>'
    }
}

function initTheme() {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); document.querySelector('#themeSwitch i').className = 'fas fa-sun' }
    document.getElementById('themeSwitch').addEventListener('click', () => { const isDark = document.documentElement.getAttribute('data-theme') === 'dark'; if (isDark) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); document.querySelector('#themeSwitch i').className = 'fas fa-moon' } else { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); document.querySelector('#themeSwitch i').className = 'fas fa-sun' } })
}

function initMobileMenu() { const toggle = document.getElementById('mobileToggle'), menu = document.getElementById('navMenu'); if (toggle && menu) toggle.addEventListener('click', () => { toggle.classList.toggle('active'); menu.classList.toggle('active') }) }
function initScrollHeader() { window.addEventListener('scroll', () => { const header = document.getElementById('header'); if (window.scrollY > 50) header.classList.add('header-scrolled'); else header.classList.remove('header-scrolled') }) }

function setupEventListeners() {
    document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', function(e) { if (e.target === this) { m.style.display = 'none'; document.body.style.overflow = 'auto' } }))
    document.getElementById('loginForm')?.addEventListener('submit', e => { e.preventDefault(); login() })
    document.getElementById('registerForm')?.addEventListener('submit', e => { e.preventDefault(); register() })
    document.querySelectorAll('.profile-tab').forEach(tab => { tab.addEventListener('click', function() { document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active')); this.classList.add('active'); document.getElementById(`profile${this.dataset.tab.charAt(0).toUpperCase() + this.dataset.tab.slice(1)}Tab`).classList.add('active') }) })
}

// Запуск
initFilters()
initTheme()
initMobileMenu()
initScrollHeader()
setupEventListeners()

// Глобальные функции
window.navigateTo = navigateTo
window.openModal = openModal
window.closeModal = closeModal
window.openBookingModal = openBookingModal
window.bookMasterclass = bookMasterclass
window.logout = logout
window.openCourseDetail = openCourseDetail
window.openMasterclassDetail = openMasterclassDetail
window.filterByCategory = filterByCategory
window.register = register
window.login = login
window.renderProfile = renderProfile
