// ==========================================
// SkillWay - Образовательная платформа
// ПОЛНАЯ ВЕРСИЯ с Supabase (сохраняет весь функционал)
// ==========================================

// Конфигурация Supabase
const SUPABASE_URL = 'https://nrwlxqhkzbvggftyestg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yd2x4cWhremJ2Z2dmdHllc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MjU2MTEsImV4cCI6MjA2NDAwMTYxMX0.6oQ_S_YqLcRa-ykgkWIfRvlRuDywN5no9NnP9Hls1xU'

let currentUser = null
let currentCoursesPage = 1
let currentReviewsPage = 1
let currentReviewFilter = 'all'
let filteredCourses = []
let pendingPayment = null
let appliedPromo = null
let allCourses = []
let allMasterclasses = []
let allReviews = []
let allUsers = []

const COURSES_PER_PAGE = 6
const REVIEWS_PER_PAGE = 5

// Создаём клиент Supabase
let supabaseClient = null

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('SkillWay загружается...')
    
    if (typeof supabase === 'undefined') {
        console.error('Ожидание загрузки Supabase...')
        setTimeout(() => initApp(), 500)
        return
    }
    
    await initApp()
})

async function initApp() {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Загружаем данные
    await loadAllData()
    
    // Проверяем авторизацию
    await checkUserSession()
    
    // Инициализируем UI
    initTheme()
    initMobileMenu()
    initFilters()
    initRatingSelect()
    attachGlobalCardHandler()
    setupEventListeners()
    initScrollHeader()
    
    // Рендерим всё
    await renderAll()
    
    // Убираем прелоадер
    const preloader = document.getElementById('preloader')
    if (preloader) preloader.remove()
}

async function loadAllData() {
    try {
        const [courses, masterclasses, reviews] = await Promise.all([
            supabaseClient.from('courses').select('*'),
            supabaseClient.from('masterclasses').select('*'),
            supabaseClient.from('reviews').select('*').eq('approved', true)
        ])
        
        allCourses = courses.data || []
        allMasterclasses = masterclasses.data || []
        allReviews = reviews.data || []
        
        // Загружаем пользователей для админа
        const { data: users } = await supabaseClient.from('profiles').select('*')
        allUsers = users || []
        
        console.log(`Загружено: ${allCourses.length} курсов, ${allMasterclasses.length} МК, ${allReviews.length} отзывов`)
    } catch (error) {
        console.error('Ошибка загрузки:', error)
    }
}

async function checkUserSession() {
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

async function renderAll() {
    await renderFeaturedCourses()
    await renderAllCourses()
    await renderMasterclasses()
    await renderReviews()
    await renderReviewsSummary()
    renderHeroStats()
    renderAboutStats()
    if (currentUser) await renderProfile()
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
    
    const { data, error } = await supabaseClient.auth.signUp({
        email, password,
        options: { data: { name } }
    })
    
    if (error) {
        showNotification(error.message)
        return
    }
    
    showNotification(`Добро пожаловать, ${name}!`)
    closeModal('registerModal')
    await checkUserSession()
    await renderAll()
    await renderProfile()
}

async function login() {
    const email = document.getElementById('loginEmail').value
    const password = document.getElementById('loginPassword').value
    
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password })
    
    if (error) {
        showNotification('Неверный email или пароль')
        return
    }
    
    await checkUserSession()
    updateAuthUI()
    showNotification(`С возвращением!`)
    closeModal('loginModal')
    await renderAll()
    await renderProfile()
}

async function logout() {
    await supabaseClient.auth.signOut()
    currentUser = null
    updateAuthUI()
    await renderAll()
    showNotification('Вы вышли из аккаунта')
    navigateTo('home')
}

