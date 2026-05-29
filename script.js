// SkillWay - ИСПРАВЛЕННАЯ ВЕРСИЯ
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
    
    await loadCourses()
    await loadMasterclasses()
    await loadReviews()
    
    checkUser()
    renderAllData()
    
    const preloader = document.getElementById('preloader')
    if (preloader) preloader.style.display = 'none'
})

async function loadCourses() {
    const { data, error } = await supabaseClient
        .from('courses')
        .select('*')
    
    if (error) {
        console.error('Ошибка загрузки курсов:', error)
        document.getElementById('allCourses').innerHTML = `<div style="padding:50px;text-align:center;color:red">Ошибка: ${error.message}<br>Проверьте ключи API в настройках Supabase</div>`
        return
    }
    
    allCourses = data || []
    console.log(`Загружено ${allCourses.length} курсов`)
}

async function loadMasterclasses() {
    const { data, error } = await supabaseClient
        .from('masterclasses')
        .select('*')
    
    if (error) {
        console.error('Ошибка загрузки МК:', error)
        return
    }
    allMasterclasses = data || []
    console.log(`Загружено ${allMasterclasses.length} МК`)
}

async function loadReviews() {
    const { data, error } = await supabaseClient
        .from('reviews')
        .select('*')
    
    if (error) {
        console.error('Ошибка загрузки отзывов:', error)
        return
    }
    allReviews = data || []
    console.log(`Загружено ${allReviews.length} отзывов`)
}

function renderAllData() {
    renderCourses()
    renderMasterclasses()
    renderReviews()
}

function renderCourses() {
    const container = document.getElementById('allCourses')
    if (!container) return
    
    if (allCourses.length === 0) {
        container.innerHTML = '<div class="empty-state">Курсов пока нет. Добавьте их в Supabase Table Editor</div>'
        return
    }
    
    container.innerHTML = allCourses.map(course => `
        <div class="course-card">
            <div class="course-content">
                <span class="course-category">${course.category}</span>
                <h3 class="course-title">${course.title}</h3>
                <p class="course-description">${course.description}</p>
                <div class="course-meta">
                    <span><i class="far fa-clock"></i> ${course.duration}</span>
                    <span><i class="fas fa-users"></i> ${course.students || 0}</span>
                </div>
                <div class="course-footer">
                    <span class="course-price">${course.price.toLocaleString()} ₽</span>
                    <div class="stars">${getStars(course.rating)}</div>
                </div>
                <button class="btn btn-primary" onclick="alert('Запись на курс: ${course.title}')">Записаться</button>
            </div>
        </div>
    `).join('')
    
    // Также обновляем избранные на главной
    const featuredContainer = document.getElementById('featuredCourses')
    if (featuredContainer) {
        const featured = allCourses.filter(c => c.featured)
        featuredContainer.innerHTML = featured.map(course => `
            <div class="course-card">
                <div class="course-content">
                    <span class="course-category">${course.category}</span>
                    <h3 class="course-title">${course.title}</h3>
                    <p class="course-description">${course.description}</p>
                    <div class="course-footer">
                        <span class="course-price">${course.price.toLocaleString()} ₽</span>
                        <button class="btn btn-primary" onclick="alert('Запись на курс: ${course.title}')">Записаться</button>
                    </div>
                </div>
            </div>
        `).join('')
    }
}

function renderMasterclasses() {
    const container = document.getElementById('masterclassesGrid')
    if (!container) return
    
    if (allMasterclasses.length === 0) {
        container.innerHTML = '<div class="empty-state">Мастер-классов пока нет</div>'
        return
    }
    
    container.innerHTML = allMasterclasses.map(mc => `
        <div class="course-card">
            <div class="course-content">
                <span class="course-category">Мастер-класс</span>
                <h3 class="course-title">${mc.title}</h3>
                <p class="course-description">${mc.description}</p>
                <div class="course-meta">
                    <span><i class="far fa-calendar"></i> ${new Date(mc.datetime).toLocaleDateString()}</span>
                    <span><i class="fas fa-hourglass-half"></i> ${mc.duration}</span>
                </div>
                <div class="course-footer">
                    <span class="course-price">${mc.price.toLocaleString()} ₽</span>
                    <button class="btn btn-primary" onclick="alert('Запись на МК: ${mc.title}')">Записаться</button>
                </div>
            </div>
        </div>
    `).join('')
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
                    <span class="review-name">${r.user_name}</span>
                    <div class="review-date">${r.date}</div>
                </div>
                <div class="review-rating">${getStars(r.rating)}</div>
            </div>
            <p class="review-text">${r.text}</p>
        </div>
    `).join('')
}

function getStars(rating) {
    let stars = ''
    for (let i = 0; i < 5; i++) {
        stars += i < Math.floor(rating) ? '<i class="fas fa-star"></i>' : 
                  (i < rating ? '<i class="fas fa-star-half-alt"></i>' : '<i class="far fa-star"></i>')
    }
    return stars
}

async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (user) {
        currentUser = user
        const authBlock = document.getElementById('authBlock')
        if (authBlock) {
            authBlock.innerHTML = `<span class="user-name">${user.email}</span><button class="btn btn-outline" onclick="logout()">Выйти</button>`
        }
    }
}

async function logout() {
    await supabaseClient.auth.signOut()
    location.reload()
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
    document.getElementById(`${page}-page`).classList.add('active')
    window.scrollTo({ top: 0 })
}

window.navigateTo = navigateTo
window.logout = logout
