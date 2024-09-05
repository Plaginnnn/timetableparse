const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const iconv = require('iconv-lite');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Настройка подключения к базе данных PostgreSQL
const pool = new Pool({
  user: 'botuser',
  host: 'localhost',
  database: 'timetabledata',
  password: 'rasim2003',
  port: 5432,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Служим статические файлы из папки 'public'
app.use(express.static('public'));

// Создаем директории 'uploads' и 'logs', если они не существуют
const createRequiredDirectories = async () => {
  const dirs = ['uploads', 'logs'];
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dir);
        console.log(`Директория ${dir} создана.`);
      }
    }
  }
};

// Вызываем функцию создания директорий при запуске приложения
createRequiredDirectories();

// Главная страница с формой входа
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка входа
app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === 'kgeuforever') {
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
  } else {
    res.status(401).send('Неверный пароль');
  }
});


// Обработка загрузки JSON файла
app.post('/upload', upload.single('timetable'), async (req, res) => {
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
    await loadTimetableData(jsonData);

    // Отправляем только статус 200 (успешно)
    res.sendStatus(200);
  } catch (error) {
    console.error('Ошибка при обработке файла:', error);
    res.status(500).send('Произошла ошибка при обработке файла. Попробуйте еще раз.');
  }
});
// Функция для загрузки данных в базу
async function loadTimetableData(data) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

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
// Пример GET-запроса: получение расписания для конкретной группы
app.get('/timetable/:groupName', async (req, res) => {
  const { groupName } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE group_name = $1', [groupName]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Пример GET-запроса: получение расписания на конкретную дату
app.get('/timetable/date/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE date = $1', [date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Пример GET-запроса: получение расписания для конкретного преподавателя
app.get('/timetable/teacher/:teacherName', async (req, res) => {
  const { teacherName } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE teacher_name = $1', [teacherName]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});


// Пример GET-запроса: получение расписания для конкретной группы на определенную дату
app.get('/timetable/:groupName/date/:date', async (req, res) => {
  const { groupName, date } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE group_name = $1 AND date = $2', [groupName, date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Пример GET-запроса: получение расписания для конкретной группы в определенный день недели
app.get('/timetable/:groupName/weekday/:weekday', async (req, res) => {
  const { groupName, weekday } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE group_name = $1 AND weekday = $2', [groupName, weekday]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Пример GET-запроса: получение расписания для конкретной группы на определенную неделю
app.get('/timetable/:groupName/week/:weekNumber', async (req, res) => {
  const { groupName, weekNumber } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE group_name = $1 AND week_number = $2', [groupName, weekNumber]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});