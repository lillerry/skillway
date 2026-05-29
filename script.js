// ==========================================
// SkillWay - Образовательная платформа
// С ПОДКЛЮЧЕНИЕМ К SUPABASE
// ==========================================

// ========== ПОДКЛЮЧЕНИЕ К SUPABASE ==========
const SUPABASE_URL = 'https://nrwlxqhkzbvggftyestg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yd2x4cWhremJ2Z2dmdHllc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MjU2MTEsImV4cCI6MjA2NDAwMTYxMX0.6oQ_S_YqLcRa-ykgkWIfRvlRuDywN5no9NnP9Hls1xU'

let supabaseClient = null;
let currentUser = null;
let currentCoursesPage = 1;
let currentReviewsPage = 1;
let currentReviewFilter = 'all';
let filteredCourses = [];
let pendingPayment = null;
let appliedPromo = null;

const COURSES_PER_PAGE = 6;
const REVIEWS_PER_PAGE = 5;

// ========== КАРТИНКИ (ПРЯМЫЕ ССЫЛКИ) ==========
const courseImages = {
    1: "https://raw.githubusercontent.com/lillerry/skillway/main/course-web.jpg",
    2: "https://raw.githubusercontent.com/lillerry/skillway/main/course-design.jpg",
    3: "https://raw.githubusercontent.com/lillerry/skillway/main/course-marketing.jpg",
    4: "https://raw.githubusercontent.com/lillerry/skillway/main/course-python.jpg",
    5: "https://raw.githubusercontent.com/lillerry/skillway/main/course-smm.jpg",
    6: "https://raw.githubusercontent.com/lillerry/skillway/main/course-business.jpg"
};

const masterImages = {
    1: "https://raw.githubusercontent.com/lillerry/skillway/main/master-site.jpg",
    2: "https://raw.githubusercontent.com/lillerry/skillway/main/master-figma.jpg",
    3: "https://raw.githubusercontent.com/lillerry/skillway/main/master-agile.jpg"
};

// ========== ЗАГРУЗКА ИЗ SUPABASE ==========
async function loadFromSupabase() {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Загружаем курсы
        const { data: courses, error: coursesError } = await supabaseClient
            .from('courses')
            .select('*');
        
        if (!coursesError && courses && courses.length > 0) {
            const formattedCourses = courses.map(c => ({
                id: c.id,
                title: c.title,
                category: c.category,
                description: c.description,
                duration: c.duration,
                instructor: c.instructor,
                students: c.students,
                rating: c.rating,
                price: c.price,
                oldPrice: c.old_price,
                featured: c.featured,
                longDescription: c.long_description,
                lessons: c.lessons || ["Урок 1", "Урок 2", "Урок 3"]
            }));
            localStorage.setItem('courses', JSON.stringify(formattedCourses));
            console.log('✅ Курсы загружены из Supabase:', formattedCourses.length);
        }
        
        // Загружаем мастер-классы
        const { data: masterclasses, error: mcError } = await supabaseClient
            .from('masterclasses')
            .select('*');
        
        if (!mcError && masterclasses && masterclasses.length > 0) {
            const formattedMCs = masterclasses.map(m => ({
                id: m.id,
                title: m.title,
                description: m.description,
                duration: m.duration,
                instructor: m.instructor,
                datetime: m.datetime,
                price: m.price,
                longDescription: m.long_description
            }));
            localStorage.setItem('masterclasses', JSON.stringify(formattedMCs));
            console.log('✅ МК загружены из Supabase:', formattedMCs.length);
        }
        
        // Загружаем отзывы
        const { data: reviews, error: reviewsError } = await supabaseClient
            .from('reviews')
            .select('*');
        
        if (!reviewsError && reviews && reviews.length > 0) {
            const formattedReviews = reviews.map(r => ({
                id: r.id,
                userName: r.user_name,
                rating: r.rating,
                text: r.text,
                date: r.date
            }));
            localStorage.setItem('reviews', JSON.stringify(formattedReviews));
            console.log('✅ Отзывы загружены из Supabase:', formattedReviews.length);
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки из Supabase:', error);
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ХРАНИЛИЩА ==========
function initStorage() {
    if (!localStorage.getItem('courses')) {
        // Дефолтные курсы если нет в localStorage
        const defaultCourses = [
            { id: 1, title: "Веб-разработка с нуля", category: "Программирование", description: "Освойте HTML, CSS, JavaScript и React.", duration: "3 месяца", instructor: "Алексей", students: 2847, rating: 4.9, price: 29900, oldPrice: 49900, featured: true, longDescription: "Полный курс по веб-разработке.", lessons: ["Введение", "HTML основы", "CSS стили", "JavaScript", "React", "Финальный проект"] },
            { id: 2, title: "UI/UX дизайн", category: "Дизайн", description: "Изучите Figma, прототипирование.", duration: "2 месяца", instructor: "Мария", students: 2156, rating: 4.8, price: 24900, oldPrice: 39900, featured: true, longDescription: "Курс по UI/UX дизайну.", lessons: ["Figma", "Композиция", "Прототипирование", "Дизайн-системы"] },
            { id: 3, title: "Digital-маркетинг", category: "Маркетинг", description: "SEO, SMM, контекстная реклама.", duration: "2.5 месяца", instructor: "Дмитрий", students: 3521, rating: 4.7, price: 27900, oldPrice: 44900, featured: true, longDescription: "Освойте все каналы digital-маркетинга.", lessons: ["SEO", "Контекстная реклама", "SMM", "Аналитика"] },
            { id: 4, title: "Python для анализа данных", category: "Data Science", description: "Pandas, NumPy, Matplotlib.", duration: "4 месяца", instructor: "Сергей", students: 1892, rating: 4.9, price: 34900, oldPrice: 54900, featured: false, longDescription: "Python для Data Science.", lessons: ["Python основы", "NumPy", "Pandas", "Визуализация"] },
            { id: 5, title: "SMM и продвижение", category: "Маркетинг", description: "Стратегии продвижения в соцсетях.", duration: "1.5 месяца", instructor: "Анна", students: 2634, rating: 4.6, price: 19900, oldPrice: 29900, featured: false, longDescription: "Курс по SMM.", lessons: ["Контент-план", "Таргет", "Работа с блогерами", "Аналитика"] },
            { id: 6, title: "Бизнес-аналитика", category: "Бизнес", description: "Excel, Power BI, SQL.", duration: "3 месяца", instructor: "Павел", students: 1245, rating: 4.8, price: 31900, oldPrice: 49900, featured: false, longDescription: "Навыки бизнес-аналитика.", lessons: ["Excel", "SQL", "Power BI", "Кейсы"] }
        ];
        localStorage.setItem('courses', JSON.stringify(defaultCourses));
    }
    if (!localStorage.getItem('masterclasses')) {
        const defaultMasterclasses = [
            { id: 1, title: "Создание сайта за 3 часа", description: "Практический мастер-класс.", duration: "3 часа", instructor: "Игорь", datetime: "2025-06-20T19:00", price: 2900, longDescription: "Создадите сайт-портфолио за 3 часа." },
            { id: 2, title: "Графический дизайн в Figma", description: "Основы композиции, цвета.", duration: "2 часа", instructor: "Елена", datetime: "2025-06-25T18:30", price: 1900, longDescription: "Создание логотипов и брендбуков." },
            { id: 3, title: "Управление проектами Agile", description: "Методологии Agile, Scrum.", duration: "2.5 часа", instructor: "Дмитрий", datetime: "2025-06-28T20:00", price: 2400, longDescription: "Agile, Scrum, Kanban." }
        ];
        localStorage.setItem('masterclasses', JSON.stringify(defaultMasterclasses));
    }
    if (!localStorage.getItem('reviews')) {
        const defaultReviews = [
            { id: 1, userName: "Анна", rating: 5, text: "После курса нашла работу мечты!", date: "2025-03-15" },
            { id: 2, userName: "Иван", rating: 5, text: "Отличная платформа. Всё структурировано.", date: "2025-03-10" },
            { id: 3, userName: "Мария", rating: 5, text: "Лучшие курсы, которые я проходила!", date: "2025-03-05" }
        ];
        localStorage.setItem('reviews', JSON.stringify(defaultReviews));
    }
    
    const admin = { id: 1, name: "Администратор", email: "admin@skillway.ru", password: "admin123", role: "admin", enrolledCourses: [], favorites: [], lessonProgress: {} };
    const demoUser = { id: 2, name: "Демо Пользователь", email: "demo@skillway.ru", password: "demo123", role: "user", enrolledCourses: [1], favorites: [2], lessonProgress: {1: 2} };
    
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([admin, demoUser]));
    }
    if (!localStorage.getItem('bookings')) localStorage.setItem('bookings', JSON.stringify([]));
    if (!localStorage.getItem('payments')) localStorage.setItem('payments', JSON.stringify([]));
    if (!localStorage.getItem('supportMessages')) localStorage.setItem('supportMessages', JSON.stringify([]));
    if (!localStorage.getItem('usedDiscounts')) localStorage.setItem('usedDiscounts', JSON.stringify({}));
}

