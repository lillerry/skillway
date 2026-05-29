// SkillWay - ИСПРАВЛЕННАЯ ВЕРСИЯ
const SUPABASE_URL = 'https://nrwlxqhkzbvggftyestg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yd2x4cWhremJ2Z2dmdHllc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTcwMDcsImV4cCI6MjA5NTUzMzAwN30._rbBlzZSxyxlIHExKyFVH-k5aPslAdCYINRlW_TOk74'

let supabaseClient = null

document.addEventListener('DOMContentLoaded', async function() {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Пробуем получить курсы
    const { data, error } = await supabaseClient
        .from('courses')
        .select('*')
    
    if (error) {
        document.body.innerHTML = `<div style="padding:50px;text-align:center">
            <h2>Ошибка 401: Неправильный ключ API</h2>
            <p>Скопируйте anon public ключ из настроек Supabase</p>
            <p>Настройки → API → Project API Keys → anon public</p>
        </div>`
        console.error('Ошибка:', error)
        return
    }
    
    // Показываем курсы
    const container = document.getElementById('allCourses')
    if (container && data.length) {
        container.innerHTML = data.map(c => `
            <div class="course-card">
                <div class="course-content">
                    <h3>${c.title}</h3>
                    <p>${c.description}</p>
                    <p class="course-price">${c.price} ₽</p>
                </div>
            </div>
        `).join('')
    }
    
    // Убираем прелоадер
    const preloader = document.getElementById('preloader')
    if (preloader) preloader.remove()
})
