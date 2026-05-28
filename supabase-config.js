// supabase-config.js

// 👇 СЮДА ВСТАВЬТЕ ВАШИ ДАННЫЕ ИЗ SUPABASE!
const SUPABASE_URL = 'https://nrwlxqhkzbvggftyestg.supabase.co/rest/v1/'        // Ваш Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yd2x4cWhremJ2Z2dmdHllc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTcwMDcsImV4cCI6MjA5NTUzMzAwN30._rbBlzZSxyxlIHExKyFVH-k5aPslAdCYINRlW_TOk74'   // Ваш anon key

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Функция для проверки подключения
export async function checkConnection() {
    try {
        const { data, error } = await supabase
            .from('courses')
            .select('count', { count: 'exact', head: true })
        
        if (error) {
            console.error('Ошибка:', error)
            return false
        }
        console.log('✅ Supabase подключен!')
        return true
    } catch (err) {
        console.error('❌ Ошибка подключения:', err)
        return false
    }
}