function updateAuthUI() {
    const container = document.getElementById('authBlock')
    if (!container) return
    
    if (currentUser) {
        container.innerHTML = `
            <span class="user-name"><i class="fas fa-user-circle"></i> ${currentUser.name || currentUser.email}</span>
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

// ========== ОТРИСОВКА КУРСОВ (с картинками) ==========
async function renderFeaturedCourses() {
    const container = document.getElementById('featuredCourses')
    if (!container) return
    
    const featured = allCourses.filter(c => c.featured)
    const isAdmin = currentUser?.role === 'admin'
    
    container.innerHTML = featured.map(course => createCourseCard(course, isAdmin)).join('')
}

async function renderAllCourses() {
    const container = document.getElementById('allCourses')
    if (!container) return
    
    filteredCourses = applyFiltersAndSort([...allCourses])
    const start = (currentCoursesPage - 1) * COURSES_PER_PAGE
    const paginated = filteredCourses.slice(start, start + COURSES_PER_PAGE)
    const isAdmin = currentUser?.role === 'admin'
    
    container.innerHTML = paginated.length ? 
        paginated.map(course => createCourseCard(course, isAdmin)).join('') : 
        '<div class="empty-state">Ничего не найдено</div>'
    
    renderCoursesPagination()
}

function createCourseCard(course, isAdmin = false) {
    const discount = course.old_price ? Math.round((1 - course.price / course.old_price) * 100) : 0
    const isFavorite = currentUser?.favorites?.includes(course.id)
    const isEnrolled = currentUser?.enrolled_courses?.includes(course.id)
    
    const icon = {
        'Программирование': 'code',
        'Дизайн': 'pencil-ruler',
        'Маркетинг': 'chart-line',
        'Бизнес': 'briefcase',
        'Data Science': 'chart-bar'
    }[course.category] || 'graduation-cap'
    
    const adminButtons = isAdmin ? `
        <div class="admin-edit-btn" onclick="event.stopPropagation(); openEditCourseModal(${JSON.stringify(course).replace(/"/g, '&quot;')})">
            <i class="fas fa-edit"></i> Ред.
        </div>
        <div class="admin-edit-btn" style="top:48px; background:#dc2626;" onclick="event.stopPropagation(); deleteCourse(${course.id})">
            <i class="fas fa-trash"></i> Уд.
        </div>
    ` : ''
    
    let imageHtml = `<div class="image-fallback"><i class="fas fa-${icon}"></i></div>`
    
    return `
        <div class="course-card" data-type="course" data-id="${course.id}">
            <div class="course-image">
                ${imageHtml}
                ${discount > 0 ? `<span class="course-badge hot">-${discount}%</span>` : ''}
            </div>
            ${adminButtons}
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
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(${course.id})">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>
    `
}

async function renderMasterclasses() {
    const container = document.getElementById('masterclassesGrid')
    if (!container) return
    
    const isAdmin = currentUser?.role === 'admin'
    
    container.innerHTML = allMasterclasses.map(mc => `
        <div class="course-card" data-type="masterclass" data-id="${mc.id}">
            <div class="course-image">
                <div class="image-fallback"><i class="fas fa-chalkboard-user"></i></div>
                <span class="course-badge hot">Мастер-класс</span>
            </div>
            ${isAdmin ? `
                <div class="admin-edit-btn" onclick="event.stopPropagation(); openEditMasterclassModal(${JSON.stringify(mc).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i> Ред.
                </div>
                <div class="admin-edit-btn" style="top:48px; background:#dc2626;" onclick="event.stopPropagation(); deleteMasterclass(${mc.id})">
                    <i class="fas fa-trash"></i> Уд.
                </div>
            ` : ''}
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
        </div>
    `).join('')
}

async function renderReviews() {
    const container = document.getElementById('reviewsGrid')
    if (!container) return
    
    let reviews = [...allReviews]
    
    if (currentReviewFilter !== 'all') {
        const minRating = parseInt(currentReviewFilter)
        reviews = reviews.filter(r => r.rating >= minRating)
    }
    
    const start = (currentReviewsPage - 1) * REVIEWS_PER_PAGE
    const paginated = reviews.slice(start, start + REVIEWS_PER_PAGE)
    
    container.innerHTML = paginated.length ? 
        paginated.map(r => `
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
        `).join('') : 
        '<div class="empty-state">Пока нет отзывов</div>'
    
    renderReviewsPagination(reviews.length)
}

async function renderReviewsSummary() {
    const container = document.getElementById('reviewsSummary')
    if (!container) return
    
    const avg = allReviews.length ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1) : 0
    container.innerHTML = `
        <div>
            <span class="rating-number">${avg}</span>
            <div class="stars">${getStars(avg)}</div>
        </div>
        <div>${allReviews.length} отзывов</div>
    `
}

// ========== ФИЛЬТРЫ И СОРТИРОВКА ==========
function applyFiltersAndSort(courses) {
    const activeCat = document.querySelector('.filter-tab.active')?.dataset.category || 'all'
    const search = document.getElementById('searchInput')?.value.toLowerCase() || ''
    const priceRange = document.getElementById('priceSelect')?.value || 'all'
    const minRating = parseFloat(document.getElementById('ratingSelectFilter')?.value || '0')
    const sortBy = document.getElementById('sortBySelect')?.value || 'default'
    
    let filtered = courses.filter(c => {
        if (activeCat !== 'all' && c.category !== activeCat) return false
        if (search && !c.title.toLowerCase().includes(search) && !c.description.toLowerCase().includes(search)) return false
        if (priceRange !== 'all') {
            if (priceRange === '0-10000' && c.price > 10000) return false
            if (priceRange === '10000-30000' && (c.price < 10000 || c.price > 30000)) return false
            if (priceRange === '30000-50000' && (c.price < 30000 || c.price > 50000)) return false
            if (priceRange === '50000+' && c.price < 50000) return false
        }
        if (c.rating < minRating) return false
        return true
    })
    
    if (sortBy === 'price_asc') filtered.sort((a, b) => a.price - b.price)
    else if (sortBy === 'price_desc') filtered.sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating_desc') filtered.sort((a, b) => b.rating - a.rating)
    else if (sortBy === 'rating_asc') filtered.sort((a, b) => a.rating - b.rating)
    else if (sortBy === 'popular') filtered.sort((a, b) => (b.students || 0) - (a.students || 0))
    
    return filtered
}

function renderCoursesPagination() {
    const totalPages = Math.ceil(filteredCourses.length / COURSES_PER_PAGE)
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

// ========== ИЗБРАННОЕ ==========
async function toggleFavorite(courseId) {
    if (!currentUser) {
        showNotification('Войдите в аккаунт')
        openModal('loginModal')
        return
    }
    
    let favorites = currentUser.favorites || []
    const isFavorite = favorites.includes(courseId)
    
    if (isFavorite) {
        favorites = favorites.filter(id => id !== courseId)
        showNotification('Курс удален из избранного')
    } else {
        favorites.push(courseId)
        showNotification('Курс добавлен в избранное')
    }
    
    await supabaseClient
        .from('profiles')
        .update({ favorites })
        .eq('id', currentUser.id)
    
    currentUser.favorites = favorites
    await renderAllCourses()
    if (document.getElementById('profile-page')?.classList.contains('active')) {
        await renderProfileFavorites()
    }
}

// ========== ЛИЧНЫЙ КАБИНЕТ ==========
async function renderProfile() {
    if (!currentUser) return
    
    document.getElementById('profileAvatar').innerHTML = currentUser.name?.charAt(0) || '?'
    document.getElementById('profileName').textContent = currentUser.name || currentUser.email
    document.getElementById('profileEmail').textContent = currentUser.email
    
    await renderProfileCourses()
    await renderProfileBookings()
    await renderProfileFavorites()
    
    document.getElementById('profileCoursesCount').textContent = currentUser.enrolled_courses?.length || 0
    document.getElementById('profileBookingsCount').textContent = 0
    
    const isAdmin = currentUser.role === 'admin'
    const adminTabBtn = document.getElementById('adminPanelTabBtn')
    if (adminTabBtn) adminTabBtn.style.display = isAdmin ? 'block' : 'none'
}

async function renderProfileCourses() {
    const container = document.getElementById('myCoursesList')
    if (!container) return
    
    const enrolled = allCourses.filter(c => currentUser.enrolled_courses?.includes(c.id))
    
    if (!enrolled.length) {
        container.innerHTML = '<div class="empty-state">У вас пока нет записанных курсов</div>'
        return
    }
    
    container.innerHTML = enrolled.map(course => `
        <div class="profile-list-item">
            <div>
                <h4>${course.title}</h4>
                <p>${course.instructor} • ${course.duration}</p>
                <div class="progress-bar"><div class="progress-fill" style="width:0%"></div></div>
                <span>Прогресс: 0 уроков</span>
            </div>
            <div>
                <span class="course-price">${course.price.toLocaleString()} ₽</span>
                <button class="btn btn-primary btn-sm" onclick="continueCourse(${course.id})">Продолжить</button>
            </div>
        </div>
    `).join('')
}

async function renderProfileBookings() {
    const container = document.getElementById('myBookingsList')
    if (!container) return
    
    const { data: bookings } = await supabaseClient
        .from('bookings')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<div class="empty-state">У вас пока нет записей</div>'
        return
    }
    
    container.innerHTML = bookings.map(b => `
        <div class="profile-list-item">
            <div>
                <h4>${b.type === 'course' ? 'Курс' : 'МК'}: ${b.title}</h4>
                <p>Статус: ${b.status === 'pending' ? 'Ожидает' : 'Подтвержден'}</p>
            </div>
            <div>
                <span class="course-price">${b.price?.toLocaleString() || '—'} ₽</span>
            </div>
        </div>
    `).join('')
}

async function renderProfileFavorites() {
    const container = document.getElementById('myFavoritesList')
    if (!container) return
    
    const favs = allCourses.filter(c => currentUser.favorites?.includes(c.id))
    
    if (!favs.length) {
        container.innerHTML = '<div class="empty-state">Нет избранных курсов</div>'
        return
    }
    
    container.innerHTML = favs.map(c => `
        <div class="profile-list-item">
            <div>
                <h4>${c.title}</h4>
                <p>${c.price.toLocaleString()} ₽</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="openBookingModal(${c.id})">Записаться</button>
            <button class="btn btn-outline btn-sm" onclick="toggleFavorite(${c.id})">Удалить</button>
        </div>
    `).join('')
}

// ========== ЗАПИСЬ НА КУРСЫ ==========
async function openBookingModal(courseId = null) {
    if (!currentUser) {
        showNotification('Войдите в аккаунт')
        openModal('loginModal')
        return
    }
    
    if (courseId) {
        document.getElementById('bookingCourseSelect').value = courseId
    }
    
    document.getElementById('bookingName').value = currentUser.name || ''
    document.getElementById('bookingEmail').value = currentUser.email || ''
    openModal('bookingModal')
}

async function submitBooking(e) {
    e.preventDefault()
    
    const courseId = parseInt(document.getElementById('bookingCourseSelect').value)
    const course = allCourses.find(c => c.id === courseId)
    
    if (!course) {
        showNotification('Выберите курс')
        return
    }
    
    const { error } = await supabaseClient
        .from('bookings')
        .insert([{
            user_id: currentUser.id,
            type: 'course',
            item_id: courseId,
            title: course.title,
            price: course.price,
            status: 'pending'
        }])
    
    if (error) {
        showNotification('Ошибка при записи')
        return
    }
    
    showNotification(`Вы записаны на курс "${course.title}"!`)
    closeModal('bookingModal')
    e.target.reset()
    await renderProfile()
}

async function bookMasterclass(id) {
    if (!currentUser) {
        showNotification('Войдите в аккаунт')
        openModal('loginModal')
        return
    }
    
    const mc = allMasterclasses.find(m => m.id === id)
    if (!mc) return
    
    const { error } = await supabaseClient
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
    await renderProfile()
}

// ========== АДМИН-ПАНЕЛЬ ==========
async function deleteCourse(id) {
    if (!confirm('Удалить курс?')) return
    
    await supabaseClient.from('courses').delete().eq('id', id)
    await loadAllData()
    await renderAllCourses()
    await renderFeaturedCourses()
    showNotification('Курс удален')
}

async function deleteMasterclass(id) {
    if (!confirm('Удалить мастер-класс?')) return
    
    await supabaseClient.from('masterclasses').delete().eq('id', id)
    await loadAllData()
    await renderMasterclasses()
    showNotification('Мастер-класс удален')
}

function openAddCourseModal() {
    document.getElementById('courseModalTitle').innerText = 'Добавить курс'
    document.getElementById('editCourseId').value = ''
    document.getElementById('courseForm').reset()
    openModal('addEditCourseModal')
}

function openEditCourseModal(course) {
    document.getElementById('courseModalTitle').innerText = 'Редактировать курс'
    document.getElementById('editCourseId').value = course.id
    document.getElementById('courseTitle').value = course.title
    document.getElementById('courseCategory').value = course.category
    document.getElementById('courseDesc').value = course.description
    document.getElementById('courseDuration').value = course.duration || ''
    document.getElementById('courseInstructor').value = course.instructor || ''
    document.getElementById('coursePrice').value = course.price
    document.getElementById('courseOldPrice').value = course.old_price || ''
    document.getElementById('courseLongDesc').value = course.long_description || ''
    openModal('addEditCourseModal')
}

async function saveCourse(e) {
    e.preventDefault()
    
    const id = document.getElementById('editCourseId').value
    const courseData = {
        title: document.getElementById('courseTitle').value,
        category: document.getElementById('courseCategory').value,
        description: document.getElementById('courseDesc').value,
        duration: document.getElementById('courseDuration').value,
        instructor: document.getElementById('courseInstructor').value,
        price: parseInt(document.getElementById('coursePrice').value),
        old_price: document.getElementById('courseOldPrice').value ? parseInt(document.getElementById('courseOldPrice').value) : null,
        long_description: document.getElementById('courseLongDesc').value,
        students: 0,
        rating: 0,
        featured: false
    }
    
    if (id) {
        await supabaseClient.from('courses').update(courseData).eq('id', parseInt(id))
    } else {
        await supabaseClient.from('courses').insert([courseData])
    }
    
    await loadAllData()
    await renderAllCourses()
    await renderFeaturedCourses()
    closeModal('addEditCourseModal')
    showNotification('Курс сохранен')
}

function openAddMasterclassModal() {
    document.getElementById('mcModalTitle').innerText = 'Добавить мастер-класс'
    document.getElementById('editMcId').value = ''
    document.getElementById('masterclassForm').reset()
    openModal('addEditMasterclassModal')
}

function openEditMasterclassModal(mc) {
    document.getElementById('mcModalTitle').innerText = 'Редактировать мастер-класс'
    document.getElementById('editMcId').value = mc.id
    document.getElementById('mcTitle').value = mc.title
    document.getElementById('mcDesc').value = mc.description
    document.getElementById('mcDuration').value = mc.duration || ''
    document.getElementById('mcInstructor').value = mc.instructor || ''
    document.getElementById('mcDatetime').value = mc.datetime?.slice(0, 16) || ''
    document.getElementById('mcPrice').value = mc.price
    document.getElementById('mcLongDesc').value = mc.long_description || ''
    openModal('addEditMasterclassModal')
}

async function saveMasterclass(e) {
    e.preventDefault()
    
    const id = document.getElementById('editMcId').value
    const mcData = {
        title: document.getElementById('mcTitle').value,
        description: document.getElementById('mcDesc').value,
        duration: document.getElementById('mcDuration').value,
        instructor: document.getElementById('mcInstructor').value,
        datetime: document.getElementById('mcDatetime').value,
        price: parseInt(document.getElementById('mcPrice').value),
        long_description: document.getElementById('mcLongDesc').value
    }
    
    if (id) {
        await supabaseClient.from('masterclasses').update(mcData).eq('id', parseInt(id))
    } else {
        await supabaseClient.from('masterclasses').insert([mcData])
    }
    
    await loadAllData()
    await renderMasterclasses()
    closeModal('addEditMasterclassModal')
    showNotification('Мастер-класс сохранен')
}

// ========== ОТЗЫВЫ ==========
async function submitReview() {
    const name = document.getElementById('reviewName').value
    const rating = parseInt(document.getElementById('reviewRating').value)
    const text = document.getElementById('reviewText').value
    
    if (!name || !text) {
        showNotification('Заполните все поля')
        return
    }
    
    await supabaseClient
        .from('reviews')
        .insert([{
            user_name: name,
            rating: rating,
            text: text,
            date: new Date().toISOString().split('T')[0],
            approved: true
        }])
    
    await loadAllData()
    await renderReviews()
    await renderReviewsSummary()
    closeModal('reviewModal')
    showNotification('Спасибо за отзыв!')
    document.getElementById('reviewForm').reset()
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

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
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
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
    const link = Array.from(document.querySelectorAll('.nav-link')).find(l => l.getAttribute('onclick')?.includes(page))
    if (link) link.classList.add('active')
    
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    if (page === 'profile' && currentUser) renderProfile()
}

function continueCourse(courseId) {
    showNotification('Продолжение курса (в разработке)')
}

function openDetailModal(type, id) {
    if (type === 'course') {
        const course = allCourses.find(c => c.id === id)
        if (course) {
            showNotification(course.title)
        }
    }
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

function renderAboutStats() {
    const container = document.getElementById('aboutStats')
    if (!container) return
    container.innerHTML = `
        <div class="stat-big"><span class="stat-number">5</span><span>+ лет</span><p>на рынке</p></div>
        <div class="stat-big"><span class="stat-number">120</span><span>+</span><p>экспертов</p></div>
        <div class="stat-big"><span class="stat-number">5000</span><span>+</span><p>выпускников</p></div>
        <div class="stat-big"><span class="stat-number">95</span><span>%</span><p>трудоустройство</p></div>
    `
}

// ========== ИНИЦИАЛИЗАЦИЯ UI ==========
function initFilters() {
    const container = document.getElementById('filterTabs')
    if (!container) return
    
    const cats = ['all', 'Программирование', 'Дизайн', 'Маркетинг', 'Бизнес', 'Data Science']
    const names = { all: 'Все', Программирование: 'Программирование', Дизайн: 'Дизайн', Маркетинг: 'Маркетинг', Бизнес: 'Бизнес', 'Data Science': 'Data Science' }
    
    container.innerHTML = cats.map(c => `<button class="filter-tab ${c === 'all' ? 'active' : ''}" data-category="${c}">${names[c]}</button>`).join('')
    
    document.querySelectorAll('.filter-tab').forEach(t => {
        t.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(tt => tt.classList.remove('active'))
            t.classList.add('active')
            currentCoursesPage = 1
            renderAllCourses()
        })
    })
    
    const search = document.getElementById('searchInput')
    if (search) {
        search.addEventListener('input', () => {
            currentCoursesPage = 1
            renderAllCourses()
        })
    }
    
    const priceSelect = document.getElementById('priceSelect')
    const ratingSelect = document.getElementById('ratingSelectFilter')
    const sortBySelect = document.getElementById('sortBySelect')
    
    if (priceSelect) priceSelect.addEventListener('change', () => { currentCoursesPage = 1; renderAllCourses() })
    if (ratingSelect) ratingSelect.addEventListener('change', () => { currentCoursesPage = 1; renderAllCourses() })
    if (sortBySelect) sortBySelect.addEventListener('change', () => { currentCoursesPage = 1; renderAllCourses() })
    
    document.getElementById('resetFilters')?.addEventListener('click', () => {
        document.querySelector('.filter-tab[data-category="all"]').click()
        if (search) search.value = ''
        if (priceSelect) priceSelect.value = 'all'
        if (ratingSelect) ratingSelect.value = '0'
        if (sortBySelect) sortBySelect.value = 'default'
        currentCoursesPage = 1
        renderAllCourses()
    })
}

function initRatingSelect() {
    const stars = document.querySelectorAll('#ratingSelect span')
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating)
            document.getElementById('reviewRating').value = rating
            stars.forEach((s, i) => {
                if (i < rating) s.classList.add('active')
                else s.classList.remove('active')
            })
        })
    })
}

function initTheme() {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark')
        const themeBtn = document.querySelector('#themeSwitch i')
        if (themeBtn) themeBtn.className = 'fas fa-sun'
    }
    
    document.getElementById('themeSwitch').addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
        if (isDark) {
            document.documentElement.removeAttribute('data-theme')
            localStorage.setItem('theme', 'light')
            document.querySelector('#themeSwitch i').className = 'fas fa-moon'
        } else {
            document.documentElement.setAttribute('data-theme', 'dark')
            localStorage.setItem('theme', 'dark')
            document.querySelector('#themeSwitch i').className = 'fas fa-sun'
        }
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
        if (window.scrollY > 50) header.classList.add('header-scrolled')
        else header.classList.remove('header-scrolled')
    })
}

function attachGlobalCardHandler() {
    document.body.addEventListener('click', (e) => {
        const card = e.target.closest('.course-card')
        if (!card) return
        if (e.target.closest('.btn') || e.target.closest('.favorite-btn') || e.target.closest('.admin-edit-btn')) return
        
        const type = card.dataset.type
        const id = parseInt(card.dataset.id)
        if (type && id) openDetailModal(type, id)
    })
}

function setupEventListeners() {
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', function(e) {
            if (e.target === this) {
                m.style.display = 'none'
                document.body.style.overflow = 'auto'
            }
        })
    })
    
    document.getElementById('loginForm')?.addEventListener('submit', e => { e.preventDefault(); login() })
    document.getElementById('registerForm')?.addEventListener('submit', e => { e.preventDefault(); register() })
    document.getElementById('bookingForm')?.addEventListener('submit', submitBooking)
    document.getElementById('reviewForm')?.addEventListener('submit', e => { e.preventDefault(); submitReview() })
    document.getElementById('courseForm')?.addEventListener('submit', saveCourse)
    document.getElementById('masterclassForm')?.addEventListener('submit', saveMasterclass)
    
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'))
            document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active'))
            this.classList.add('active')
            document.getElementById(`profile${this.dataset.tab.charAt(0).toUpperCase() + this.dataset.tab.slice(1)}Tab`).classList.add('active')
        })
    })
}

// Глобальные функции для HTML
window.navigateTo = navigateTo
window.openModal = openModal
window.closeModal = closeModal
window.openBookingModal = openBookingModal
window.bookMasterclass = bookMasterclass
window.toggleFavorite = toggleFavorite
window.continueCourse = continueCourse
window.openReviewModal = () => openModal('reviewModal')
window.logout = logout
window.openDetailModal = openDetailModal
window.openAddCourseModal = openAddCourseModal
window.openEditCourseModal = openEditCourseModal
window.openAddMasterclassModal = openAddMasterclassModal
window.openEditMasterclassModal = openEditMasterclassModal
window.deleteCourse = deleteCourse
window.deleteMasterclass = deleteMasterclass
window.filterReviews = filterReviews
window.renderAllCourses = renderAllCourses
