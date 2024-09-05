import express from 'express';
import multer from 'multer';
import { loadTimetableData } from './database.js';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { pool } from './database.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Главная страница с формой входа 
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка входа
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === 'kgeuforever') {
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
  } else {
    res.status(401).send('Неверный пароль');
  }
});

// Обработка загрузки JSON файла
router.post('/upload', upload.single('timetable'), async (req, res) => {
  await loadTimetableData(req, res);
});





// Получение расписания для конкретной группы
router.get('/timetable/:groupName', async (req, res) => {
  const { groupName } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE group_name = $1', [groupName]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Получение расписания на конкретную дату
router.get('/timetable/date/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE date = $1', [date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});
// Получение расписания для конкретного преподавателя по части имени
router.get('/timetable/teacher/:teacherName', async (req, res) => {
  const { teacherName } = req.params;
  try {
    // Используем оператор LIKE для поиска по части имени
    const result = await pool.query('SELECT * FROM timetable WHERE teacher_name ILIKE $1', [`%${teacherName}%`]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});


// Получение расписания для конкретной группы на определенную дату
router.get('/timetable/:groupName/date/:date', async (req, res) => {
  const { groupName, date } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE group_name = $1 AND date = $2', [groupName, date]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Получение расписания для конкретной группы в определенный день недели
router.get('/timetable/:groupName/weekday/:weekday', async (req, res) => {
  const { groupName, weekday } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE group_name = $1 AND weekday = $2', [groupName, weekday]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Получение расписания для конкретной группы на определенную неделю
router.get('/timetable/:groupName/week/:weekNumber', async (req, res) => {
  const { groupName, weekNumber } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE group_name = $1 AND week_number = $2', [groupName, weekNumber]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});

//Получение всех названий групп
router.get('/groups', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT group_name FROM timetable');
    res.json(result.rows.map(row => row.group_name));
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});
export default router;