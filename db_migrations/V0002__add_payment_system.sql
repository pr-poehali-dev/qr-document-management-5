-- Создание таблиц для платежной системы

-- Таблица платежных аккаунтов
CREATE TABLE IF NOT EXISTS payment_accounts (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL UNIQUE,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица транзакций
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES payment_accounts(account_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- Создание основного аккаунта
INSERT INTO payment_accounts (account_id, balance) VALUES ('main', 0.00)
ON CONFLICT (account_id) DO NOTHING;