function getCourses() { return JSON.parse(localStorage.getItem('courses')); }
function getMasterclasses() { return JSON.parse(localStorage.getItem('masterclasses')); }
function getReviews() { return JSON.parse(localStorage.getItem('reviews')); }
function getUsers() { return JSON.parse(localStorage.getItem('users')); }
function getBookings() { return JSON.parse(localStorage.getItem('bookings')); }
function getPayments() { return JSON.parse(localStorage.getItem('payments')); }
function getSupportMessages() { return JSON.parse(localStorage.getItem('supportMessages')); }

function saveCourses(data) { localStorage.setItem('courses', JSON.stringify(data)); }
function saveMasterclasses(data) { localStorage.setItem('masterclasses', JSON.stringify(data)); }
function saveReviews(data) { localStorage.setItem('reviews', JSON.stringify(data)); }
function saveUsers(data) { localStorage.setItem('users', JSON.stringify(data)); }
function saveBookings(data) { localStorage.setItem('bookings', JSON.stringify(data)); }
function savePayments(data) { localStorage.setItem('payments', JSON.stringify(data)); }
function saveSupportMessages(data) { localStorage.setItem('supportMessages', JSON.stringify(data)); }

function getCourseImage(course) {
    if (course.customImage && course.customImage !== "") return course.customImage;
    return courseImages[course.id] || null;
}

