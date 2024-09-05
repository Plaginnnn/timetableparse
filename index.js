const { Pool } = require('pg');
const fs = require('fs');

// Настройка подключения к базе данных PostgreSQL
const pool = new Pool({
  user: 'botuser',
  host: 'localhost',
  database: 'timetabledata',
  password: 'rasim2003',
  port: 5432,
});

// Функция для преобразования даты из формата "DD-MM-YYYY" в "YYYY-MM-DD"
function formatDateString(dateString) {
  if (!dateString) return null; // Возвращаем null, если дата отсутствует
  const [day, month, year] = dateString.split('-');
  return `${year}-${month}-${day}`; // Преобразуем в формат "YYYY-MM-DD"
}

async function loadTimetableData(data) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Очищаем таблицу перед загрузкой новых данных
    await client.query('TRUNCATE TABLE timetable');

    for (const timetable of data) {
      for (const weekData of timetable.timetable) {
        for (const groupData of weekData.groups) {
          for (const dayData of groupData.days) {
            if (dayData.lessons) {
              for (const lessonData of dayData.lessons) {
                // Преобразование строкового формата даты в формат DATE PostgreSQL
                const dateStart = formatDateString(weekData.date_start);
                const dateEnd = formatDateString(weekData.date_end);
                const dateValue = formatDateString(lessonData.date); // Изменено на lessonData.date

                await client.query(`
                  INSERT INTO timetable (
                    week_number, date_start, date_end, group_name, course,
                    weekday, date, subject, lesson_type, subgroup, time_start, time_end,
                    teacher_post, teacher_name, auditory_name
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                `, [
                  weekData.week_number,
                  dateStart,   // Используем преобразованную дату
                  dateEnd,     // Используем преобразованную дату
                  groupData.group_name,
                  groupData.course,
                  dayData.weekday,
                  dateValue,   // Используем преобразованную дату урока
                  lessonData.subject,
                  lessonData.type,
                  lessonData.subgroup,
                  lessonData.time_start,
                  lessonData.time_end,
                  lessonData.teachers[0].teacher_post,
                  lessonData.teachers[0].teacher_name,
                  lessonData.auditories[0].auditory_name
                ]);
              }
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log('Данные успешно загружены');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка при загрузке данных:', error);
  } finally {
    client.release();
  }
}

// Загружаем JSON данные
const jsonData = JSON.parse(fs.readFileSync('output.json', 'utf8'));

// Вызываем функцию для загрузки данных
loadTimetableData(jsonData);