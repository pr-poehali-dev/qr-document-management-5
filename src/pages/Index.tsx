import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';

type UserRole = 'client' | 'cashier' | 'admin' | 'creator' | 'nikitovsky' | null;

interface Item {
  id: string;
  qrCode: string;
  itemName: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  department: 'documents' | 'photos' | 'other';
  depositAmount: number;
  returnAmount: number;
  depositDate: string;
  returnDate?: string;
  status: 'stored' | 'returned';
  createdBy: string;
  discount?: number;
}

interface Client {
  phone: string;
  name: string;
  bonusPoints: number;
}

const PASSWORDS = {
  cashier: '25',
  admin: '2025',
  creator: '202505',
  nikitovsky: '20252025'
};

const DEPARTMENT_LIMITS = {
  documents: 100,
  photos: 100,
  other: 1000
};

const Index = () => {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [archive, setArchive] = useState<Item[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [currentQR, setCurrentQR] = useState('');
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);

  const [newItem, setNewItem] = useState({
    itemName: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    department: 'documents' as 'documents' | 'photos' | 'other',
    depositAmount: 0,
    returnAmount: 0,
    returnDate: ''
  });

  useEffect(() => {
    if (lockoutTime !== null) {
      const timer = setInterval(() => {
        const remaining = Math.max(0, lockoutTime - Date.now());
        if (remaining === 0) {
          setLockoutTime(null);
          setLoginAttempts(0);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  const handleLogin = (role: UserRole, username: string, password: string) => {
    if (lockoutTime && Date.now() < lockoutTime) {
      toast({
        title: "Доступ заблокирован",
        description: `Попробуйте через ${Math.ceil((lockoutTime - Date.now()) / 1000)} сек`,
        variant: "destructive"
      });
      return;
    }

    if (role === 'client') {
      const client = clients.find(c => c.phone === username);
      if (client) {
        setUserRole('client');
        setCurrentUser(client.name);
        setLoginAttempts(0);
        toast({ title: "Добро пожаловать!", description: `Вы вошли как клиент` });
      } else {
        handleFailedLogin();
      }
      return;
    }

    const correctPassword = PASSWORDS[role as keyof typeof PASSWORDS];
    if (password === correctPassword) {
      setUserRole(role);
      setCurrentUser(username);
      setLoginAttempts(0);
      toast({ title: "Вход выполнен", description: `Добро пожаловать, ${username}` });
    } else {
      handleFailedLogin();
    }
  };

  const handleFailedLogin = () => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    
    if (newAttempts >= 3) {
      setLockoutTime(Date.now() + 90000);
      toast({
        title: "Доступ заблокирован",
        description: "Слишком много попыток. Доступ заблокирован на 90 секунд",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Неверные данные",
        description: `Осталось попыток: ${3 - newAttempts}`,
        variant: "destructive"
      });
    }
  };

  const generateQRCode = () => {
    return `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
  };

  const handleCreateItem = () => {
    const departmentItems = items.filter(i => i.department === newItem.department && i.status === 'stored');
    const limit = DEPARTMENT_LIMITS[newItem.department];
    
    if (departmentItems.length >= limit) {
      toast({
        title: "Отдел заполнен",
        description: `Достигнут лимит отдела (${limit} предметов)`,
        variant: "destructive"
      });
      return;
    }

    const qrCode = generateQRCode();
    const item: Item = {
      id: crypto.randomUUID(),
      qrCode,
      ...newItem,
      depositDate: new Date().toISOString(),
      status: 'stored',
      createdBy: currentUser
    };

    setItems([...items, item]);
    setArchive([...archive, item]);
    setCurrentQR(qrCode);
    setShowQRDialog(true);
    setShowNewItemDialog(false);
    
    const existingClient = clients.find(c => c.phone === newItem.clientPhone);
    if (!existingClient) {
      setClients([...clients, { phone: newItem.clientPhone, name: newItem.clientName, bonusPoints: 0 }]);
    }

    toast({ title: "Предмет принят", description: `QR-код: ${qrCode}` });
    
    setNewItem({
      itemName: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      department: 'documents',
      depositAmount: 0,
      returnAmount: 0,
      returnDate: ''
    });
  };

  const handleReturnItem = (qrCode: string) => {
    const item = items.find(i => i.qrCode === qrCode && i.status === 'stored');
    if (!item) {
      toast({ title: "Ошибка", description: "Предмет не найден", variant: "destructive" });
      return;
    }

    const updatedItems = items.map(i => 
      i.qrCode === qrCode ? { ...i, status: 'returned' as const, returnDate: new Date().toISOString() } : i
    );
    setItems(updatedItems);
    
    const updatedArchive = archive.map(i => 
      i.qrCode === qrCode ? { ...i, status: 'returned' as const, returnDate: new Date().toISOString() } : i
    );
    setArchive(updatedArchive);

    const speech = new SpeechSynthesisUtterance(`Номер ${qrCode}`);
    speech.lang = 'ru-RU';
    window.speechSynthesis.speak(speech);

    toast({ title: "Предмет выдан", description: `QR: ${qrCode}` });
  };

  const canDelete = userRole === 'admin' || userRole === 'creator' || userRole === 'nikitovsky';
  const canManageClients = userRole === 'admin' || userRole === 'creator' || userRole === 'nikitovsky';

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-2">
              <Icon name="QrCode" className="text-white" size={32} />
            </div>
            <CardTitle className="text-2xl font-bold">Система управления QR-документами</CardTitle>
            <CardDescription>Выберите роль и войдите в систему</CardDescription>
          </CardHeader>
          <CardContent>
            {lockoutTime && Date.now() < lockoutTime && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <Icon name="AlertTriangle" className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Доступ заблокирован на {Math.ceil((lockoutTime - Date.now()) / 1000)} сек
                </AlertDescription>
              </Alert>
            )}

            <Select value={selectedRole || ''} onValueChange={(value) => setSelectedRole(value as UserRole)}>
              <SelectTrigger className="mb-4">
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Клиент</SelectItem>
                <SelectItem value="cashier">Кассир</SelectItem>
                <SelectItem value="admin">Администратор</SelectItem>
                <SelectItem value="creator">Создатель</SelectItem>
                <SelectItem value="nikitovsky">Никитовский</SelectItem>
              </SelectContent>
            </Select>

            {selectedRole && (
              <LoginForm 
                role={selectedRole} 
                onLogin={handleLogin}
                disabled={lockoutTime !== null && Date.now() < lockoutTime}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Icon name="QrCode" className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">QR-Документы</h1>
              <p className="text-sm text-slate-500">{currentUser}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {userRole === 'client' && 'Клиент'}
              {userRole === 'cashier' && 'Кассир'}
              {userRole === 'admin' && 'Администратор'}
              {userRole === 'creator' && 'Создатель'}
              {userRole === 'nikitovsky' && 'Никитовский'}
            </Badge>
            <Button variant="outline" onClick={() => setUserRole(null)}>
              <Icon name="LogOut" size={16} className="mr-2" />
              Выход
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="main" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="main">Главная</TabsTrigger>
            <TabsTrigger value="management">Управление</TabsTrigger>
            <TabsTrigger value="archive">Архив</TabsTrigger>
            {canManageClients && <TabsTrigger value="clients">Клиенты</TabsTrigger>}
          </TabsList>

          <TabsContent value="main" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Документы</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {items.filter(i => i.department === 'documents' && i.status === 'stored').length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">из {DEPARTMENT_LIMITS.documents}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Фото/Карты</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {items.filter(i => i.department === 'photos' && i.status === 'stored').length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">из {DEPARTMENT_LIMITS.photos}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Другое</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {items.filter(i => i.department === 'other' && i.status === 'stored').length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">из {DEPARTMENT_LIMITS.other}</p>
                </CardContent>
              </Card>
            </div>

            {userRole !== 'client' && (
              <Card>
                <CardHeader>
                  <CardTitle>Прием предметов</CardTitle>
                  <CardDescription>Создайте новую запись для хранения</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setShowNewItemDialog(true)} className="w-full" size="lg">
                    <Icon name="Plus" size={20} className="mr-2" />
                    Принять предмет
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Выдача предметов</CardTitle>
                <CardDescription>Введите QR-код для выдачи</CardDescription>
              </CardHeader>
              <CardContent>
                <ReturnItemForm onReturn={handleReturnItem} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Активные предметы</CardTitle>
              </CardHeader>
              <CardContent>
                <ItemsTable 
                  items={userRole === 'client' 
                    ? items.filter(i => i.status === 'stored' && i.clientPhone === clients.find(c => c.name === currentUser)?.phone)
                    : items.filter(i => i.status === 'stored')
                  } 
                  onReturn={handleReturnItem}
                  onShowQR={(qr) => { setCurrentQR(qr); setShowQRDialog(true); }}
                  canDelete={canDelete}
                  userRole={userRole}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="management">
            <Card>
              <CardHeader>
                <CardTitle>Управление системой</CardTitle>
                <CardDescription>Настройки и администрирование</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <Icon name="Settings" size={24} />
                    <span>Настройки</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <Icon name="FileText" size={24} />
                    <span>Печать анкет</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <Icon name="CreditCard" size={24} />
                    <span>Скидочные карты</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2">
                    <Icon name="Mail" size={24} />
                    <span>Уведомления SMS</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archive">
            <Card>
              <CardHeader>
                <CardTitle>Архив операций</CardTitle>
                <CardDescription>Постоянное хранение всех записей</CardDescription>
              </CardHeader>
              <CardContent>
                <ItemsTable 
                  items={archive} 
                  onReturn={() => {}}
                  onShowQR={(qr) => { setCurrentQR(qr); setShowQRDialog(true); }}
                  canDelete={false}
                  isArchive
                  userRole={userRole}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {canManageClients && (
            <TabsContent value="clients">
              <Card>
                <CardHeader>
                  <CardTitle>Управление клиентами</CardTitle>
                  <CardDescription>Список зарегистрированных клиентов</CardDescription>
                </CardHeader>
                <CardContent>
                  <ClientsTable clients={clients} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR-код создан</DialogTitle>
            <DialogDescription>Сохраните этот код для получения предмета</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-48 h-48 bg-slate-100 border-2 border-slate-300 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Icon name="QrCode" size={64} className="mx-auto mb-2 text-slate-600" />
                <p className="font-mono text-sm font-bold text-slate-700">{currentQR}</p>
              </div>
            </div>
            <Button onClick={() => setShowQRDialog(false)} className="w-full">Закрыть</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Прием предмета</DialogTitle>
            <DialogDescription>Заполните анкету для регистрации предмета</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="itemName">Наименование предмета *</Label>
              <Input 
                id="itemName" 
                value={newItem.itemName}
                onChange={(e) => setNewItem({...newItem, itemName: e.target.value})}
                placeholder="Например: Паспорт, Документы"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department">Отдел *</Label>
              <Select value={newItem.department} onValueChange={(value: any) => setNewItem({...newItem, department: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documents">Документы</SelectItem>
                  <SelectItem value="photos">Фото/Карты</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientName">ФИО клиента *</Label>
              <Input 
                id="clientName" 
                value={newItem.clientName}
                onChange={(e) => setNewItem({...newItem, clientName: e.target.value})}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientPhone">Номер телефона *</Label>
              <Input 
                id="clientPhone" 
                type="tel"
                value={newItem.clientPhone}
                onChange={(e) => setNewItem({...newItem, clientPhone: e.target.value})}
                placeholder="+7 (___) ___-__-__"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientEmail">Email (необязательно)</Label>
              <Input 
                id="clientEmail" 
                type="email"
                value={newItem.clientEmail}
                onChange={(e) => setNewItem({...newItem, clientEmail: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="depositAmount">Оплата при сдаче (₽)</Label>
                <Input 
                  id="depositAmount" 
                  type="number"
                  value={newItem.depositAmount}
                  onChange={(e) => setNewItem({...newItem, depositAmount: Number(e.target.value)})}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="returnAmount">Оплата при получении (₽)</Label>
                <Input 
                  id="returnAmount" 
                  type="number"
                  value={newItem.returnAmount}
                  onChange={(e) => setNewItem({...newItem, returnAmount: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="returnDate">Дата получения</Label>
              <Input 
                id="returnDate" 
                type="date"
                value={newItem.returnDate}
                onChange={(e) => setNewItem({...newItem, returnDate: e.target.value})}
              />
            </div>

            <Button onClick={handleCreateItem} className="w-full" size="lg">
              <Icon name="Check" size={20} className="mr-2" />
              Принять предмет и создать QR-код
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function LoginForm({ role, onLogin, disabled }: { role: UserRole; onLogin: (role: UserRole, username: string, password: string) => void; disabled: boolean }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(role, username, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">
          {role === 'client' ? 'Номер телефона' : 'Имя пользователя'}
        </Label>
        <Input
          id="username"
          type={role === 'client' ? 'tel' : 'text'}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={role === 'client' ? '+7 (___) ___-__-__' : 'Введите имя'}
          disabled={disabled}
          required
        />
      </div>

      {role !== 'client' && (
        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            disabled={disabled}
            required
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={disabled}>
        <Icon name="LogIn" size={16} className="mr-2" />
        Войти
      </Button>
    </form>
  );
}

function ReturnItemForm({ onReturn }: { onReturn: (qr: string) => void }) {
  const [qrCode, setQrCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrCode.trim()) {
      onReturn(qrCode.trim());
      setQrCode('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={qrCode}
        onChange={(e) => setQrCode(e.target.value)}
        placeholder="Введите QR-код"
        className="flex-1"
      />
      <Button type="submit">
        <Icon name="CheckCircle" size={16} className="mr-2" />
        Выдать
      </Button>
    </form>
  );
}

function ItemsTable({ items, onReturn, onShowQR, canDelete, isArchive = false, userRole }: { 
  items: Item[]; 
  onReturn: (qr: string) => void;
  onShowQR: (qr: string) => void;
  canDelete: boolean;
  isArchive?: boolean;
  userRole: UserRole;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Icon name="Package" size={48} className="mx-auto mb-4 opacity-50" />
        <p>Нет предметов</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>QR-код</TableHead>
            <TableHead>Предмет</TableHead>
            <TableHead>Клиент</TableHead>
            <TableHead>Отдел</TableHead>
            <TableHead>Дата</TableHead>
            <TableHead>Статус</TableHead>
            {!isArchive && <TableHead className="text-right">Действия</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.qrCode}</TableCell>
              <TableCell className="font-medium">{item.itemName}</TableCell>
              <TableCell>{item.clientName}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {item.department === 'documents' && 'Документы'}
                  {item.department === 'photos' && 'Фото/Карты'}
                  {item.department === 'other' && 'Другое'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-slate-600">
                {new Date(item.depositDate).toLocaleDateString('ru-RU')}
              </TableCell>
              <TableCell>
                <Badge variant={item.status === 'stored' ? 'default' : 'secondary'}>
                  {item.status === 'stored' ? 'На хранении' : 'Выдан'}
                </Badge>
              </TableCell>
              {!isArchive && (
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onShowQR(item.qrCode)}>
                    <Icon name="QrCode" size={14} />
                  </Button>
                  {item.status === 'stored' && userRole !== 'client' && (
                    <Button variant="default" size="sm" onClick={() => onReturn(item.qrCode)}>
                      <Icon name="CheckCircle" size={14} className="mr-1" />
                      Выдать
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ClientsTable({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Icon name="Users" size={48} className="mx-auto mb-4 opacity-50" />
        <p>Нет зарегистрированных клиентов</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Имя</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Бонусы</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.phone}>
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell>{client.phone}</TableCell>
              <TableCell>{client.bonusPoints}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default Index;
