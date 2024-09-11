import express from 'express';
import multer from 'multer';
import { loadTimetableData } from './database.js';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import {formatSchedule} from "./database.js"
import {formatTeacherSchedule} from './database.js'
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

const isDecode = false
// Обработка загрузки JSON файла

// Обработка загрузки JSON файла
router.post('/upload', upload.single('timetable'), async (req, res) => {
  await loadTimetableData(req, res, isDecode);
});





// Получение расписания для конкретной группы
router.get('/timetable/:groupName', async (req, res) => {
  const { groupName } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE group_name = $1 ORDER BY date, time_start', [groupName]);
    const formattedSchedule = formatSchedule(result.rows);
    res.json({
      status: "success",
      schedule: formattedSchedule
    });
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).json({
      status: "error",
      message: "Ошибка сервера"
    });
  }
});

// Получение расписания на конкретную дату
router.get('/timetable/date/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE date = $1 ORDER BY time_start', [date]);
    const formattedSchedule = formatSchedule(result.rows);
    res.json({
      status: "success",
      schedule: formattedSchedule
    });
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).json({
      status: "error",
      message: "Ошибка сервера"
    });
  }
});

// Получение расписания для конкретного преподавателя по части имени
router.get('/timetable/teacher/:teacherName', async (req, res) => {
  const { teacherName } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE teacher_name ILIKE $1 ORDER BY date, time_start', [`%${teacherName}%`]);
    const formattedSchedule = formatTeacherSchedule(result.rows);
    res.json({
      status: "success",
      teacher: formattedSchedule.teacher,
      schedule: formattedSchedule.schedule
    });
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).json({
      status: "error",
      message: "Ошибка сервера"
    });
  }
});

// Получение расписания для конкретной группы на определенную дату
router.get('/timetable/:groupName/date/:date', async (req, res) => {
  const { groupName, date } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE group_name = $1 AND date = $2 ORDER BY time_start', [groupName, date]);
    const formattedSchedule = formatSchedule(result.rows);
    res.json({
      status: "success",
      schedule: formattedSchedule
    });
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).json({
      status: "error",
      message: "Ошибка сервера"
    });
  }
});

// Получение расписания для конкретной группы на определенную неделю
router.get('/timetable/:groupName/week/:weekNumber', async (req, res) => {
  const { groupName, weekNumber } = req.params;
  try {
    const result = await pool.query('SELECT * FROM timetable WHERE group_name = $1 AND week_number = $2 ORDER BY date, time_start', [groupName, weekNumber]);
    const formattedSchedule = formatSchedule(result.rows);
    res.json({
      status: "success",
      schedule: formattedSchedule
    });
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).json({
      status: "error",
      message: "Ошибка сервера"
    });
  }
});

//Получение всех названий групп
router.get('/groups', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT group_name FROM timetable ORDER BY group_name');
    res.json({
      status: "success",
      groups: result.rows.map(row => row.group_name)
    });
  } catch (error) {ы
    console.error('Ошибка при выполнении запроса:', error);
    res.status(500).json({
      status: "error",
      message: "Ошибка сервера"
    });
  }
});
export default router;