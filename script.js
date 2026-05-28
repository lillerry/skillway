// ==========================================
// SkillWay - Образовательная платформа
// Версия с Supabase (полноценный бэкенд)
// ==========================================

import { supabase } from './supabase-config.js'

let currentUser = null;
let currentCoursesPage = 1;
let currentReviewsPage = 1;
let currentReviewFilter = 'all';
let filteredCourses = [];
let pendingPayment = null;
let appliedPromo = null;
let allCourses = [];
let allMasterclasses = [];
let allReviews = [];

const COURSES_PER_PAGE = 6;
const REVIEWS_PER_PAGE = 5;

// ========== ЗАГРУЗКА ДАННЫХ ИЗ SUPABASE ==========

async function loadCourses() {
    const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('id')
    if (error) console.error('Ошибка загрузки курсов:', error)
    return data || []
}

async function loadMasterclasses() {
    const { data, error } = await supabase
        .from('masterclasses')
        .select('*')
        .order('datetime', { ascending: true })
    if (error) console.error('Ошибка загрузки мастер-классов:', error)
    return data || []
}

async function loadReviews() {
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('date', { ascending: false })
    if (error) console.error('Ошибка загрузки отзывов:', error)
    return data || []
}

async function loadCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
    
    return { ...user, ...profile }
}

// ========== АВТОРИЗАЦИЯ ==========

async function register() {
    const name = document.getElementById('regName').value
    const email = document.getElementById('regEmail').value
    const password = document.getElementById('regPassword').value
    
    if (!name || !email || !password) {
        showNotification('Заполните все поля')
        return
    }
    if (password.length < 6) {
        showNotification('Пароль не менее 6 символов')
        return
    }
    
    const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name } }
    })
    
    if (error) {
        showNotification(error.message)
        return
    }
    
    showNotification(`Добро пожаловать, ${name}!`)
    closeModal('registerModal')
    currentUser = await loadCurrentUser()
    updateAuthUI()
    await renderAllCourses()
    renderProfile()
}

async function login() {
    const email = document.getElementById('loginEmail').value
    const password = document.getElementById('loginPassword').value
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
        showNotification('Неверный email или пароль')
        return
    }
    
    currentUser = await loadCurrentUser()
    updateAuthUI()
    showNotification(`С возвращением, ${currentUser.name}!`)
    closeModal('loginModal')
    await renderAllCourses()
    renderProfile()
}

async function logout() {
    await supabase.auth.signOut()
    currentUser = null
    updateAuthUI()
    await renderAllCourses()
    showNotification('Вы вышли из аккаунта')
    navigateTo('home')
}

function updateAuthUI() {
    const container = document.getElementById('authBlock')
    if (!container) return
    
    if (currentUser) {
        container.innerHTML = `
            <span class="user-name"><i class="fas fa-user-circle"></i> ${currentUser.name}</span>
            <button class="btn btn-outline btn-sm" onclick="navigateTo('profile')">Кабинет</button>
            <button class="btn btn-outline btn-sm" onclick="logout()">Выйти</button>
        `
    } else {
        container.innerHTML = `
            <button class="btn btn-outline btn-sm" onclick="openModal('loginModal')">Войти</button>
            <button class="btn btn-primary btn-sm" onclick="openModal('registerModal')">Регистрация</button>
        `
    }
}

// ========== ОТРИСОВКА КУРСОВ ==========

function getStars(rating) {
    let stars = ''
    for (let i = 0; i < 5; i++) {
        stars += i < Math.floor(rating) ? '<i class="fas fa-star"></i>' : 
                  (i < rating ? '<i class="fas fa-star-half-alt"></i>' : '<i class="far fa-star"></i>')
    }
    return stars
}

