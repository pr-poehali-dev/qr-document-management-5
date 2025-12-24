import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Telegram-бот для системы QR-документов
    Принимает вебхуки от Telegram и обрабатывает команды
    '''
    
    method = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        
        message = body.get('message', {})
        chat_id = message.get('chat', {}).get('id')
        text = message.get('text', '')
        user_id = message.get('from', {}).get('id')
        username = message.get('from', {}).get('username', 'unknown')
        
        if not chat_id:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'ok': True}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        response_text = ''
        
        if text.startswith('/start'):
            response_text = f'''Добро пожаловать в систему QR-документов! 🎯

Доступные команды:
/status <номер_телефона> - Проверить статус ваших предметов
/qr <код> - Информация по QR-коду
/help - Помощь

Для связи с оператором напишите сообщение.'''
            
            cur.execute(
                "INSERT INTO chat_messages (client_phone, message, sender_role, sender_name, created_at) VALUES (%s, %s, %s, %s, NOW())",
                (str(user_id), text, 'telegram_user', username)
            )
            conn.commit()
        
        elif text.startswith('/status'):
            phone = text.replace('/status', '').strip()
            if phone:
                cur.execute(
                    "SELECT qr_code, item_name, status, deposit_date FROM items WHERE client_phone = %s ORDER BY deposit_date DESC",
                    (phone,)
                )
                items = cur.fetchall()
                
                if items:
                    response_text = f"Ваши предметы:\n\n"
                    for item in items:
                        qr, name, status, date = item
                        status_ru = 'На хранении' if status == 'stored' else 'Выдан'
                        response_text += f"📦 {name}\n🔢 QR: {qr}\n📊 {status_ru}\n📅 {date.strftime('%d.%m.%Y')}\n\n"
                else:
                    response_text = "У вас нет предметов в хранилище"
            else:
                response_text = "Укажите номер телефона: /status +79001234567"
        
        elif text.startswith('/qr'):
            qr_code = text.replace('/qr', '').strip()
            if qr_code:
                cur.execute(
                    "SELECT item_name, client_name, status, deposit_date FROM items WHERE qr_code = %s",
                    (qr_code,)
                )
                item = cur.fetchone()
                
                if item:
                    name, client, status, date = item
                    status_ru = 'На хранении' if status == 'stored' else 'Выдан'
                    response_text = f'''Информация о предмете:
📦 {name}
👤 {client}
📊 {status_ru}
📅 {date.strftime('%d.%m.%Y')}'''
                else:
                    response_text = "Предмет не найден"
            else:
                response_text = "Укажите QR-код: /qr 123456789012"
        
        elif text.startswith('/help'):
            response_text = '''Помощь по боту:

/status <телефон> - Статус предметов
/qr <код> - Информация по QR
/help - Эта справка

Для связи с оператором просто напишите сообщение.'''
        
        else:
            cur.execute(
                "INSERT INTO chat_messages (client_phone, message, sender_role, sender_name, created_at) VALUES (%s, %s, %s, %s, NOW())",
                (str(user_id), text, 'telegram_user', username)
            )
            conn.commit()
            
            response_text = "Ваше сообщение отправлено оператору. Ожидайте ответа."
        
        cur.close()
        conn.close()
        
        send_telegram_message(chat_id, response_text)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'ok': True}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def send_telegram_message(chat_id: int, text: str):
    import urllib.request
    import urllib.parse
    
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    url = f'https://api.telegram.org/bot{token}/sendMessage'
    
    data = urllib.parse.urlencode({
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'HTML'
    }).encode()
    
    try:
        req = urllib.request.Request(url, data=data)
        urllib.request.urlopen(req)
    except:
        pass