function getMasterclassImage(mc) {
    if (mc.customImage && mc.customImage !== "") return mc.customImage;
    return masterImages[mc.id] || null;
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function getStars(rating) { let s = ''; for(let i = 0; i < 5; i++) s += i < Math.floor(rating) ? '<i class="fas fa-star"></i>' : (i < rating ? '<i class="fas fa-star-half-alt"></i>' : '<i class="far fa-star"></i>'); return s; }

function animateNumbers(elements) {
    elements.forEach(el => {
        const target = parseInt(el.dataset.target);
        if(!target) return;
        let current = 0, inc = target / 50;
        const interval = setInterval(() => { current += inc; if(current >= target) { el.textContent = target; clearInterval(interval); } else el.textContent = Math.floor(current); }, 25);
    });
}

function escapeHtml(str) { if (!str) return ''; return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function formatDatetime(datetimeStr) { if(!datetimeStr) return ''; const d = new Date(datetimeStr); return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`; }

function openModal(modalName) { const modal = document.getElementById(modalName); if(modal){ modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; } }
function closeModal(modalName) { const modal = document.getElementById(modalName); if(modal){ modal.style.display = 'none'; document.body.style.overflow = 'auto'; } }
function showNotification(msg) { const n = document.getElementById('notification'), t = document.getElementById('notificationText'); if(n && t){ t.textContent = msg; n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 3000); } }

// ========== АВТОРИЗАЦИЯ ==========
function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    if(!name || !email || !password) { showNotification('Заполните все поля'); return; }
    if(password.length < 6) { showNotification('Пароль не менее 6 символов'); return; }
    
    let users = getUsers();
    if(users.some(u => u.email === email)) { showNotification('Email уже зарегистрирован'); return; }
    
    const newUser = { id: Date.now(), name, email, password, role: 'user', enrolledCourses: [], favorites: [], lessonProgress: {} };
    users.push(newUser);
    saveUsers(users);
    currentUser = { ...newUser, password: undefined };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showNotification(`Добро пожаловать, ${name}!`);
    closeModal('registerModal');
    updateAuthUI();
    renderAllCourses();
    renderMasterclasses();
    renderProfile();
}

function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if(!user) { showNotification('Неверный email или пароль'); return; }
    currentUser = { ...user, password: undefined };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showNotification(`С возвращением, ${user.name}!`);
    closeModal('loginModal');
    updateAuthUI();
    renderAllCourses();
    renderMasterclasses();
    renderProfile();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    renderAllCourses();
    renderMasterclasses();
    showNotification('Вы вышли из аккаунта');
    navigateTo('home');
}

function updateAuthUI() {
    const c = document.getElementById('authBlock');
    if(!c) return;
    if(currentUser) {
        c.innerHTML = `<span class="user-name"><i class="fas fa-user-circle"></i> ${currentUser.name}</span><button class="btn btn-outline btn-sm" onclick="navigateTo('profile')">Кабинет</button><button class="btn btn-outline btn-sm" onclick="logout()">Выйти</button>`;
    } else {
        c.innerHTML = `<button class="btn btn-outline btn-sm" onclick="openModal('loginModal')">Войти</button><button class="btn btn-primary btn-sm" onclick="openModal('registerModal')">Регистрация</button>`;
    }
}

// ========== ОТКРЫТИЕ ДЕТАЛЕЙ ==========
function openDetailModal(type, id) {
    if (type === 'course') {
        const course = getCourses().find(c => c.id === id);
        if (!course) { showNotification('Курс не найден'); return; }
        const discount = course.oldPrice ? Math.round((1 - course.price / course.oldPrice) * 100) : 0;
        const modalBody = document.getElementById('detailModalBody');
        modalBody.innerHTML = `
            <h2>${escapeHtml(course.title)}</h2>
            <div class="stars">${getStars(course.rating)} ${course.rating}</div>
            <div class="detail-price">${course.price.toLocaleString()} ₽ ${course.oldPrice ? `<span style="text-decoration:line-through;color:gray;margin-left:8px;">${course.oldPrice.toLocaleString()} ₽</span> <span style="color:#ef4444;">-${discount}%</span>` : ''}</div>
            <div class="detail-meta"><div><i class="far fa-clock"></i> ${course.duration}</div><div><i class="fas fa-user-tie"></i> ${course.instructor}</div><div><i class="fas fa-users"></i> ${course.students} студентов</div></div>
            <p>${escapeHtml(course.longDescription)}</p>
            <div class="detail-actions"><button class="btn btn-primary" onclick="closeModal('detailModal'); openBookingModal(${course.id})">Записаться</button><button class="btn btn-outline" onclick="closeModal('detailModal')">Закрыть</button></div>
        `;
        openModal('detailModal');
    }
    if (type === 'masterclass') {
        const mc = getMasterclasses().find(m => m.id === id);
        if (!mc) { showNotification('Мастер-класс не найден'); return; }
        const modalBody = document.getElementById('detailModalBody');
        modalBody.innerHTML = `
            <h2>${escapeHtml(mc.title)}</h2>
            <div class="detail-price">${mc.price.toLocaleString()} ₽</div>
            <div class="detail-meta"><div><i class="far fa-calendar"></i> ${formatDatetime(mc.datetime)}</div><div><i class="fas fa-hourglass-half"></i> ${mc.duration}</div><div><i class="fas fa-user-tie"></i> ${mc.instructor}</div></div>
            <p>${escapeHtml(mc.longDescription)}</p>
            <div class="detail-actions"><button class="btn btn-primary" onclick="closeModal('detailModal'); bookMasterclass(${mc.id})">Записаться</button><button class="btn btn-outline" onclick="closeModal('detailModal')">Закрыть</button></div>
        `;
        openModal('detailModal');
    }
}

// ========== КАРТОЧКИ ==========
function createCourseCard(course, isAdmin = false) {
    const discount = course.oldPrice ? Math.round((1 - course.price / course.oldPrice) * 100) : 0;
    const isFavorite = currentUser && currentUser.favorites?.includes(course.id);
    const isEnrolled = currentUser && currentUser.enrolledCourses?.includes(course.id);
    const adminButtons = isAdmin ? `<div class="admin-edit-btn" onclick="event.stopPropagation(); openEditCourseModal(${JSON.stringify(course).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i> Ред.</div><div class="admin-edit-btn" style="top:48px; background:#dc2626;" onclick="event.stopPropagation(); deleteCourse(${course.id})"><i class="fas fa-trash"></i> Уд.</div>` : '';
    const icon = { 'Программирование': 'code', 'Дизайн': 'pencil-ruler', 'Маркетинг': 'chart-line', 'Бизнес': 'briefcase', 'Data Science': 'chart-bar' }[course.category] || 'graduation-cap';
    const imgUrl = getCourseImage(course);
    let imageHtml = imgUrl ? `<img src="${imgUrl}" alt="${escapeHtml(course.title)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.innerHTML='<div class=\'image-fallback\'><i class=\'fas fa-${icon}\'></i></div>'">` : `<div class="image-fallback"><i class="fas fa-${icon}"></i></div>`;
    
    return `<div class="course-card" data-type="course" data-id="${course.id}"><div class="course-image">${imageHtml}${discount > 0 ? `<span class="course-badge hot">-${discount}%</span>` : ''}</div>${adminButtons}<div class="course-content"><span class="course-category">${course.category}</span><h3 class="course-title">${escapeHtml(course.title)}</h3><p class="course-description">${escapeHtml(course.description)}</p><div class="course-meta"><span><i class="far fa-clock"></i> ${course.duration}</span><span><i class="fas fa-users"></i> ${course.students}</span></div><div class="course-footer"><div><span class="course-price">${course.price.toLocaleString()} ₽</span>${course.oldPrice ? `<span class="course-price-old">${course.oldPrice.toLocaleString()} ₽</span>` : ''}</div><div class="stars">${getStars(course.rating)}</div></div><div style="margin-top:16px;display:flex;gap:10px;" onclick="event.stopPropagation()">${isEnrolled ? `<button class="btn btn-primary btn-block" onclick="continueCourse(${course.id})">Продолжить</button>` : `<button class="btn btn-primary btn-block" onclick="openBookingModal(${course.id})">Записаться</button>`}<button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(${course.id})"><i class="fas fa-heart"></i></button></div></div></div>`;
}

function createMasterclassCard(mc, isAdmin = false) {
    const adminButtons = isAdmin ? `<div class="admin-edit-btn" onclick="event.stopPropagation(); openEditMasterclassModal(${JSON.stringify(mc).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i> Ред.</div><div class="admin-edit-btn" style="top:48px; background:#dc2626;" onclick="event.stopPropagation(); deleteMasterclass(${mc.id})"><i class="fas fa-trash"></i> Уд.</div>` : '';
    const imgUrl = getMasterclassImage(mc);
    let imageHtml = imgUrl ? `<img src="${imgUrl}" alt="${escapeHtml(mc.title)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.innerHTML='<div class=\'image-fallback\'><i class=\'fas fa-chalkboard-user\'></i></div>'">` : `<div class="image-fallback"><i class="fas fa-chalkboard-user"></i></div>`;
    return `<div class="course-card" data-type="masterclass" data-id="${mc.id}"><div class="course-image">${imageHtml}<span class="course-badge hot">Мастер-класс</span></div>${adminButtons}<div class="course-content"><span class="course-category">Интенсив</span><h3 class="course-title">${escapeHtml(mc.title)}</h3><p class="course-description">${escapeHtml(mc.description)}</p><div class="course-meta"><span><i class="far fa-calendar"></i> ${formatDatetime(mc.datetime)}</span><span><i class="fas fa-hourglass-half"></i> ${mc.duration}</span></div><div class="course-footer"><span class="course-price">${mc.price.toLocaleString()} ₽</span><button class="btn btn-primary" onclick="event.stopPropagation(); bookMasterclass(${mc.id})">Записаться</button></div></div></div>`;
}

// ========== ОТРИСОВКА ==========
function renderFeaturedCourses() { 
    const container = document.getElementById('featuredCourses'); 
    if(container) { 
        const featured = getCourses().filter(c => c.featured === true); 
        const isAdmin = currentUser && currentUser.email === 'admin@skillway.ru';
        container.innerHTML = featured.map(course => createCourseCard(course, isAdmin)).join(''); 
    } 
}

function renderAllCourses() { 
    const container = document.getElementById('allCourses'); 
    if(!container) return; 
    let courses = getCourses(); 
    filteredCourses = applyFiltersAndSort(courses); 
    const start = (currentCoursesPage - 1) * COURSES_PER_PAGE; 
    const paginated = filteredCourses.slice(start, start + COURSES_PER_PAGE); 
    const isAdmin = currentUser && currentUser.email === 'admin@skillway.ru'; 
    container.innerHTML = paginated.length ? paginated.map(crs => createCourseCard(crs, isAdmin)).join('') : '<div class="empty-state">Ничего не найдено</div>'; 
    renderCoursesPagination(); 
}

function renderCoursesPagination() { 
    const totalPages = Math.ceil(filteredCourses.length / COURSES_PER_PAGE); 
    const container = document.getElementById('coursesPagination'); 
    if(!container) return; 
    if(totalPages <= 1) { container.innerHTML = ''; return; } 
    let html = ''; 
    for(let i = 1; i <= totalPages; i++) html += `<button class="${i === currentCoursesPage ? 'active' : ''}" onclick="currentCoursesPage = ${i}; renderAllCourses();">${i}</button>`; 
    container.innerHTML = html; 
}

function renderMasterclasses() { 
    const container = document.getElementById('masterclassesGrid'); 
    if(container) { 
        const mcs = [...getMasterclasses()].sort((a, b) => new Date(a.datetime) - new Date(b.datetime)); 
        const isAdmin = currentUser && currentUser.email === 'admin@skillway.ru'; 
        container.innerHTML = mcs.map(mc => createMasterclassCard(mc, isAdmin)).join(''); 
    } 
}

function renderReviews() {
    const container = document.getElementById('reviewsGrid');
    if(!container) return;
    let rev = getReviews();
    if (currentReviewFilter !== 'all') { const minRating = parseInt(currentReviewFilter); rev = rev.filter(r => r.rating >= minRating); }
    const start = (currentReviewsPage - 1) * REVIEWS_PER_PAGE;
    const paginated = rev.slice(start, start + REVIEWS_PER_PAGE);
    container.innerHTML = paginated.length ? paginated.map(r => `<div class="review-card"><div class="review-header"><div><span class="review-name">${escapeHtml(r.userName)}</span><div class="review-date">${r.date}</div></div><div class="review-rating">${getStars(r.rating)}</div></div><p class="review-text">${escapeHtml(r.text)}</p></div>`).join('') : '<div class="empty-state">Пока нет отзывов с таким рейтингом</div>';
    renderReviewsPagination(rev.length);
}

function renderReviewsPagination(total) { 
    const totalPages = Math.ceil(total / REVIEWS_PER_PAGE); 
    const container = document.getElementById('reviewsPagination'); 
    if(!container) return; 
    if(totalPages <= 1) { container.innerHTML = ''; return; } 
    let html = ''; 
    for(let i = 1; i <= totalPages; i++) html += `<button class="${i === currentReviewsPage ? 'active' : ''}" onclick="currentReviewsPage = ${i}; renderReviews();">${i}</button>`; 
    container.innerHTML = html; 
}

function renderReviewsSummary() { 
    const container = document.getElementById('reviewsSummary'); 
    if(!container) return; 
    const rev = getReviews(); 
    const avg = rev.length ? (rev.reduce((s, r) => s + r.rating, 0) / rev.length).toFixed(1) : 0; 
    container.innerHTML = `<div><span class="rating-number">${avg}</span><div class="stars">${getStars(avg)}</div></div><div>${rev.length} отзывов</div>`; 
}

function renderHeroStats() { 
    const container = document.getElementById('heroStats'); 
    if(!container) return; 
    const coursesCount = getCourses().length; 
    const usersCount = getUsers().length + 5000; 
    container.innerHTML = `<div class="hero-stat"><span class="hero-stat-number" data-target="${coursesCount}">0</span><span class="hero-stat-label">курсов</span></div><div class="hero-stat"><span class="hero-stat-number" data-target="${usersCount}">0</span><span class="hero-stat-label">студентов</span></div><div class="hero-stat"><span class="hero-stat-number" data-target="98">0</span><span class="hero-stat-label">% довольны</span></div>`; 
    animateNumbers(document.querySelectorAll('.hero-stat-number')); 
}

function renderAboutStats() { 
    const container = document.getElementById('aboutStats'); 
    if(!container) return; 
    container.innerHTML = `<div class="stat-big"><span class="stat-number" data-target="5">0</span><span>+ лет</span><p>на рынке</p></div><div class="stat-big"><span class="stat-number" data-target="120">0</span><span>+</span><p>экспертов</p></div><div class="stat-big"><span class="stat-number" data-target="5000">0</span><span>+</span><p>выпускников</p></div><div class="stat-big"><span class="stat-number" data-target="95">0</span><span>%</span><p>трудоустройство</p></div>`; 
    animateNumbers(document.querySelectorAll('.stat-number')); 
}

function applyFiltersAndSort(courses) {
    const activeCat = document.querySelector('.filter-tab.active')?.dataset.category || 'all';
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const priceRange = document.getElementById('priceSelect')?.value || 'all';
    const minRating = parseFloat(document.getElementById('ratingSelectFilter')?.value || '0');
    const sortBy = document.getElementById('sortBySelect')?.value || 'default';
    
    let filtered = courses.filter(c => {
        if(activeCat !== 'all' && c.category !== activeCat) return false;
        if(search && !c.title.toLowerCase().includes(search) && !c.description.toLowerCase().includes(search)) return false;
        if(priceRange !== 'all') {
            if(priceRange === '0-10000' && c.price > 10000) return false;
            if(priceRange === '10000-30000' && (c.price < 10000 || c.price > 30000)) return false;
            if(priceRange === '30000-50000' && (c.price < 10000 || c.price > 50000)) return false;
            if(priceRange === '50000+' && c.price < 50000) return false;
        }
        if(c.rating < minRating) return false;
        return true;
    });
    if(sortBy === 'price_asc') filtered.sort((a, b) => a.price - b.price);
    else if(sortBy === 'price_desc') filtered.sort((a, b) => b.price - a.price);
    else if(sortBy === 'rating_asc') filtered.sort((a, b) => a.rating - b.rating);
    else if(sortBy === 'rating_desc') filtered.sort((a, b) => b.rating - a.rating);
    else if(sortBy === 'popular') filtered.sort((a, b) => b.students - a.students);
    return filtered;
}

// ========== ЛИЧНЫЙ КАБИНЕТ ==========
function renderProfile() {
    if(!currentUser) return;
    document.getElementById('profileAvatar').innerHTML = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    renderProfileCourses();
    renderProfileBookings();
    renderProfileFavorites();
    document.getElementById('profileCoursesCount').textContent = currentUser.enrolledCourses?.length || 0;
    document.getElementById('profileBookingsCount').textContent = getBookings().filter(b => b.userId === currentUser.id).length;
    const isAdmin = currentUser.email === 'admin@skillway.ru';
    const adminTabBtn = document.getElementById('adminPanelTabBtn');
    if(adminTabBtn) adminTabBtn.style.display = isAdmin ? 'block' : 'none';
}

function renderProfileCourses() { 
    const container = document.getElementById('myCoursesList'); 
    if(!container) return; 
    const enrolled = getCourses().filter(crs => currentUser.enrolledCourses?.includes(crs.id)); 
    if(!enrolled.length) { container.innerHTML = '<div class="empty-state">У вас пока нет записанных курсов</div>'; return; } 
    container.innerHTML = enrolled.map(crs => { 
        const progress = currentUser.lessonProgress?.[crs.id] || 0; 
        const total = crs.lessons?.length || 1; 
        const percent = (progress / total) * 100; 
        return `<div class="profile-list-item"><div><h4>${crs.title}</h4><p>${crs.instructor} • ${crs.duration}</p><div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div><span>Прогресс: ${progress}/${total} уроков</span></div><div><span class="course-price">${crs.price.toLocaleString()} ₽</span><button class="btn btn-primary btn-sm" onclick="continueCourse(${crs.id})">Продолжить</button>${progress === total ? `<button class="btn btn-outline btn-sm" onclick="generateCertificate('${crs.title}')">Сертификат</button>` : ''}</div></div>`; 
    }).join(''); 
}

function renderProfileBookings() { 
    const container = document.getElementById('myBookingsList'); 
    if(!container) return; 
    const bookings = getBookings().filter(b => b.userId === currentUser.id); 
    if(!bookings.length) { container.innerHTML = '<div class="empty-state">У вас пока нет записей</div>'; return; } 
    container.innerHTML = bookings.map(b => { 
        const payment = getPayments().find(p => p.bookingId === b.id); 
        const status = payment?.status === 'paid' ? 'Оплачено' : 'Ожидает оплаты'; 
        return `<div class="profile-list-item"><div><h4>${b.type === 'course' ? 'Курс' : 'МК'}: ${b.title}</h4><p>Дата: ${b.date || 'уточняется'} • ${status}</p></div><div><span class="course-price">${b.price?.toLocaleString() || '—'} ₽</span>${payment?.status !== 'paid' ? `<button class="btn btn-primary btn-sm" onclick="initiatePayment(${b.id}, '${b.type}', ${b.itemId}, '${b.title}', ${b.price})">Оплатить</button>` : ''}</div></div>`; 
    }).join(''); 
}

function renderProfileFavorites() { 
    const container = document.getElementById('myFavoritesList'); 
    if(!container) return; 
    const favs = getCourses().filter(c => currentUser.favorites?.includes(c.id)); 
    if(!favs.length) { container.innerHTML = '<div class="empty-state">Нет избранных курсов</div>'; return; } 
    container.innerHTML = favs.map(c => `<div class="profile-list-item"><div><h4>${c.title}</h4><p>${c.price.toLocaleString()} ₽</p></div><button class="btn btn-primary btn-sm" onclick="openBookingModal(${c.id})">Записаться</button><button class="btn btn-outline btn-sm" onclick="toggleFavorite(${c.id})">Удалить</button></div>`).join(''); 
}

// ========== ЗАПИСЬ И ОПЛАТА ==========
function openBookingModal(courseId = null) {
    if(!currentUser) { showNotification('Войдите в аккаунт'); openModal('loginModal'); return; }
    const s = document.getElementById('bookingCourseSelect');
    if(s && courseId) s.value = courseId;
    document.getElementById('bookingName').value = currentUser.name;
    document.getElementById('bookingEmail').value = currentUser.email;
    openModal('bookingModal');
}

function bookMasterclass(id) {
    if(!currentUser) { showNotification('Войдите в аккаунт'); openModal('loginModal'); return; }
    const mc = getMasterclasses().find(m => m.id === id);
    const bookings = getBookings();
    const booking = { id: Date.now(), userId: currentUser.id, type: 'masterclass', itemId: id, title: mc.title, date: formatDatetime(mc.datetime), price: mc.price, status: 'pending' };
    bookings.push(booking);
    saveBookings(bookings);
    const payments = getPayments();
    payments.push({ id: Date.now(), bookingId: booking.id, amount: mc.price, status: 'pending' });
    savePayments(payments);
    showNotification(`Заявка на "${mc.title}" создана. Оплатите для подтверждения.`);
    initiatePayment(booking.id, 'masterclass', id, mc.title, mc.price);
}

function initiatePayment(bookingId, type, itemId, title, amount) {
    appliedPromo = null;
    const promoInput = document.getElementById('promoCodeInput');
    if (promoInput) promoInput.value = '';
    pendingPayment = { bookingId, type, itemId, title, amount };
    const courseInfo = document.getElementById('paymentCourseInfo');
    if (courseInfo) courseInfo.innerHTML = `<strong>${escapeHtml(title)}</strong><br>Стоимость: ${amount.toLocaleString()} ₽`;
    updatePriceBreakdown();
    const promoBody = document.getElementById('promoBody');
    const toggleBtn = document.getElementById('promoToggleBtn');
    if (promoBody?.classList.contains('open')) {
        promoBody.classList.remove('open');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
    }
    openModal('paymentModal');
}

function updatePriceBreakdown() {
    if (!pendingPayment) return;
    const originalAmount = pendingPayment.amount;
    let discountAmount = 0;
    let finalAmount = originalAmount;
    if (appliedPromo) {
        discountAmount = (originalAmount * appliedPromo.discountPercent) / 100;
        if (discountAmount > appliedPromo.maxDiscount) discountAmount = appliedPromo.maxDiscount;
        finalAmount = originalAmount - discountAmount;
    }
    const breakdownHtml = `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>Стоимость курса:</span><span>${originalAmount.toLocaleString()} ₽</span></div>${appliedPromo ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #059669;"><span>Скидка (${appliedPromo.discountPercent}%):</span><span>- ${discountAmount.toLocaleString()} ₽</span></div><div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--border); font-weight: 700;"><span>Итого к оплате:</span><span style="color: var(--primary-dark); font-size: 20px;">${finalAmount.toLocaleString()} ₽</span></div>` : `<div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--border); font-weight: 700;"><span>Итого к оплате:</span><span style="color: var(--primary-dark); font-size: 20px;">${finalAmount.toLocaleString()} ₽</span></div>`}`;
    const priceBreakdown = document.getElementById('priceBreakdown');
    if (priceBreakdown) priceBreakdown.innerHTML = breakdownHtml;
    pendingPayment.finalAmount = finalAmount;
    pendingPayment.discountAmount = discountAmount;
    pendingPayment.appliedPromo = appliedPromo;
}

// ========== ПРОМОКОДЫ ==========
function applyPromoCode() {
    if (!pendingPayment) { 
        showNotification('Сначала выберите курс для оплаты'); 
        return; 
    }
    
    const promoInput = document.getElementById('promoCodeInput');
    const promoCode = promoInput.value.trim().toUpperCase();
    
    if (!promoCode) { 
        showNotification('Введите промокод'); 
        return; 
    }
    
    const promos = {
        "WELCOME10": 10,
        "SKILLWAY20": 20
    };
    
    if (!promos[promoCode]) { 
        showNotification('Промокод не найден'); 
        return; 
    }
    
    const discountPercent = promos[promoCode];
    const discountAmount = (pendingPayment.amount * discountPercent) / 100;
    const finalAmount = pendingPayment.amount - discountAmount;
    
    appliedPromo = { 
        code: promoCode, 
        discountPercent: discountPercent,
        maxDiscount: promoCode === "WELCOME10" ? 5000 : 10000
    };
    
    document.getElementById('priceBreakdown').innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Стоимость курса:</span>
            <span>${pendingPayment.amount.toLocaleString()} ₽</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #059669;">
            <span>Скидка (${discountPercent}%):</span>
            <span>- ${Math.min(discountAmount, appliedPromo.maxDiscount).toLocaleString()} ₽</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--border); font-weight: 700;">
            <span>Итого к оплате:</span>
            <span style="color: var(--primary-dark); font-size: 20px;">${Math.max(0, finalAmount).toLocaleString()} ₽</span>
        </div>
    `;
    
    pendingPayment.finalAmount = Math.max(0, finalAmount);
    pendingPayment.discountAmount = Math.min(discountAmount, appliedPromo.maxDiscount);
    pendingPayment.appliedPromo = appliedPromo;
    
    showNotification(`Промокод ${promoCode} применен! Скидка ${discountPercent}%`);
}

function processPayment() {
    if (!pendingPayment) return;
    const finalAmount = pendingPayment.finalAmount || pendingPayment.amount;
    const payments = getPayments();
    const existing = payments.find(p => p.bookingId === pendingPayment.bookingId);
    if(existing) {
        existing.status = 'paid';
        existing.amount = finalAmount;
        existing.discountAmount = pendingPayment.discountAmount;
        existing.appliedPromo = pendingPayment.appliedPromo;
    } else {
        payments.push({ id: Date.now(), bookingId: pendingPayment.bookingId, amount: finalAmount, originalAmount: pendingPayment.amount, discountAmount: pendingPayment.discountAmount, appliedPromo: pendingPayment.appliedPromo, status: 'paid', paidAt: new Date().toISOString() });
    }
    savePayments(payments);
    showNotification(`Оплата ${finalAmount.toLocaleString()} ₽ прошла успешно!`);
    if(pendingPayment.type === 'course') {
        if(!currentUser.enrolledCourses.includes(pendingPayment.itemId)) {
            currentUser.enrolledCourses.push(pendingPayment.itemId);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            let users = getUsers();
            const idx = users.findIndex(u => u.id === currentUser.id);
            if(idx !== -1) users[idx] = { ...users[idx], ...currentUser };
            saveUsers(users);
        }
        showNotification(`Вы записаны на курс "${pendingPayment.title}"`);
    }
    closeModal('paymentModal');
    pendingPayment = null;
    appliedPromo = null;
    renderProfile();
    renderAllCourses();
}

function continueCourse(courseId) { showNotification(`Продолжение курса (функция в разработке)`); }
function generateCertificate(courseTitle) {
    const modalBody = document.getElementById('certificateContent');
    const date = new Date().toLocaleDateString();
    modalBody.innerHTML = `<div style="text-align:center;padding:30px;border:2px solid var(--primary-dark);border-radius:20px;"><h2 style="color:var(--primary-dark);">Сертификат</h2><p>Настоящим подтверждается, что</p><h3>${currentUser.name}</h3><p>успешно завершил(а) курс</p><h3>«${courseTitle}»</h3><p>Дата: ${date}</p><button class="btn btn-primary" onclick="window.print()">Сохранить PDF</button></div>`;
    openModal('certificateModal');
}
function toggleFavorite(courseId) {
    if(!currentUser) { showNotification('Войдите в аккаунт'); openModal('loginModal'); return; }
    let favorites = [...(currentUser.favorites || [])];
    const idx = favorites.indexOf(courseId);
    if(idx === -1) { favorites.push(courseId); showNotification('Курс добавлен в избранное'); }
    else { favorites.splice(idx, 1); showNotification('Курс удален из избранного'); }
    currentUser.favorites = favorites;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    let users = getUsers();
    const userIdx = users.findIndex(u => u.id === currentUser.id);
    if(userIdx !== -1) users[userIdx] = { ...users[userIdx], favorites };
    saveUsers(users);
    renderAllCourses();
    if(document.getElementById('profile-page')?.classList.contains('active')) renderProfileFavorites();
}

// ========== АДМИН-ПАНЕЛЬ ==========
function openAddCourseModal() {
    document.getElementById('courseModalTitle').innerText = 'Добавить курс';
    document.getElementById('editCourseId').value = '';
    document.getElementById('courseForm').reset();
    document.getElementById('courseImage').value = '';
    openModal('addEditCourseModal');
}

function openEditCourseModal(course) {
    document.getElementById('courseModalTitle').innerText = 'Редактировать курс';
    document.getElementById('editCourseId').value = course.id;
    document.getElementById('courseTitle').value = course.title;
    document.getElementById('courseCategory').value = course.category;
    document.getElementById('courseDesc').value = course.description;
    document.getElementById('courseDuration').value = course.duration;
    document.getElementById('courseInstructor').value = course.instructor;
    document.getElementById('coursePrice').value = course.price;
    document.getElementById('courseOldPrice').value = course.oldPrice || '';
    document.getElementById('courseLongDesc').value = course.longDescription || '';
    document.getElementById('courseImage').value = course.customImage || '';
    openModal('addEditCourseModal');
}

function saveCourse(e) {
    e.preventDefault();
    const id = document.getElementById('editCourseId').value;
    const title = document.getElementById('courseTitle').value;
    const category = document.getElementById('courseCategory').value;
    const description = document.getElementById('courseDesc').value;
    const duration = document.getElementById('courseDuration').value;
    const instructor = document.getElementById('courseInstructor').value;
    const price = parseInt(document.getElementById('coursePrice').value);
    const oldPrice = document.getElementById('courseOldPrice').value ? parseInt(document.getElementById('courseOldPrice').value) : null;
    const longDescription = document.getElementById('courseLongDesc').value;
    const customImage = document.getElementById('courseImage').value;
    
    const courses = getCourses();
    
    if (id) {
        const idx = courses.findIndex(c => c.id == id);
        if (idx !== -1) {
            courses[idx] = { ...courses[idx], title, category, description, duration, instructor, price, oldPrice, longDescription, customImage };
        }
    } else {
        const newId = Math.max(...courses.map(c => c.id), 0) + 1;
        courses.push({ 
            id: newId, title, category, description, duration, instructor, 
            students: 0, rating: 0, price, oldPrice, featured: false, 
            longDescription, lessons: ["Урок 1", "Урок 2", "Урок 3"], 
            customImage: customImage || null 
        });
    }
    
    saveCourses(courses);
    renderAllCourses();
    renderFeaturedCourses();
    closeModal('addEditCourseModal');
    showNotification('Курс сохранён');
}

function openAddMasterclassModal() {
    document.getElementById('mcModalTitle').innerText = 'Добавить мастер-класс';
    document.getElementById('editMcId').value = '';
    document.getElementById('masterclassForm').reset();
    document.getElementById('mcImage').value = '';
    openModal('addEditMasterclassModal');
}

function openEditMasterclassModal(mc) {
    document.getElementById('mcModalTitle').innerText = 'Редактировать мастер-класс';
    document.getElementById('editMcId').value = mc.id;
    document.getElementById('mcTitle').value = mc.title;
    document.getElementById('mcDesc').value = mc.description;
    document.getElementById('mcDuration').value = mc.duration;
    document.getElementById('mcInstructor').value = mc.instructor;
    document.getElementById('mcDatetime').value = mc.datetime;
    document.getElementById('mcPrice').value = mc.price;
    document.getElementById('mcLongDesc').value = mc.longDescription || '';
    document.getElementById('mcImage').value = mc.customImage || '';
    openModal('addEditMasterclassModal');
}

function saveMasterclass(e) {
    e.preventDefault();
    const id = document.getElementById('editMcId').value;
    const title = document.getElementById('mcTitle').value;
    const description = document.getElementById('mcDesc').value;
    const duration = document.getElementById('mcDuration').value;
    const instructor = document.getElementById('mcInstructor').value;
    const datetime = document.getElementById('mcDatetime').value;
    const price = parseInt(document.getElementById('mcPrice').value);
    const longDescription = document.getElementById('mcLongDesc').value;
    const customImage = document.getElementById('mcImage').value;
    
    const mcs = getMasterclasses();
    
    if (id) {
        const idx = mcs.findIndex(m => m.id == id);
        if (idx !== -1) {
            mcs[idx] = { ...mcs[idx], title, description, duration, instructor, datetime, price, longDescription, customImage };
        }
    } else {
        const newId = Math.max(...mcs.map(m => m.id), 0) + 1;
        mcs.push({ id: newId, title, description, duration, instructor, datetime, price, longDescription, customImage: customImage || null });
    }
    
    saveMasterclasses(mcs);
    renderMasterclasses();
    closeModal('addEditMasterclassModal');
    showNotification('Мастер-класс сохранён');
}

function deleteCourse(id) {
    if (!confirm('Удалить курс?')) return;
    let courses = getCourses();
    courses = courses.filter(c => c.id !== id);
    saveCourses(courses);
    renderAllCourses();
    renderFeaturedCourses();
    showNotification('Курс удалён');
}

function deleteMasterclass(id) {
    if (!confirm('Удалить мастер-класс?')) return;
    let mcs = getMasterclasses();
    mcs = mcs.filter(m => m.id !== id);
    saveMasterclasses(mcs);
    renderMasterclasses();
    showNotification('Мастер-класс удалён');
}

function openFullAdminPanel() {
    navigateTo('admin');
    renderAdminPanel();
}

function renderAdminPanel() {
    if (!currentUser || currentUser.email !== 'admin@skillway.ru') return;
    
    const courses = getCourses();
    const mcs = getMasterclasses();
    const users = getUsers();
    const payments = getPayments();
    const totalRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
    
    document.getElementById('adminTotalStudents').innerText = users.length;
    document.getElementById('adminTotalRevenue').innerText = totalRevenue.toLocaleString() + ' ₽';
    document.getElementById('adminTotalCourses').innerText = courses.length;
    document.getElementById('adminTotalMasterclasses').innerText = mcs.length;
    
    const adminCoursesList = document.getElementById('adminCoursesList');
    if (adminCoursesList) {
        adminCoursesList.innerHTML = courses.map(c => createCourseCard(c, true)).join('');
    }
    
    const adminMasterclassesList = document.getElementById('adminMasterclassesList');
    if (adminMasterclassesList) {
        adminMasterclassesList.innerHTML = mcs.map(mc => createMasterclassCard(mc, true)).join('');
    }
    
    const adminUsersList = document.getElementById('adminUsersList');
    if (adminUsersList) {
        adminUsersList.innerHTML = users.map(u => `
            <div class="booking-item">
                <div><strong>${escapeHtml(u.name)}</strong><br>${escapeHtml(u.email)}<br>Роль: ${u.role}</div>
                <div>${u.role !== 'admin' ? `<button class="btn btn-sm btn-outline" onclick="makeAdmin(${u.id})">Сделать админом</button>` : ''}</div>
            </div>
        `).join('');
    }
    
    const adminBookingsList = document.getElementById('adminBookingsList');
    if (adminBookingsList) {
        const bookings = getBookings();
        adminBookingsList.innerHTML = bookings.map(b => {
            const payment = getPayments().find(p => p.bookingId === b.id);
            const status = payment?.status === 'paid' ? 'Оплачено' : 'Ожидает оплаты';
            return `
                <div class="booking-item">
                    <div><strong>${b.title}</strong><br>Пользователь ID: ${b.userId}<br>Тип: ${b.type === 'course' ? 'Курс' : 'Мастер-класс'}<br>Цена: ${b.price?.toLocaleString()} ₽</div>
                    <div><span class="booking-status status-${payment?.status === 'paid' ? 'paid' : 'pending'}">${status}</span>${payment?.status !== 'paid' ? `<button class="btn btn-sm btn-primary" onclick="confirmPayment(${b.id})">Подтвердить</button>` : ''}</div>
                </div>
            `;
        }).join('');
    }
    
    const adminSupportMessages = document.getElementById('adminSupportMessages');
    if (adminSupportMessages) {
        const messages = getSupportMessages();
        adminSupportMessages.innerHTML = messages.map(m => `
            <div class="booking-item">
                <div><strong>${escapeHtml(m.userName)}</strong><br>${escapeHtml(m.message)}<br><small>${new Date(m.date).toLocaleString()}</small></div>
                <div><textarea id="reply-${m.id}" placeholder="Ответ..." rows="2" style="width:200px;"></textarea><button class="btn btn-sm btn-primary" onclick="sendSupportReply(${m.id})">Ответить</button></div>
            </div>
        `).join('');
    }
}

function confirmPayment(bookingId) {
    const payments = getPayments();
    const payment = payments.find(p => p.bookingId === bookingId);
    if (payment) {
        payment.status = 'paid';
        payment.paidAt = new Date().toISOString();
        savePayments(payments);
        const booking = getBookings().find(b => b.id === bookingId);
        if (booking && booking.type === 'course') {
            const users = getUsers();
            const user = users.find(u => u.id === booking.userId);
            if (user && !user.enrolledCourses.includes(booking.itemId)) {
                user.enrolledCourses.push(booking.itemId);
                saveUsers(users);
                if (currentUser?.id === user.id) {
                    currentUser.enrolledCourses = user.enrolledCourses;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }
            }
        }
        showNotification('Оплата подтверждена');
        renderAdminPanel();
        renderProfile();
        renderAllCourses();
    }
}

function sendSupportReply(msgId) {
    const replyText = document.getElementById(`reply-${msgId}`).value;
    if (!replyText) return;
    const messages = getSupportMessages();
    const msg = messages.find(m => m.id === msgId);
    if (msg) {
        msg.reply = replyText;
        saveSupportMessages(messages);
        showNotification('Ответ отправлен');
        document.getElementById(`reply-${msgId}`).value = '';
        loadChatMessages();
        renderAdminPanel();
    }
}

function makeAdmin(userId) {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        user.role = 'admin';
        saveUsers(users);
        showNotification(`${user.name} теперь администратор`);
        renderAdminPanel();
    }
}