function escapeHtml(str) {
    if (!str) return ''
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function createCourseCard(course) {
    const discount = course.old_price ? Math.round((1 - course.price / course.old_price) * 100) : 0
    const isEnrolled = currentUser?.enrolled_courses?.includes(course.id)
    
    const icon = {
        'Программирование': 'code',
        'Дизайн': 'pencil-ruler',
        'Маркетинг': 'chart-line',
        'Бизнес': 'briefcase',
        'Data Science': 'chart-bar'
    }[course.category] || 'graduation-cap'
    
    return `
        <div class="course-card" data-type="course" data-id="${course.id}">
            <div class="course-image">
                <div class="image-fallback"><i class="fas fa-${icon}"></i></div>
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
                <div style="margin-top:16px;display:flex;gap:10px;" onclick="event.stopPropagation()">
                    ${isEnrolled ? 
                        `<button class="btn btn-primary btn-block" onclick="continueCourse(${course.id})">Продолжить</button>` : 
                        `<button class="btn btn-primary btn-block" onclick="openBookingModal(${course.id})">Записаться</button>`
                    }
                </div>
            </div>
        </div>
    `
}

async function renderAllCourses() {
    const container = document.getElementById('allCourses')
    if (!container) return
    
    allCourses = await loadCourses()
    let courses = [...allCourses]
    
    // Применяем фильтры
    const activeCat = document.querySelector('.filter-tab.active')?.dataset.category || 'all'
    if (activeCat !== 'all') {
        courses = courses.filter(c => c.category === activeCat)
    }
    
    const search = document.getElementById('searchInput')?.value.toLowerCase() || ''
    if (search) {
        courses = courses.filter(c => c.title.toLowerCase().includes(search))
    }
    
    // Пагинация
    const start = (currentCoursesPage - 1) * COURSES_PER_PAGE
    const paginated = courses.slice(start, start + COURSES_PER_PAGE)
    
    container.innerHTML = paginated.length ? 
        paginated.map(c => createCourseCard(c)).join('') : 
        '<div class="empty-state">Ничего не найдено</div>'
    
    renderCoursesPagination(courses.length)
}

function renderCoursesPagination(total) {
    const totalPages = Math.ceil(total / COURSES_PER_PAGE)
    const container = document.getElementById('coursesPagination')
    if (!container) return
    if (totalPages <= 1) { container.innerHTML = ''; return }
    
    let html = ''
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === currentCoursesPage ? 'active' : ''}" 
                 onclick="currentCoursesPage = ${i}; renderAllCourses();">${i}</button>`
    }
    container.innerHTML = html
}

async function renderMasterclasses() {
    const container = document.getElementById('masterclassesGrid')
    if (!container) return
    
    allMasterclasses = await loadMasterclasses()
    
    container.innerHTML = allMasterclasses.map(mc => `
        <div class="course-card" data-type="masterclass" data-id="${mc.id}">
            <div class="course-image">
                <div class="image-fallback"><i class="fas fa-chalkboard-user"></i></div>
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
                    <button class="btn btn-primary" onclick="bookMasterclass(${mc.id})">Записаться</button>
                </div>
            </div>
        </div>
    `).join('')
}

async function renderReviews() {
    const container = document.getElementById('reviewsGrid')
    if (!container) return
    
    allReviews = await loadReviews()
    let reviews = [...allReviews]
    
    if (currentReviewFilter !== 'all') {
        reviews = reviews.filter(r => r.rating >= parseInt(currentReviewFilter))
    }
    
    const start = (currentReviewsPage - 1) * REVIEWS_PER_PAGE
    const paginated = reviews.slice(start, start + REVIEWS_PER_PAGE)
    
    container.innerHTML = paginated.map(r => `
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
    
    renderReviewsPagination(reviews.length)
}

