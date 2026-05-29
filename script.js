// SkillWay - с подключением к Supabase

let currentUser = null;

// Ждём загрузки страницы
document.addEventListener('DOMContentLoaded', async function() {
    // Создаём подключение к Supabase
    window.supabaseClient = supabase.createClient(
        'https://nrwlxqhkzbvggftyestg.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yd2x4cWhremJ2Z2dmdHllc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MjU2MTEsImV4cCI6MjA2NDAwMTYxMX0.6oQ_S_YqLcRa-ykgkWIfRvlRuDywN5no9NnP9Hls1xU'
    );
    
    // Загружаем курсы из базы
    await loadCoursesFromDatabase();
    
    // Убираем загрузку
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.remove();
});

async function loadCoursesFromDatabase() {
    // Получаем курсы из Supabase
    const { data: courses, error } = await window.supabaseClient
        .from('courses')
        .select('*');
    
    if (error) {
        console.error('Ошибка загрузки:', error);
        showNotification('Ошибка подключения к базе данных');
        return;
    }
    
    // Сохраняем в localStorage для совместимости
    localStorage.setItem('courses', JSON.stringify(courses));
    
    // Отображаем курсы на странице
    displayCourses(courses);
}

function displayCourses(courses) {
    // Главная страница - популярные курсы
    const featuredContainer = document.getElementById('featuredCourses');
    if (featuredContainer) {
        const featured = courses.filter(c => c.featured === true);
        featuredContainer.innerHTML = featured.map(course => createCourseCardHTML(course)).join('');
    }
    
    // Страница курсов - все курсы
    const allCoursesContainer = document.getElementById('allCourses');
    if (allCoursesContainer) {
        allCoursesContainer.innerHTML = courses.map(course => createCourseCardHTML(course)).join('');
    }
}

function createCourseCardHTML(course) {
    const discount = course.old_price ? Math.round((1 - course.price / course.old_price) * 100) : 0;
    
    return `
        <div class="course-card" onclick="showCourseDetail(${course.id})">
            <div class="course-image">
                <div class="image-fallback">
                    <i class="fas fa-${getCategoryIcon(course.category)}"></i>
                </div>
                ${discount > 0 ? `<span class="course-badge hot">-${discount}%</span>` : ''}
            </div>
            <div class="course-content">
                <span class="course-category">${course.category}</span>
                <h3 class="course-title">${course.title}</h3>
                <p class="course-description">${course.description}</p>
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
                <button class="btn btn-primary" style="margin-top:16px; width:100%" onclick="event.stopPropagation(); enrollCourse(${course.id})">Записаться</button>
            </div>
        </div>
    `;
}

function getCategoryIcon(category) {
    const icons = {
        'Программирование': 'code',
        'Дизайн': 'pencil-ruler',
        'Маркетинг': 'chart-line',
        'Бизнес': 'briefcase',
        'Data Science': 'chart-bar'
    };
    return icons[category] || 'graduation-cap';
}

function getStars(rating) {
    let stars = '';
    for (let i = 0; i < 5; i++) {
        if (i < Math.floor(rating)) stars += '<i class="fas fa-star"></i>';
        else if (i < rating) stars += '<i class="fas fa-star-half-alt"></i>';
        else stars += '<i class="far fa-star"></i>';
    }
    return stars;
}

function showCourseDetail(courseId) {
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const course = courses.find(c => c.id === courseId);
    
    if (!course) return;
    
    const modalBody = document.getElementById('detailModalBody');
    if (modalBody) {
        modalBody.innerHTML = `
            <h2>${course.title}</h2>
            <div class="stars">${getStars(course.rating)} ${course.rating}</div>
            <div style="font-size:28px; color:#14b8a6; margin:15px 0">
                ${course.price.toLocaleString()} ₽
                ${course.old_price ? `<span style="text-decoration:line-through;color:gray;margin-left:8px;">${course.old_price.toLocaleString()} ₽</span>` : ''}
            </div>
            <div style="display:flex; gap:20px; margin:15px 0; padding:15px 0; border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0">
                <div><i class="far fa-clock"></i> ${course.duration}</div>
                <div><i class="fas fa-user-tie"></i> ${course.instructor}</div>
                <div><i class="fas fa-users"></i> ${course.students} студентов</div>
            </div>
            <p>${course.long_description || course.description}</p>
            <div style="margin-top:30px; display:flex; gap:15px">
                <button class="btn btn-primary" onclick="closeModal('detailModal'); enrollCourse(${course.id})">Записаться</button>
                <button class="btn btn-outline" onclick="closeModal('detailModal')">Закрыть</button>
            </div>
        `;
        openModal('detailModal');
    }
}

async function enrollCourse(courseId) {
    if (!currentUser) {
        showNotification('Войдите в аккаунт');
        openModal('loginModal');
        return;
    }
    
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const course = courses.find(c => c.id === courseId);
    
    if (course) {
        showNotification(`Вы записаны на курс "${course.title}"!`);
    }
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notificationText');
    if (notification && text) {
        text.textContent = message;
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 3000);
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
    window.scrollTo({ top: 0 });
}

// Регистрация через Supabase
async function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    const { error } = await window.supabaseClient.auth.signUp({
        email, password,
        options: { data: { name } }
    });
    
    if (error) {
        showNotification(error.message);
    } else {
        showNotification('Регистрация успешна! Проверьте email');
        closeModal('registerModal');
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email, password
    });
    
    if (error) {
        showNotification('Неверный email или пароль');
    } else {
        currentUser = data.user;
        showNotification('Вход выполнен!');
        closeModal('loginModal');
        updateAuthUI();
    }
}

function logout() {
    currentUser = null;
    updateAuthUI();
    showNotification('Вы вышли из аккаунта');
}

function updateAuthUI() {
    const authBlock = document.getElementById('authBlock');
    if (!authBlock) return;
    
    if (currentUser) {
        authBlock.innerHTML = `
            <span class="user-name">${currentUser.email}</span>
            <button class="btn btn-outline btn-sm" onclick="navigateTo('profile')">Кабинет</button>
            <button class="btn btn-outline btn-sm" onclick="logout()">Выйти</button>
        `;
    } else {
        authBlock.innerHTML = `
            <button class="btn btn-outline btn-sm" onclick="openModal('loginModal')">Войти</button>
            <button class="btn btn-primary btn-sm" onclick="openModal('registerModal')">Регистрация</button>
        `;
    }
}

// Глобальные функции
window.navigateTo = navigateTo;
window.openModal = openModal;
window.closeModal = closeModal;
window.showCourseDetail = showCourseDetail;
window.enrollCourse = enrollCourse;
window.register = register;
window.login = login;
window.logout = logout;