// ========== ЧАТ ПОДДЕРЖКИ ==========
function loadChatMessages() {
    const container = document.getElementById('chatMessages');
    if(!container) return;
    const messages = getSupportMessages();
    if(messages.length === 0) { container.innerHTML = '<div class="empty-state">Нет сообщений. Напишите что-нибудь!</div>'; return; }
    container.innerHTML = messages.map(m => `<div class="message ${m.userId === currentUser?.id ? 'message-user' : 'message-admin'}"><div class="message-wrapper"><div class="message-avatar">${m.userName?.charAt(0) || '?'}</div><div class="message-content"><div>${escapeHtml(m.message)}</div><div class="message-meta">${m.userName} • ${new Date(m.date).toLocaleString()}</div>${m.reply ? `<div style="margin-top:8px;padding:8px;background:rgba(0,0,0,0.05);border-radius:12px;"><strong>Ответ админа:</strong> ${escapeHtml(m.reply)}</div>` : ''}</div></div></div>`).join('');
    container.scrollTop = container.scrollHeight;
}

function sendSupportMessage() {
    if(!currentUser) { showNotification('Войдите в аккаунт'); return; }
    const text = document.getElementById('chatMessageInput')?.value.trim();
    if(!text) return;
    const messages = getSupportMessages();
    messages.push({ id: Date.now(), userId: currentUser.id, userName: currentUser.name, userEmail: currentUser.email, message: text, date: new Date().toISOString(), reply: null });
    saveSupportMessages(messages);
    document.getElementById('chatMessageInput').value = '';
    loadChatMessages();
}