function renderReviewsPagination(total) {
    const totalPages = Math.ceil(total / REVIEWS_PER_PAGE)
    const container = document.getElementById('reviewsPagination')
    if (!container) return
    if (totalPages <= 1) { container.innerHTML = ''; return }
    
    let html = ''
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === currentReviewsPage ? 'active' : ''}" 
                 onclick="currentReviewsPage = ${i}; renderReviews();">${i}</button>`
    }
    container.innerHTML = html
}

// ========== ЗАПИСЬ И ОПЛАТА ==========

async function openBookingModal(courseId = null) {
    if (!currentUser) {
        showNotification('Войдите в аккаунт')
        openModal('loginModal')
        return
    }
    
    if (courseId) {
        document.getElementById('bookingCourseSelect').value = courseId
    }
    
    document.getElementById('bookingName').value = currentUser.name
    document.getElementById('bookingEmail').value = currentUser.email
    openModal('bookingModal')
}

async function submitBooking(e) {
    e.preventDefault()
    
    const name = document.getElementById('bookingName').value
    const email = document.getElementById('bookingEmail').value
    const phone = document.getElementById('bookingPhone').value
    const courseId = parseInt(document.getElementById('bookingCourseSelect').value)
    
    if (!name || !email || !phone || !courseId) {
        showNotification('Заполните все поля')
        return
    }
    
    const course = allCourses.find(c => c.id === courseId)
    if (!course) return
    
    // Создаем бронирование
    const { data: booking, error } = await supabase
        .from('bookings')
        .insert([{
            user_id: currentUser.id,
            type: 'course',
            item_id: courseId,
            title: course.title,
            price: course.price,
            status: 'pending'
        }])
        .select()
    
    if (error) {
        showNotification('Ошибка при создании заявки')
        return
    }
    
    showNotification('Заявка создана! Скоро с вами свяжутся')
    closeModal('bookingModal')
    e.target.reset()
    renderProfile()
}

async function bookMasterclass(id) {
    if (!currentUser) {
        showNotification('Войдите в аккаунт')
        openModal('loginModal')
        return
    }
    
    const mc = allMasterclasses.find(m => m.id === id)
    if (!mc) return
    
    const { error } = await supabase
        .from('bookings')
        .insert([{
            user_id: currentUser.id,
            type: 'masterclass',
            item_id: id,
            title: mc.title,
            price: mc.price,
            status: 'pending'
        }])
    
    if (error) {
        showNotification('Ошибка при записи')
        return
    }
    
    showNotification(`Вы записаны на "${mc.title}"!`)
    renderProfile()
}

// ========== ЛИЧНЫЙ КАБИНЕТ ==========

async function renderProfile() {
    if (!currentUser) return
    
    document.getElementById('profileAvatar').innerHTML = currentUser.name.charAt(0).toUpperCase()
    document.getElementById('profileName').textContent = currentUser.name
    document.getElementById('profileEmail').textContent = currentUser.email
    
    // Загружаем бронирования пользователя
    const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
    
    const bookingsContainer = document.getElementById('myBookingsList')
    if (bookingsContainer) {
        if (!bookings || bookings.length === 0) {
            bookingsContainer.innerHTML = '<div class="empty-state">У вас пока нет записей</div>'
        } else {
            bookingsContainer.innerHTML = bookings.map(b => `
                <div class="profile-list-item">
                    <div>
                        <h4>${b.type === 'course' ? 'Курс' : 'МК'}: ${b.title}</h4>
                        <p>Статус: ${b.status === 'pending' ? 'Ожидает' : 'Подтвержден'}</p>
                    </div>
                    <div>
                        <span class="course-price">${b.price.toLocaleString()} ₽</span>
                    </div>
                </div>
            `).join('')
        }
    }
    
    document.getElementById('profileCoursesCount').textContent = currentUser.enrolled_courses?.length || 0
    document.getElementById('profileBookingsCount').textContent = bookings?.length || 0
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function showNotification(msg) {
    const notification = document.getElementById('notification')
    const text = document.getElementById('notificationText')
    if (notification && text) {
        text.textContent = msg
        notification.classList.add('show')
        setTimeout(() => notification.classList.remove('show'), 3000)
    }
}

function openModal(modalName) {
    const modal = document.getElementById(modalName)
    if (modal) {
        modal.style.display = 'flex'
        document.body.style.overflow = 'hidden'
    }
}

function closeModal(modalName) {
    const modal = document.getElementById(modalName)
    if (modal) {
        modal.style.display = 'none'
        document.body.style.overflow = 'auto'
    }
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
    document.getElementById(`${page}-page`).classList.add('active')
    
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    if (page === 'profile' && currentUser) renderProfile()
}

function continueCourse(courseId) {
    showNotification('Продолжение курса (в разработке)')
}

function filterReviews(rating) {
    currentReviewFilter = rating
    currentReviewsPage = 1
    renderReviews()
    
    document.querySelectorAll('.review-filter-btn').forEach(btn => {
        if (btn.dataset.filter === rating) btn.classList.add('active')
        else btn.classList.remove('active')
    })
}

async function submitReview() {
    const name = document.getElementById('reviewName').value
    const rating = parseInt(document.getElementById('reviewRating').value)
    const text = document.getElementById('reviewText').value
    
    if (!name || !text) {
        showNotification('Заполните все поля')
        return
    }
    
    const { error } = await supabase
        .from('reviews')
        .insert([{
            user_name: name,
            rating: rating,
            text: text,
            date: new Date().toISOString().split('T')[0]
        }])
    
    if (error) {
        showNotification('Ошибка при отправке отзыва')
        return
    }
    
    showNotification('Спасибо за отзыв!')
    closeModal('reviewModal')
    document.getElementById('reviewForm').reset()
    await renderReviews()
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

async function init() {
    // Загружаем пользователя
    currentUser = await loadCurrentUser()
    updateAuthUI()
    
    // Загружаем и отображаем данные
    await renderAllCourses()
    await renderMasterclasses()
    await renderReviews()
    
    // Инициализируем фильтры и обработчики
    initFilters()
    initMobileMenu()
    initScrollHeader()
    setupEventListeners()
    
    // Убираем прелоадер
    setTimeout(() => {
        const preloader = document.getElementById('preloader')
        if (preloader) preloader.remove()
    }, 500)
}

function initFilters() {
    const searchInput = document.getElementById('searchInput')
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentCoursesPage = 1
            renderAllCourses()
        })
    }
    
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            currentCoursesPage = 1
            renderAllCourses()
        })
    })
}

function initMobileMenu() {
    const toggle = document.getElementById('mobileToggle')
    const menu = document.getElementById('navMenu')
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active')
            menu.classList.toggle('active')
        })
    }
}

function initScrollHeader() {
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header')
        if (window.scrollY > 50) {
            header.classList.add('header-scrolled')
        } else {
            header.classList.remove('header-scrolled')
        }
    })
}

function setupEventListeners() {
    document.getElementById('loginForm')?.addEventListener('submit', e => { e.preventDefault(); login() })
    document.getElementById('registerForm')?.addEventListener('submit', e => { e.preventDefault(); register() })
    document.getElementById('bookingForm')?.addEventListener('submit', submitBooking)
    document.getElementById('reviewForm')?.addEventListener('submit', e => { e.preventDefault(); submitReview() })
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none'
                document.body.style.overflow = 'auto'
            }
        })
    })
    
    // Обработчик кликов по карточкам
    document.body.addEventListener('click', (e) => {
        const card = e.target.closest('.course-card')
        if (!card) return
        if (e.target.closest('.btn')) return
        
        const type = card.dataset.type
        const id = card.dataset.id
        if (type && id) {
            const course = allCourses.find(c => c.id == id)
            if (course) {
                showNotification(`Курс: ${course.title}`)
            }
        }
    })
}

// Запуск
document.addEventListener('DOMContentLoaded', init)

// Глобальные функции для HTML
window.navigateTo = navigateTo
window.openModal = openModal
window.closeModal = closeModal
window.openBookingModal = openBookingModal
window.bookMasterclass = bookMasterclass
window.continueCourse = continueCourse
window.filterReviews = filterReviews
window.openReviewModal = () => openModal('reviewModal')
window.logout = logout
window.renderAllCourses = renderAllCourses