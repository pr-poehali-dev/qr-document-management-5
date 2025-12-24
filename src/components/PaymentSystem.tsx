import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';

interface PaymentSystemProps {
  onPaymentComplete?: (amount: number) => void;
}

export function PaymentSystem({ onPaymentComplete }: PaymentSystemProps) {
  const [balance, setBalance] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [cashBreakdown, setCashBreakdown] = useState<Record<string, number>>({
    '5000': 0,
    '2000': 0,
    '1000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '10': 0,
    '5': 0,
    '2': 0,
    '1': 0
  });

  const PAYMENT_API = 'https://functions.poehali.dev/c7d2d319-86ee-4e50-9cb5-d5643ef81dc4';

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch(`${PAYMENT_API}?action=balance&account_id=main`);
      const data = await response.json();
      setBalance(data.balance);
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось загрузить баланс", variant: "destructive" });
    }
  };

  const handleCardPayment = async () => {
    if (!cardNumber || !paymentAmount) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(PAYMENT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_payment',
          payment_type: 'card',
          amount: parseFloat(paymentAmount),
          card_number: cardNumber,
          account_id: 'main',
          description: 'Пополнение счета'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({ title: "Успешно", description: data.message });
        setBalance(data.new_balance);
        setCardNumber('');
        setPaymentAmount('');
        onPaymentComplete?.(parseFloat(paymentAmount));
      } else {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось обработать платеж", variant: "destructive" });
    }
  };

  const handleQRPayment = async () => {
    if (!qrCode || !paymentAmount) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(PAYMENT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_payment',
          payment_type: 'qr',
          amount: parseFloat(paymentAmount),
          qr_code: qrCode,
          account_id: 'main'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({ title: "Успешно", description: data.message });
        setBalance(data.new_balance);
        setQrCode('');
        setPaymentAmount('');
        onPaymentComplete?.(parseFloat(paymentAmount));
      } else {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось обработать платеж", variant: "destructive" });
    }
  };

  const calculateCashTotal = () => {
    return Object.entries(cashBreakdown).reduce((sum, [denom, count]) => {
      return sum + (parseFloat(denom) * count);
    }, 0);
  };

  const handleCashPayment = async () => {
    const total = calculateCashTotal();
    
    if (total === 0) {
      toast({ title: "Ошибка", description: "Укажите количество купюр и монет", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(PAYMENT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_payment',
          payment_type: 'cash',
          amount: total,
          cash_details: cashBreakdown,
          account_id: 'main'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({ title: "Успешно", description: `${data.message}\n${data.breakdown.join(', ')}` });
        setBalance(data.new_balance);
        setCashBreakdown({
          '5000': 0, '2000': 0, '1000': 0, '500': 0, '200': 0,
          '100': 0, '50': 0, '10': 0, '5': 0, '2': 0, '1': 0
        });
        setShowCashDialog(false);
        onPaymentComplete?.(total);
      } else {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось обработать платеж", variant: "destructive" });
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawPhone || !withdrawAmount) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(PAYMENT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'withdraw',
          amount: parseFloat(withdrawAmount),
          phone: withdrawPhone,
          account_id: 'main'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({ title: "Успешно", description: data.message });
        setBalance(data.new_balance);
        setWithdrawPhone('');
        setWithdrawAmount('');
      } else {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось обработать вывод", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-600 to-purple-600 border-0 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Баланс счета</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{balance.toFixed(2)} ₽</div>
          <p className="text-sm opacity-90 mt-2">Основной счет</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="card" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
          <TabsTrigger value="card" className="data-[state=active]:bg-gray-700">Карта</TabsTrigger>
          <TabsTrigger value="qr" className="data-[state=active]:bg-gray-700">QR</TabsTrigger>
          <TabsTrigger value="cash" className="data-[state=active]:bg-gray-700">Наличные</TabsTrigger>
          <TabsTrigger value="withdraw" className="data-[state=active]:bg-gray-700">Вывод</TabsTrigger>
        </TabsList>

        <TabsContent value="card">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Оплата картой</CardTitle>
              <CardDescription className="text-gray-400">Принимаем карты всех стран</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Номер карты</Label>
                <Input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Сумма (₽)</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>

              <Button onClick={handleCardPayment} className="w-full bg-blue-600 hover:bg-blue-700">
                <Icon name="CreditCard" size={20} className="mr-2" />
                Оплатить
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Оплата по QR-коду</CardTitle>
              <CardDescription className="text-gray-400">Оплатите за конкретный предмет</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">QR-код предмета</Label>
                <Input
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  placeholder="123456789012"
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Сумма (₽)</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>

              <Button onClick={handleQRPayment} className="w-full bg-green-600 hover:bg-green-700">
                <Icon name="QrCode" size={20} className="mr-2" />
                Оплатить по QR
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Наличные</CardTitle>
              <CardDescription className="text-gray-400">Укажите количество купюр и монет</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => setShowCashDialog(true)} 
                  className="h-24 bg-purple-600 hover:bg-purple-700"
                >
                  <Icon name="Wallet" size={32} className="mr-2" />
                  <div className="text-left">
                    <div className="font-bold">Подсчет наличных</div>
                    <div className="text-xs opacity-90">Купюры и монеты</div>
                  </div>
                </Button>
                
                <Card className="bg-gray-900 border-gray-700 p-4">
                  <div className="text-sm text-gray-400">Итого:</div>
                  <div className="text-2xl font-bold text-white">{calculateCashTotal().toFixed(2)} ₽</div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Вывод средств</CardTitle>
              <CardDescription className="text-gray-400">Переведите на SIM-карту</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Номер телефона</Label>
                <Input
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  placeholder="+7 (___) ___-__-__"
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Сумма вывода (₽)</Label>
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>

              <Button onClick={handleWithdraw} className="w-full bg-red-600 hover:bg-red-700">
                <Icon name="ArrowDownToLine" size={20} className="mr-2" />
                Вывести средства
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Подсчет наличных</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(cashBreakdown).map((denom) => (
                <div key={denom} className="space-y-2">
                  <Label className="text-white flex items-center gap-2">
                    {parseFloat(denom) >= 100 ? <Icon name="Banknote" size={16} /> : <Icon name="Coins" size={16} />}
                    {denom} ₽
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCashBreakdown({...cashBreakdown, [denom]: Math.max(0, cashBreakdown[denom] - 1)})}
                      className="border-gray-600"
                    >
                      <Icon name="Minus" size={16} />
                    </Button>
                    <Input
                      type="number"
                      value={cashBreakdown[denom]}
                      onChange={(e) => setCashBreakdown({...cashBreakdown, [denom]: parseInt(e.target.value) || 0})}
                      className="text-center bg-gray-900 border-gray-600 text-white"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCashBreakdown({...cashBreakdown, [denom]: cashBreakdown[denom] + 1})}
                      className="border-gray-600"
                    >
                      <Icon name="Plus" size={16} />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-400 text-center">
                    = {(parseFloat(denom) * cashBreakdown[denom]).toFixed(2)} ₽
                  </div>
                </div>
              ))}
            </div>

            <Card className="bg-gray-900 border-gray-700 p-4">
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">Итого:</span>
                <span className="text-2xl font-bold text-green-400">{calculateCashTotal().toFixed(2)} ₽</span>
              </div>
            </Card>

            <Button onClick={handleCashPayment} className="w-full bg-green-600 hover:bg-green-700" size="lg">
              <Icon name="Check" size={20} className="mr-2" />
              Принять наличные
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