function filterReviews(rating) {
    currentReviewFilter = rating;
    currentReviewsPage = 1;
    renderReviews();
    document.querySelectorAll('.review-filter-btn').forEach(btn => { if(btn.dataset.filter === rating) btn.classList.add('active'); else btn.classList.remove('active'); });
}

function submitReview() {
    const name = document.getElementById('reviewName').value;
    const rating = parseInt(document.getElementById('reviewRating').value);
    const text = document.getElementById('reviewText').value;
    if(!name || !text) { showNotification('Заполните все поля'); return; }
    const reviews = getReviews();
    reviews.unshift({ id: Date.now(), userName: name, rating, text, date: new Date().toISOString().split('T')[0] });
    saveReviews(reviews);
    renderReviews();
    renderReviewsSummary();
    closeModal('reviewModal');
    showNotification('Спасибо за отзыв!');
    document.getElementById('reviewForm').reset();
    document.querySelectorAll('#ratingSelect span').forEach(s => s.classList.remove('active'));
    document.querySelector('#ratingSelect span:last-child')?.classList.add('active');
}

// ========== ФИЛЬТРЫ ==========
function initFilters() {
    const container = document.getElementById('filterTabs');
    if(!container) return;
    const cats = ['all', 'Программирование', 'Дизайн', 'Маркетинг', 'Бизнес', 'Data Science'];
    const names = { all: 'Все', Программирование: 'Программирование', Дизайн: 'Дизайн', Маркетинг: 'Маркетинг', Бизнес: 'Бизнес', 'Data Science': 'Data Science' };
    container.innerHTML = cats.map(c => `<button class="filter-tab ${c === 'all' ? 'active' : ''}" data-category="${c}">${names[c]}</button>`).join('');
    document.querySelectorAll('.filter-tab').forEach(t => { t.addEventListener('click', () => { document.querySelectorAll('.filter-tab').forEach(tt => tt.classList.remove('active')); t.classList.add('active'); currentCoursesPage = 1; renderAllCourses(); }); });
    const search = document.getElementById('searchInput'), clear = document.getElementById('searchClear');
    if(search) search.addEventListener('input', () => { currentCoursesPage = 1; renderAllCourses(); if(clear) clear.style.display = search.value ? 'flex' : 'none'; });
    if(clear) clear.addEventListener('click', () => { search.value = ''; clear.style.display = 'none'; currentCoursesPage = 1; renderAllCourses(); });
    const priceSelect = document.getElementById('priceSelect'), ratingSelect = document.getElementById('ratingSelectFilter'), sortBySelect = document.getElementById('sortBySelect');
    if(priceSelect) priceSelect.addEventListener('change', () => { currentCoursesPage = 1; renderAllCourses(); });
    if(ratingSelect) ratingSelect.addEventListener('change', () => { currentCoursesPage = 1; renderAllCourses(); });
    if(sortBySelect) sortBySelect.addEventListener('change', () => { currentCoursesPage = 1; renderAllCourses(); });
    document.getElementById('resetFilters')?.addEventListener('click', () => { document.querySelector('.filter-tab[data-category="all"]').click(); document.getElementById('searchInput').value = ''; document.getElementById('searchClear').style.display = 'none'; if(priceSelect) priceSelect.value = 'all'; if(ratingSelect) ratingSelect.value = '0'; if(sortBySelect) sortBySelect.value = 'default'; currentCoursesPage = 1; renderAllCourses(); });
}

