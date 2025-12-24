-- Создание таблиц для системы управления QR-документами

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);

-- Таблица предметов/товаров
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    qr_code VARCHAR(12) NOT NULL UNIQUE,
    item_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    client_email VARCHAR(255),
    department VARCHAR(50) NOT NULL,
    deposit_amount DECIMAL(10, 2) DEFAULT 0,
    return_amount DECIMAL(10, 2) DEFAULT 0,
    deposit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    return_date TIMESTAMP,
    expected_return_date DATE,
    status VARCHAR(20) DEFAULT 'stored',
    created_by VARCHAR(255),
    discount DECIMAL(5, 2) DEFAULT 0,
    transferred_to VARCHAR(255)
);

-- Таблица клиентов
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    bonus_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица архива (постоянное хранение)
CREATE TABLE IF NOT EXISTS archive (
    id SERIAL PRIMARY KEY,
    original_item_id INTEGER,
    qr_code VARCHAR(12) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    client_email VARCHAR(255),
    department VARCHAR(50) NOT NULL,
    deposit_amount DECIMAL(10, 2),
    return_amount DECIMAL(10, 2),
    deposit_date TIMESTAMP,
    return_date TIMESTAMP,
    status VARCHAR(20),
    created_by VARCHAR(255),
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица SMS-уведомлений
CREATE TABLE IF NOT EXISTS sms_notifications (
    id SERIAL PRIMARY KEY,
    client_phone VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_by VARCHAR(255),
    status VARCHAR(20) DEFAULT 'sent'
);

-- Таблица расписания сотрудников
CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица чатов с клиентами
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    client_phone VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    sender_role VARCHAR(50) NOT NULL,
    sender_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица заказов/записей клиентов
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    client_phone VARCHAR(50) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    service_type VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_items_qr_code ON items(qr_code);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_client_phone ON items(client_phone);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_archive_qr_code ON archive(qr_code);

-- Вставка начальных пользователей
INSERT INTO users (username, role, full_name) VALUES
    ('nikitovsky', 'nikitovsky', 'Никитовский'),
    ('creator', 'creator', 'Создатель')
ON CONFLICT (username) DO NOTHING;