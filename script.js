// SkillWay - РАБОЧАЯ ВЕРСИЯ
const SUPABASE_URL = 'https://nrwlxqhkzbvggftyestg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yd2x4cWhremJ2Z2dmdHllc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTcwMDcsImV4cCI6MjA5NTUzMzAwN30._rbBlzZSxyxlIHExKyFVH-k5aPslAdCYINRlW_TOk74'

let supabaseClient = null

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Загрузка SkillWay...')
    
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    const { data: courses, error } = await supabaseClient
        .from('courses')
        .select('*')
    
    if (error) {
        console.error('Ошибка:', error)
        document.getElementById('allCourses').innerHTML = `<div style="padding:50px;text-align:center;color:red">Ошибка: ${error.message}</div>`
        return
    }
    
    console.log('Загружено курсов:', courses.length)
    
    const container = document.getElementById('allCourses')
    if (container && courses.length > 0) {
        container.innerHTML = courses.map(course => `
            <div style="border:1px solid #ddd; border-radius:16px; padding:20px; margin-bottom:20px; background:white">
                <h3>${course.title}</h3>
                <p>${course.description}</p>
                <p style="font-size:24px; color:#14b8a6; font-weight:bold">${course.price.toLocaleString()} ₽</p>
                <button onclick="alert('Запись на курс: ${course.title}')" style="background:#14b8a6; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer">Записаться</button>
            </div>
        `).join('')
    }
    
    const preloader = document.getElementById('preloader')
    if (preloader) preloader.remove()
})