function initRatingSelect() {
    const stars = document.querySelectorAll('#ratingSelect span');
    stars.forEach(star => { star.addEventListener('click', function() { const r = parseInt(this.dataset.rating); document.getElementById('reviewRating').value = r; stars.forEach((s, i) => { if(i < r) s.classList.add('active'); else s.classList.remove('active'); }); }); });
    document.querySelector('#ratingSelect span:last-child')?.classList.add('active');
}

function initCourseSelect() {
    const s = document.getElementById('bookingCourseSelect');
    if(s) s.innerHTML = '<option value="">Выберите курс</option>' + getCourses().map(c => `<option value="${c.id}">${c.title} - ${c.price.toLocaleString()} ₽</option>`).join('');
}

function togglePromoSection() {
    const promoBody = document.getElementById('promoBody');
    const toggleBtn = document.getElementById('promoToggleBtn');
    if (promoBody.classList.contains('open')) {
        promoBody.classList.remove('open');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
    } else {
        promoBody.classList.add('open');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    }
}

// ========== НАВИГАЦИЯ ==========
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page + '-page').classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const link = Array.from(document.querySelectorAll('.nav-link')).find(l => l.getAttribute('onclick')?.includes(page));
    if(link) link.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if(page === 'profile') renderProfile();
    if(page === 'support') loadChatMessages();
    if(page === 'admin' && currentUser?.email === 'admin@skillway.ru') renderAdminPanel();
    const t = document.getElementById('mobileToggle'), m = document.getElementById('navMenu');
    if(t?.classList.contains('active')) { t.classList.remove('active'); m?.classList.remove('active'); }
}

