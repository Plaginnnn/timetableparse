DROP TABLE IF EXISTS timetable;

CREATE TABLE timetable (
    id SERIAL PRIMARY KEY,
    week_number INTEGER NOT NULL,
    date_start TEXT NOT NULL,  -- изменен тип данных
    date_end TEXT NOT NULL,    -- изменен тип данных
    group_name VARCHAR(200) NOT NULL,
    course INTEGER,
    weekday INTEGER NOT NULL,
    date TEXT,                 -- изменен тип данных
    subject VARCHAR(200) NOT NULL,
    lesson_type VARCHAR(200),
    subgroup INTEGER,
    time_start TIME,
    time_end TIME,
    teacher_post VARCHAR(200),
    teacher_name VARCHAR(200),
    auditory_name VARCHAR(200)
);

-- Создаем индексы для оптимизации поиска
CREATE INDEX idx_group_name ON timetable(group_name);
CREATE INDEX idx_week_number ON timetable(week_number);
CREATE INDEX idx_date ON timetable(date);
CREATE INDEX idx_teacher_name ON timetable(teacher_name);
CREATE INDEX idx_auditory_name ON timetable(auditory_name);