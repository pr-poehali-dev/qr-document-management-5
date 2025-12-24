import json
import os
import psycopg2
from typing import Dict, Any
from decimal import Decimal

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Платежная система для обработки оплат
    Поддержка: карты, QR-оплата, наличные, монеты
    '''
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        if method == 'GET':
            action = event.get('queryStringParameters', {}).get('action', 'balance')
            account_id = event.get('queryStringParameters', {}).get('account_id', 'main')
            
            if action == 'balance':
                cur.execute(
                    "SELECT balance FROM payment_accounts WHERE account_id = %s",
                    (account_id,)
                )
                result = cur.fetchone()
                balance = float(result[0]) if result else 0.0
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'balance': balance, 'account_id': account_id}),
                    'isBase64Encoded': False
                }
            
            elif action == 'transactions':
                cur.execute(
                    "SELECT id, amount, payment_type, description, created_at FROM transactions WHERE account_id = %s ORDER BY created_at DESC LIMIT 50",
                    (account_id,)
                )
                transactions = []
                for row in cur.fetchall():
                    transactions.append({
                        'id': row[0],
                        'amount': float(row[1]),
                        'type': row[2],
                        'description': row[3],
                        'date': row[4].isoformat()
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'transactions': transactions}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'process_payment':
                payment_type = body.get('payment_type')
                amount = Decimal(str(body.get('amount', 0)))
                qr_code = body.get('qr_code')
                account_id = body.get('account_id', 'main')
                description = body.get('description', '')
                
                if payment_type == 'card':
                    card_number = body.get('card_number', '')
                    result = process_card_payment(cur, conn, amount, card_number, account_id, description)
                
                elif payment_type == 'qr':
                    result = process_qr_payment(cur, conn, amount, qr_code, account_id)
                
                elif payment_type == 'cash':
                    cash_details = body.get('cash_details', {})
                    result = process_cash_payment(cur, conn, amount, cash_details, account_id)
                
                else:
                    result = {'success': False, 'error': 'Unknown payment type'}
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200 if result.get('success') else 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(result),
                    'isBase64Encoded': False
                }
            
            elif action == 'withdraw':
                amount = Decimal(str(body.get('amount', 0)))
                phone = body.get('phone')
                account_id = body.get('account_id', 'main')
                
                cur.execute(
                    "SELECT balance FROM payment_accounts WHERE account_id = %s FOR UPDATE",
                    (account_id,)
                )
                result = cur.fetchone()
                current_balance = result[0] if result else Decimal('0')
                
                if current_balance >= amount:
                    new_balance = current_balance - amount
                    
                    cur.execute(
                        "UPDATE payment_accounts SET balance = %s WHERE account_id = %s",
                        (new_balance, account_id)
                    )
                    
                    cur.execute(
                        "INSERT INTO transactions (account_id, amount, payment_type, description, created_at) VALUES (%s, %s, %s, %s, NOW())",
                        (account_id, -amount, 'withdrawal', f'Вывод на {phone}')
                    )
                    
                    conn.commit()
                    
                    response = {
                        'success': True,
                        'new_balance': float(new_balance),
                        'message': f'Выведено {amount} ₽ на {phone}'
                    }
                else:
                    response = {
                        'success': False,
                        'error': 'Insufficient funds',
                        'balance': float(current_balance)
                    }
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200 if response.get('success') else 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(response),
                    'isBase64Encoded': False
                }
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid request'}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def process_card_payment(cur, conn, amount: Decimal, card_number: str, account_id: str, description: str) -> Dict:
    try:
        cur.execute(
            "SELECT balance FROM payment_accounts WHERE account_id = %s FOR UPDATE",
            (account_id,)
        )
        result = cur.fetchone()
        current_balance = result[0] if result else Decimal('0')
        
        if not result:
            cur.execute(
                "INSERT INTO payment_accounts (account_id, balance) VALUES (%s, %s)",
                (account_id, Decimal('0'))
            )
            current_balance = Decimal('0')
        
        new_balance = current_balance + amount
        
        cur.execute(
            "UPDATE payment_accounts SET balance = %s WHERE account_id = %s",
            (new_balance, account_id)
        )
        
        cur.execute(
            "INSERT INTO transactions (account_id, amount, payment_type, description, created_at) VALUES (%s, %s, %s, %s, NOW())",
            (account_id, amount, 'card', description or f'Оплата картой {card_number[-4:]}')
        )
        
        conn.commit()
        
        return {
            'success': True,
            'transaction_id': cur.lastrowid,
            'new_balance': float(new_balance),
            'message': f'Оплата {amount} ₽ принята'
        }
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}

def process_qr_payment(cur, conn, amount: Decimal, qr_code: str, account_id: str) -> Dict:
    try:
        cur.execute(
            "SELECT item_name, client_name FROM items WHERE qr_code = %s",
            (qr_code,)
        )
        item = cur.fetchone()
        
        if not item:
            return {'success': False, 'error': 'QR-код не найден'}
        
        item_name, client_name = item
        
        cur.execute(
            "SELECT balance FROM payment_accounts WHERE account_id = %s FOR UPDATE",
            (account_id,)
        )
        result = cur.fetchone()
        current_balance = result[0] if result else Decimal('0')
        
        if not result:
            cur.execute(
                "INSERT INTO payment_accounts (account_id, balance) VALUES (%s, %s)",
                (account_id, Decimal('0'))
            )
            current_balance = Decimal('0')
        
        new_balance = current_balance + amount
        
        cur.execute(
            "UPDATE payment_accounts SET balance = %s WHERE account_id = %s",
            (new_balance, account_id)
        )
        
        cur.execute(
            "INSERT INTO transactions (account_id, amount, payment_type, description, created_at) VALUES (%s, %s, %s, %s, NOW())",
            (account_id, amount, 'qr', f'Оплата по QR: {item_name} ({client_name})')
        )
        
        conn.commit()
        
        return {
            'success': True,
            'transaction_id': cur.lastrowid,
            'new_balance': float(new_balance),
            'item': item_name,
            'message': f'Оплата {amount} ₽ за {item_name}'
        }
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}

def process_cash_payment(cur, conn, amount: Decimal, cash_details: Dict, account_id: str) -> Dict:
    try:
        total_calculated = Decimal('0')
        breakdown = []
        
        denominations = {
            '5000': 5000,
            '2000': 2000,
            '1000': 1000,
            '500': 500,
            '200': 200,
            '100': 100,
            '50': 50,
            '10': 10,
            '5': 5,
            '2': 2,
            '1': 1
        }
        
        for denom, value in denominations.items():
            count = cash_details.get(denom, 0)
            if count > 0:
                total_calculated += Decimal(str(value * count))
                breakdown.append(f'{denom}₽ x {count}')
        
        if total_calculated != amount:
            return {
                'success': False,
                'error': f'Несоответствие суммы. Указано: {amount}, Подсчитано: {total_calculated}'
            }
        
        cur.execute(
            "SELECT balance FROM payment_accounts WHERE account_id = %s FOR UPDATE",
            (account_id,)
        )
        result = cur.fetchone()
        current_balance = result[0] if result else Decimal('0')
        
        if not result:
            cur.execute(
                "INSERT INTO payment_accounts (account_id, balance) VALUES (%s, %s)",
                (account_id, Decimal('0'))
            )
            current_balance = Decimal('0')
        
        new_balance = current_balance + amount
        
        cur.execute(
            "UPDATE payment_accounts SET balance = %s WHERE account_id = %s",
            (new_balance, account_id)
        )
        
        cur.execute(
            "INSERT INTO transactions (account_id, amount, payment_type, description, created_at) VALUES (%s, %s, %s, %s, NOW())",
            (account_id, amount, 'cash', f"Наличные: {', '.join(breakdown)}")
        )
        
        conn.commit()
        
        return {
            'success': True,
            'transaction_id': cur.lastrowid,
            'new_balance': float(new_balance),
            'breakdown': breakdown,
            'message': f'Принято {amount} ₽ наличными'
        }
    except Exception as e:
        conn.rollback()
        return {'success': False, 'error': str(e)}