// ========== ТЕМА ==========
function initTheme() {
    const saved = localStorage.getItem('theme');
    if(saved === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); document.querySelector('#themeSwitch i').className = 'fas fa-sun'; }
    document.getElementById('themeSwitch').addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if(isDark) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme', 'light'); document.querySelector('#themeSwitch i').className = 'fas fa-moon'; }
        else { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark'); document.querySelector('#themeSwitch i').className = 'fas fa-sun'; }
    });
}

function initMobileMenu() {
    const t = document.getElementById('mobileToggle'), m = document.getElementById('navMenu');
    t?.addEventListener('click', () => { t.classList.toggle('active'); m.classList.toggle('active'); });
}

function initScrollHeader() {
    window.addEventListener('scroll', () => { const h = document.getElementById('header'); if(window.scrollY > 50) h.classList.add('header-scrolled'); else h.classList.remove('header-scrolled'); });
}

function attachGlobalCardHandler() {
    document.body.addEventListener('click', (e) => {
        const card = e.target.closest('.course-card');
        if(!card) return;
        if(e.target.closest('.btn') || e.target.closest('.favorite-btn') || e.target.closest('.admin-edit-btn')) return;
        const type = card.dataset.type, id = card.dataset.id;
        if(type && id) { e.preventDefault(); e.stopPropagation(); openDetailModal(type, parseInt(id)); }
    });
}

