
import iconv from 'iconv-lite';
import fs from 'fs/promises';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'botuser',
  host: 'localhost',
  database: 'timetabledata',
  password: 'rasim2003',
  port: 5432,
});

export { pool };  // Экспортируем pool

export async function loadTimetableData(req, res) {
  if (!req.file) {
    return res.status(400).send('Файл не был загружен. Попробуйте еще раз.');
  }

  try {
    // Чтение загруженного файла
    const data = await fs.readFile(req.file.path);

    // Декодирование данных из Windows-1251 в UTF-8
    const decodedData = iconv.decode(data, 'win1251');

    // Запись данных в файл в кодировке UTF-8
    const outputPath = path.join(__dirname, 'logs', `timetable_${Date.now()}.json`);
    await fs.writeFile(outputPath, decodedData, 'utf8');

    // Загрузка данных в базу
    const jsonData = JSON.parse(decodedData);
    await saveDataToDatabase(jsonData);

    // Отправляем только статус 200 (успешно)
    res.sendStatus(200);
  } catch (error) {
    console.error('Ошибка при обработке файла:', error);
    res.status(500).send('Произошла ошибка при обработке файла. Попробуйте еще раз.');
  }
}
async function saveDataToDatabase(data) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Логика сохранения данных в базу данных
    for (const timetable of data) {
      for (const weekData of timetable.timetable) {
        for (const groupData of weekData.groups) {
          for (const dayData of groupData.days) {
            if (dayData.lessons) {
              for (const lessonData of dayData.lessons) {
                // Проверяем, существует ли уже такая запись
                const existingRecord = await client.query(`
                  SELECT * FROM timetable 
                  WHERE week_number = $1 
                    AND date_start = $2 
                    AND date_end = $3 
                    AND group_name = $4 
                    AND course = $5 
                    AND weekday = $6 
                    AND date = $7 
                    AND subject = $8 
                    AND lesson_type = $9 
                    AND subgroup = $10 
                    AND time_start = $11 
                    AND time_end = $12
                `, [
                  weekData.week_number,
                  weekData.date_start,
                  weekData.date_end,
                  groupData.group_name,
                  groupData.course,
                  dayData.weekday,
                  lessonData.date,
                  lessonData.subject,
                  lessonData.type,
                  lessonData.subgroup,
                  lessonData.time_start,
                  lessonData.time_end
                ]);

                if (existingRecord.rows.length === 0) {
                  // Если записи нет, добавляем новую
                  await client.query(`
                    INSERT INTO timetable (
                      week_number, date_start, date_end, group_name, course,
                      weekday, date, subject, lesson_type, subgroup, time_start, time_end,
                      teacher_post, teacher_name, auditory_name
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                  `, [
                    weekData.week_number,
                    weekData.date_start,
                    weekData.date_end,
                    groupData.group_name,
                    groupData.course,
                    dayData.weekday,
                    lessonData.date,
                    lessonData.subject,
                    lessonData.type,
                    lessonData.subgroup,
                    lessonData.time_start,
                    lessonData.time_end,
                    lessonData.teachers[0]?.teacher_post,
                    lessonData.teachers[0]?.teacher_name,
                    lessonData.auditories[0]?.auditory_name
                  ]);
                } else {
                  // Если запись существует, проверяем, нужно ли ее обновить
                  const existingData = existingRecord.rows[0];
                  if (
                    existingData.teacher_post !== lessonData.teachers[0]?.teacher_post ||
                    existingData.teacher_name !== lessonData.teachers[0]?.teacher_name ||
                    existingData.auditory_name !== lessonData.auditories[0]?.auditory_name
                  ) {
                    // Обновляем запись, если есть изменения
                    await client.query(`
                      UPDATE timetable 
                      SET teacher_post = $1, teacher_name = $2, auditory_name = $3
                      WHERE week_number = $4 
                        AND date_start = $5 
                        AND date_end = $6 
                        AND group_name = $7 
                        AND course = $8 
                        AND weekday = $9 
                        AND date = $10 
                        AND subject = $11 
                        AND lesson_type = $12 
                        AND subgroup = $13 
                        AND time_start = $14 
                        AND time_end = $15
                    `, [
                      lessonData.teachers[0]?.teacher_post,
                      lessonData.teachers[0]?.teacher_name,
                      lessonData.auditories[0]?.auditory_name,
                      weekData.week_number,
                      weekData.date_start,
                      weekData.date_end,
                      groupData.group_name,
                      groupData.course,
                      dayData.weekday,
                      lessonData.date,
                      lessonData.subject,
                      lessonData.type,
                      lessonData.subgroup,
                      lessonData.time_start,
                      lessonData.time_end
                    ]);
                  }
                }
              }
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log('Данные успешно загружены и обновлены');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка при загрузке данных:', error);
    throw error;
  } finally {
    client.release();
  }
}