function setupEventListeners() {
    document.querySelectorAll('.modal').forEach(m => { m.addEventListener('click', function(e) { if(e.target === this) { m.style.display = 'none'; document.body.style.overflow = 'auto'; } }); });
    document.getElementById('loginForm')?.addEventListener('submit', e => { e.preventDefault(); login(); });
    document.getElementById('registerForm')?.addEventListener('submit', e => { e.preventDefault(); register(); });
    document.getElementById('paymentForm')?.addEventListener('submit', e => { e.preventDefault(); processPayment(); });
    document.getElementById('reviewForm')?.addEventListener('submit', e => { e.preventDefault(); submitReview(); });
    document.getElementById('applyPromoBtn')?.addEventListener('click', applyPromoCode);
    document.getElementById('contactForm')?.addEventListener('submit', e => { e.preventDefault(); showNotification('Сообщение отправлено!'); e.target.reset(); });
    document.getElementById('sendChatMessage')?.addEventListener('click', sendSupportMessage);
    document.getElementById('courseForm')?.addEventListener('submit', saveCourse);
    document.getElementById('masterclassForm')?.addEventListener('submit', saveMasterclass);
    document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('bookingName').value, email = document.getElementById('bookingEmail').value, phone = document.getElementById('bookingPhone').value, courseId = document.getElementById('bookingCourseSelect').value;
        if(!name || !email || !phone || !courseId) { showNotification('Заполните все поля'); return; }
        const course = getCourses().find(c => c.id == courseId);
        const bookings = getBookings();
        const booking = { id: Date.now(), userId: currentUser.id, type: 'course', itemId: parseInt(courseId), title: course.title, price: course.price, status: 'pending' };
        bookings.push(booking);
        saveBookings(bookings);
        const payments = getPayments();
        payments.push({ id: Date.now(), bookingId: booking.id, amount: course.price, status: 'pending' });
        savePayments(payments);
        showNotification('Заявка создана, оплатите для записи');
        closeModal('bookingModal');
        e.target.reset();
        initiatePayment(booking.id, 'course', course.id, course.title, course.price);
    });
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(`profile${this.dataset.tab.charAt(0).toUpperCase() + this.dataset.tab.slice(1)}Tab`).classList.add('active');
        });
    });
    document.querySelectorAll('.review-filter-btn').forEach(btn => { btn.addEventListener('click', () => filterReviews(btn.dataset.filter)); });
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(`admin${this.dataset.adminTab.charAt(0).toUpperCase() + this.dataset.adminTab.slice(1)}Tab`).classList.add('active');
            if(this.dataset.adminTab === 'courses') renderAllCourses();
            if(this.dataset.adminTab === 'masterclasses') renderMasterclasses();
        });
    });
}

// ========== ЗАПУСК ==========
async function init() {
    // Сначала загружаем данные из Supabase
    await loadFromSupabase();
    
    // Потом всё остальное
    initStorage();
    initTheme();
    initMobileMenu();
    initFilters();
    initCourseSelect();
    initRatingSelect();
    attachGlobalCardHandler();
    setupEventListeners();
    initScrollHeader();
    
    const savedUser = localStorage.getItem('currentUser');
    if(savedUser) currentUser = JSON.parse(savedUser);
    updateAuthUI();
    renderFeaturedCourses();
    renderAllCourses();
    renderMasterclasses();
    renderReviews();
    renderReviewsSummary();
    renderHeroStats();
    renderAboutStats();
    setTimeout(() => { const p = document.getElementById('preloader'); if(p) p.remove(); }, 500);
}

document.addEventListener('DOMContentLoaded', init);

// Глобальные функции
window.navigateTo = navigateTo;
window.openModal = openModal;
window.closeModal = closeModal;
window.openBookingModal = openBookingModal;
window.bookMasterclass = bookMasterclass;
window.toggleFavorite = toggleFavorite;
window.continueCourse = continueCourse;
window.openReviewModal = () => openModal('reviewModal');
window.logout = logout;
window.openDetailModal = openDetailModal;
window.openAddCourseModal = openAddCourseModal;
window.openEditCourseModal = openEditCourseModal;
window.openAddMasterclassModal = openAddMasterclassModal;
window.openEditMasterclassModal = openEditMasterclassModal;
window.deleteCourse = deleteCourse;
window.deleteMasterclass = deleteMasterclass;
window.openFullAdminPanel = openFullAdminPanel;
window.confirmPayment = confirmPayment;
window.sendSupportReply = sendSupportReply;
window.makeAdmin = makeAdmin;
window.initiatePayment = initiatePayment;
window.generateCertificate = generateCertificate;
window.applyPromoCode = applyPromoCode;
window.togglePromoSection = togglePromoSection;
window.filterReviews = filterReviews;
