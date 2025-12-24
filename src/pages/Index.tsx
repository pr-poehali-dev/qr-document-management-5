import { useState, useEffect, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';
import { ChatSystem } from '@/components/ChatSystem';
import { PaymentSystem } from '@/components/PaymentSystem';

type UserRole = 'client' | 'cashier' | 'head_cashier' | 'admin' | 'creator' | 'nikitovsky' | 'superadmin' | 
  'manager' | 'support' | 'specialist' | 'technician' | 'operator' | 'coordinator' | 'analyst' | 
  'supervisor' | 'controller' | 'assistant' | 'receptionist' | 'clerk' | 'agent' | null;

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
  expectedReturnDate?: string;
  status: 'stored' | 'returned';
  createdBy: string;
  discount?: number;
  transferredTo?: string;
}

interface Client {
  phone: string;
  name: string;
  email?: string;
  bonusPoints: number;
}

interface User {
  username: string;
  role: UserRole;
  fullName: string;
  isBlocked: boolean;
}

interface Schedule {
  username: string;
  workDate: string;
  startTime: string;
  endTime: string;
}

interface ChatMessage {
  clientPhone: string;
  message: string;
  senderRole: string;
  senderName: string;
  createdAt: string;
}

const PASSWORDS: Record<string, string> = {
  cashier: '25',
  head_cashier: '202520',
  admin: '2025',
  creator: '202505',
  nikitovsky: '20252025',
  superadmin: '2505',
  manager: '25',
  support: '25',
  specialist: '25',
  technician: '25',
  operator: '25',
  coordinator: '25',
  analyst: '25',
  supervisor: '25',
  controller: '25',
  assistant: '25',
  receptionist: '25',
  clerk: '25',
  agent: '25'
};

const ROLE_NAMES: Record<string, string> = {
  client: 'Клиент',
  cashier: 'Кассир',
  head_cashier: 'Главный кассир',
  admin: 'Администратор',
  creator: 'Создатель',
  nikitovsky: 'Никитовский',
  superadmin: 'Супер-админ 24',
  manager: 'Менеджер',
  support: 'Поддержка',
  specialist: 'Специалист',
  technician: 'Техник',
  operator: 'Оператор',
  coordinator: 'Координатор',
  analyst: 'Аналитик',
  supervisor: 'Супервайзер',
  controller: 'Контролер',
  assistant: 'Ассистент',
  receptionist: 'Администратор зала',
  clerk: 'Клерк',
  agent: 'Агент'
};

const DEPARTMENT_LIMITS = {
  documents: 100,
  photos: 100,
  other: 90
};

const MUSIC_PLAYLIST = [
  'https://cdn.poehali.dev/projects/d8db035b-4f3f-4320-946f-f65eee67ced7/bucket/Fiksaj_Vremya.mp3',
  'https://cdn.poehali.dev/projects/d8db035b-4f3f-4320-946f-f65eee67ced7/bucket/Fiksaj_Mednyj_gorod.mp3',
  'https://cdn.poehali.dev/projects/d8db035b-4f3f-4320-946f-f65eee67ced7/bucket/Фиксай моя жизнь моё шоу.MP3'
];

const Index = () => {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [archive, setArchive] = useState<Item[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([
    { username: 'nikitovsky', role: 'nikitovsky', fullName: 'Никитовский', isBlocked: false },
    { username: 'creator', role: 'creator', fullName: 'Создатель', isBlocked: false }
  ]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [currentQR, setCurrentQR] = useState('');
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [showSMSDialog, setShowSMSDialog] = useState(false);
  const [showScannerDialog, setShowScannerDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [selectedClientForChat, setSelectedClientForChat] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [volume, setVolume] = useState(40);
  const [isPlaying, setIsPlaying] = useState(false);

  const [newItem, setNewItem] = useState({
    itemName: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    department: 'documents' as 'documents' | 'photos' | 'other',
    depositAmount: 0,
    returnAmount: 0,
    expectedReturnDate: ''
  });

  const [newUser, setNewUser] = useState({
    username: '',
    role: 'cashier' as UserRole,
    fullName: ''
  });

  const [newSchedule, setNewSchedule] = useState({
    username: '',
    workDate: '',
    startTime: '09:00',
    endTime: '18:00'
  });

  const [smsMessage, setSmsMessage] = useState({
    clientPhone: '',
    message: ''
  });

  const [scannerInput, setScannerInput] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (userRole && audioRef.current && !isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [userRole]);

  const handleTrackEnd = () => {
    setCurrentTrack((prev) => (prev + 1) % MUSIC_PLAYLIST.length);
  };

  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % MUSIC_PLAYLIST.length);
  };

  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + MUSIC_PLAYLIST.length) % MUSIC_PLAYLIST.length);
  };

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
        toast({ title: "Ошибка", description: "Клиент не найден", variant: "destructive" });
      }
      return;
    }

    const user = users.find(u => u.username === username);
    if (!user) {
      toast({ title: "Ошибка", description: "Пользователь не зарегистрирован", variant: "destructive" });
      return;
    }

    if (user.isBlocked) {
      toast({ title: "Доступ запрещен", description: "Пользователь заблокирован", variant: "destructive" });
      return;
    }

    const correctPassword = PASSWORDS[role as keyof typeof PASSWORDS];
    if (password === correctPassword) {
      setUserRole(role);
      setCurrentUser(username);
      setLoginAttempts(0);
      toast({ title: "Вход выполнен", description: `Добро пожаловать, ${user.fullName}` });
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
    return Math.random().toString().slice(2, 14);
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
      expectedReturnDate: ''
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

  const handleCreateUser = () => {
    if (users.find(u => u.username === newUser.username)) {
      toast({ title: "Ошибка", description: "Пользователь уже существует", variant: "destructive" });
      return;
    }

    const user: User = {
      ...newUser,
      isBlocked: false
    };

    setUsers([...users, user]);
    setShowCreateUserDialog(false);
    toast({ title: "Успешно", description: `Пользователь ${newUser.fullName} создан` });
    
    setNewUser({
      username: '',
      role: 'cashier',
      fullName: ''
    });
  };

  const handleBlockUser = (username: string) => {
    setUsers(users.map(u => u.username === username ? { ...u, isBlocked: !u.isBlocked } : u));
    toast({ title: "Обновлено", description: "Статус пользователя изменен" });
  };

  const handleCreateSchedule = () => {
    setSchedules([...schedules, newSchedule]);
    setShowScheduleDialog(false);
    toast({ title: "Расписание создано", description: `Для ${newSchedule.username}` });
    
    setNewSchedule({
      username: '',
      workDate: '',
      startTime: '09:00',
      endTime: '18:00'
    });
  };

  const handleSendSMS = () => {
    toast({ title: "SMS отправлено", description: `На номер ${smsMessage.clientPhone}` });
    setSmsMessage({ clientPhone: '', message: '' });
    setShowSMSDialog(false);
  };

  const handleScanQR = () => {
    if (scannerInput.trim()) {
      handleReturnItem(scannerInput.trim());
      setScannerInput('');
      setShowScannerDialog(false);
    }
  };

  const handlePrintForm = () => {
    window.print();
    toast({ title: "Печать", description: "Анкета отправлена на печать" });
  };

  const fetchBalance = () => {
    toast({ title: "Обновлено", description: "Баланс обновлен" });
  };

  const canCreateUsers = userRole === 'nikitovsky' || userRole === 'superadmin' || userRole === 'creator' || userRole === 'manager' || userRole === 'support';
  const canManageRoles = userRole === 'nikitovsky' || userRole === 'superadmin';
  const canDeleteItems = userRole === 'admin' || userRole === 'creator' || userRole === 'nikitovsky' || userRole === 'superadmin';
  const canReturnItems = userRole !== 'client';
  const canCreateSchedule = userRole === 'nikitovsky' || userRole === 'superadmin';
  const canAccessChat = ['manager', 'support', 'specialist', 'technician'].includes(userRole || '');

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <audio ref={audioRef} src={MUSIC_PLAYLIST[currentTrack]} onEnded={handleTrackEnd} loop={false} />
        
        <Card className="w-full max-w-md shadow-2xl border-gray-700 bg-gray-900">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-2">
              <Icon name="QrCode" className="text-white" size={32} />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Система управления QR-документами</CardTitle>
            <CardDescription className="text-gray-400">Выберите роль и войдите в систему</CardDescription>
          </CardHeader>
          <CardContent>
            {lockoutTime && Date.now() < lockoutTime && (
              <Alert className="mb-4 border-red-900 bg-red-950">
                <Icon name="AlertTriangle" className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  Доступ заблокирован на {Math.ceil((lockoutTime - Date.now()) / 1000)} сек
                </AlertDescription>
              </Alert>
            )}

            <Select value={selectedRole || ''} onValueChange={(value) => setSelectedRole(value as UserRole)}>
              <SelectTrigger className="mb-4 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="client" className="text-white">Клиент</SelectItem>
                <SelectItem value="cashier" className="text-white">Кассир</SelectItem>
                <SelectItem value="head_cashier" className="text-white">Главный кассир</SelectItem>
                <SelectItem value="admin" className="text-white">Администратор</SelectItem>
                <SelectItem value="creator" className="text-white">Создатель</SelectItem>
                <SelectItem value="nikitovsky" className="text-white">Никитовский/24</SelectItem>
                <SelectItem value="manager" className="text-white">Менеджер</SelectItem>
                <SelectItem value="support" className="text-white">Поддержка</SelectItem>
                <SelectItem value="specialist" className="text-white">Специалист</SelectItem>
                <SelectItem value="technician" className="text-white">Техник</SelectItem>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <audio ref={audioRef} src={MUSIC_PLAYLIST[currentTrack]} onEnded={handleTrackEnd} />
      
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-700 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Icon name="QrCode" className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">QR-Документы</h1>
                <p className="text-sm text-gray-400">{currentUser} • {ROLE_NAMES[userRole || '']}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right mr-4">
                <div className="text-sm font-mono">{currentTime.toLocaleTimeString('ru-RU')}</div>
                <div className="text-xs text-gray-400">{currentTime.toLocaleDateString('ru-RU')}</div>
              </div>
              
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                <Button variant="ghost" size="sm" onClick={prevTrack}>
                  <Icon name="SkipBack" size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  if (audioRef.current) {
                    if (isPlaying) {
                      audioRef.current.pause();
                      setIsPlaying(false);
                    } else {
                      audioRef.current.play();
                      setIsPlaying(true);
                    }
                  }
                }}>
                  <Icon name={isPlaying ? "Pause" : "Play"} size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={nextTrack}>
                  <Icon name="SkipForward" size={14} />
                </Button>
                <Icon name="Volume2" size={14} className="text-gray-400" />
                <Slider 
                  value={[volume]} 
                  onValueChange={(v) => setVolume(v[0])} 
                  max={100} 
                  step={1} 
                  className="w-20"
                />
                <span className="text-xs text-gray-400 w-8">{volume}%</span>
              </div>
              
              <Badge variant="outline" className="text-sm border-gray-600">
                {ROLE_NAMES[userRole]}
              </Badge>
              <Button variant="outline" onClick={() => setUserRole(null)} className="border-gray-600">
                <Icon name="LogOut" size={16} className="mr-2" />
                Выход
              </Button>
            </div>
          </div>
        </div>
      </header>

      {userRole !== 'client' && (
        <div className="bg-gray-800/50 border-b border-gray-700 py-2">
          <div className="container mx-auto px-4">
            <p className="text-xs text-gray-400">
              <strong className="text-white">Пароли:</strong> Кассир/Роли: 25 • Гл.Кассир: 202520 • Админ: 2025 • Никитовский: 20252025 • Создатель: 202505 • Супер-админ 24: 2505
            </p>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="main" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-gray-800 border-gray-700">
            <TabsTrigger value="main" className="data-[state=active]:bg-gray-700">Главная</TabsTrigger>
            <TabsTrigger value="management" className="data-[state=active]:bg-gray-700">Управление</TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-gray-700">Платежи</TabsTrigger>
            <TabsTrigger value="archive" className="data-[state=active]:bg-gray-700">Архив</TabsTrigger>
            {canCreateUsers && <TabsTrigger value="users" className="data-[state=active]:bg-gray-700">Пользователи</TabsTrigger>}
            {canAccessChat && <TabsTrigger value="chat" className="data-[state=active]:bg-gray-700">Чаты</TabsTrigger>}
          </TabsList>

          <TabsContent value="main" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-400">Документы</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {items.filter(i => i.department === 'documents' && i.status === 'stored').length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">из {DEPARTMENT_LIMITS.documents}</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-400">Фото/Карты</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {items.filter(i => i.department === 'photos' && i.status === 'stored').length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">из {DEPARTMENT_LIMITS.photos}</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-400">Другое</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">
                    {items.filter(i => i.department === 'other' && i.status === 'stored').length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">из {DEPARTMENT_LIMITS.other}</p>
                </CardContent>
              </Card>
            </div>

            {userRole !== 'client' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Прием предметов</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button onClick={() => setShowNewItemDialog(true)} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Icon name="Plus" size={20} className="mr-2" />
                      Принять предмет
                    </Button>
                    <Button onClick={handlePrintForm} variant="outline" className="w-full border-gray-600">
                      <Icon name="Printer" size={20} className="mr-2" />
                      Печать анкеты
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Выдача предметов</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button onClick={() => setShowScannerDialog(true)} className="w-full bg-green-600 hover:bg-green-700">
                      <Icon name="Scan" size={20} className="mr-2" />
                      Сканировать QR-код
                    </Button>
                    <ReturnItemForm onReturn={handleReturnItem} />
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Активные предметы</CardTitle>
              </CardHeader>
              <CardContent>
                <ItemsTable 
                  items={userRole === 'client' 
                    ? items.filter(i => i.status === 'stored' && i.clientPhone === clients.find(c => c.name === currentUser)?.phone)
                    : items.filter(i => i.status === 'stored')
                  } 
                  onReturn={handleReturnItem}
                  onShowQR={(qr) => { setCurrentQR(qr); setShowQRDialog(true); }}
                  canDelete={canDeleteItems}
                  canReturn={canReturnItems}
                  userRole={userRole}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="management">
            <div className="grid gap-4 md:grid-cols-3">
              {canCreateUsers && (
                <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition cursor-pointer" onClick={() => setShowCreateUserDialog(true)}>
                  <CardContent className="flex flex-col items-center justify-center h-32 space-y-2">
                    <Icon name="UserPlus" size={32} className="text-blue-400" />
                    <span className="font-medium">Создать пользователя</span>
                  </CardContent>
                </Card>
              )}
              
              {canCreateSchedule && (
                <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition cursor-pointer" onClick={() => setShowScheduleDialog(true)}>
                  <CardContent className="flex flex-col items-center justify-center h-32 space-y-2">
                    <Icon name="Calendar" size={32} className="text-green-400" />
                    <span className="font-medium">Расписание</span>
                  </CardContent>
                </Card>
              )}
              
              {(userRole === 'admin' || userRole === 'nikitovsky' || userRole === 'superadmin' || userRole === 'creator') && (
                <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition cursor-pointer" onClick={() => setShowSMSDialog(true)}>
                  <CardContent className="flex flex-col items-center justify-center h-32 space-y-2">
                    <Icon name="MessageSquare" size={32} className="text-purple-400" />
                    <span className="font-medium">SMS уведомления</span>
                  </CardContent>
                </Card>
              )}
              
              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center h-32 space-y-2">
                  <Icon name="CreditCard" size={32} className="text-yellow-400" />
                  <span className="font-medium">Скидочные карты</span>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center h-32 space-y-2">
                  <Icon name="Settings" size={32} className="text-gray-400" />
                  <span className="font-medium">Настройки</span>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <PaymentSystem onPaymentComplete={() => fetchBalance()} />
          </TabsContent>

          <TabsContent value="archive">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Архив операций</CardTitle>
                <CardDescription className="text-gray-400">Постоянное хранение всех записей</CardDescription>
              </CardHeader>
              <CardContent>
                <ItemsTable 
                  items={archive} 
                  onReturn={() => {}}
                  onShowQR={(qr) => { setCurrentQR(qr); setShowQRDialog(true); }}
                  canDelete={false}
                  canReturn={false}
                  isArchive
                  userRole={userRole}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {canCreateUsers && (
            <TabsContent value="users">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Управление пользователями</CardTitle>
                </CardHeader>
                <CardContent>
                  <UsersTable users={users} onBlock={handleBlockUser} canManage={canManageRoles} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canAccessChat && (
            <TabsContent value="chat">
              <ChatSystem currentUser={currentUser} userRole={userRole || ''} />
            </TabsContent>
          )}
          
          {userRole === 'client' && (
            <TabsContent value="chat">
              <ChatSystem currentUser={currentUser} userRole={userRole} clientPhone={clients.find(c => c.name === currentUser)?.phone} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">QR-код создан</DialogTitle>
            <DialogDescription className="text-gray-400">Сохраните этот код для получения предмета</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-48 h-48 bg-gray-900 border-2 border-gray-600 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Icon name="QrCode" size={64} className="mx-auto mb-2 text-blue-400" />
                <p className="font-mono text-lg font-bold text-white">{currentQR}</p>
              </div>
            </div>
            <Button onClick={() => setShowQRDialog(false)} className="w-full bg-blue-600 hover:bg-blue-700">Закрыть</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Прием предмета</DialogTitle>
            <DialogDescription className="text-gray-400">Заполните анкету для регистрации предмета</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="itemName" className="text-white">Наименование предмета *</Label>
              <Input 
                id="itemName" 
                value={newItem.itemName}
                onChange={(e) => setNewItem({...newItem, itemName: e.target.value})}
                placeholder="Например: Паспорт, Документы"
                className="bg-gray-900 border-gray-600 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department" className="text-white">Отдел *</Label>
              <Select value={newItem.department} onValueChange={(value: any) => setNewItem({...newItem, department: value})}>
                <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="documents" className="text-white">Документы</SelectItem>
                  <SelectItem value="photos" className="text-white">Фото/Карты</SelectItem>
                  <SelectItem value="other" className="text-white">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientName" className="text-white">ФИО клиента *</Label>
              <Input 
                id="clientName" 
                value={newItem.clientName}
                onChange={(e) => setNewItem({...newItem, clientName: e.target.value})}
                className="bg-gray-900 border-gray-600 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientPhone" className="text-white">Номер телефона *</Label>
              <Input 
                id="clientPhone" 
                type="tel"
                value={newItem.clientPhone}
                onChange={(e) => setNewItem({...newItem, clientPhone: e.target.value})}
                placeholder="+7 (___) ___-__-__"
                className="bg-gray-900 border-gray-600 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clientEmail" className="text-white">Email (необязательно)</Label>
              <Input 
                id="clientEmail" 
                type="email"
                value={newItem.clientEmail}
                onChange={(e) => setNewItem({...newItem, clientEmail: e.target.value})}
                className="bg-gray-900 border-gray-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="depositAmount" className="text-white">Оплата при сдаче (₽)</Label>
                <Input 
                  id="depositAmount" 
                  type="number"
                  value={newItem.depositAmount}
                  onChange={(e) => setNewItem({...newItem, depositAmount: Number(e.target.value)})}
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="returnAmount" className="text-white">Оплата при получении (₽)</Label>
                <Input 
                  id="returnAmount" 
                  type="number"
                  value={newItem.returnAmount}
                  onChange={(e) => setNewItem({...newItem, returnAmount: Number(e.target.value)})}
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expectedReturnDate" className="text-white">Дата получения</Label>
              <Input 
                id="expectedReturnDate" 
                type="date"
                value={newItem.expectedReturnDate}
                onChange={(e) => setNewItem({...newItem, expectedReturnDate: e.target.value})}
                className="bg-gray-900 border-gray-600 text-white"
              />
            </div>

            <Button onClick={handleCreateItem} className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
              <Icon name="Check" size={20} className="mr-2" />
              Принять предмет и создать QR-код
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Создание пользователя</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username" className="text-white">Имя пользователя *</Label>
              <Input 
                id="username" 
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                className="bg-gray-900 border-gray-600 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fullName" className="text-white">ФИО *</Label>
              <Input 
                id="fullName" 
                value={newUser.fullName}
                onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                className="bg-gray-900 border-gray-600 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="userRole" className="text-white">Роль *</Label>
              <Select value={newUser.role || ''} onValueChange={(value: any) => setNewUser({...newUser, role: value})}>
                <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {Object.entries(ROLE_NAMES).filter(([key]) => key !== 'client').map(([key, name]) => (
                    <SelectItem key={key} value={key} className="text-white">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCreateUser} className="w-full bg-blue-600 hover:bg-blue-700">
              Создать пользователя
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Создание расписания</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-white">Сотрудник</Label>
              <Select value={newSchedule.username} onValueChange={(value) => setNewSchedule({...newSchedule, username: value})}>
                <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {users.map(u => (
                    <SelectItem key={u.username} value={u.username} className="text-white">{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-white">Дата</Label>
              <Input 
                type="date"
                value={newSchedule.workDate}
                onChange={(e) => setNewSchedule({...newSchedule, workDate: e.target.value})}
                className="bg-gray-900 border-gray-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-white">Начало</Label>
                <Input 
                  type="time"
                  value={newSchedule.startTime}
                  onChange={(e) => setNewSchedule({...newSchedule, startTime: e.target.value})}
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-white">Конец</Label>
                <Input 
                  type="time"
                  value={newSchedule.endTime}
                  onChange={(e) => setNewSchedule({...newSchedule, endTime: e.target.value})}
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>
            </div>

            <Button onClick={handleCreateSchedule} className="w-full bg-green-600 hover:bg-green-700">
              Создать расписание
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSMSDialog} onOpenChange={setShowSMSDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Отправить SMS</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-white">Номер телефона</Label>
              <Input 
                value={smsMessage.clientPhone}
                onChange={(e) => setSmsMessage({...smsMessage, clientPhone: e.target.value})}
                placeholder="+7 (___) ___-__-__"
                className="bg-gray-900 border-gray-600 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-white">Сообщение</Label>
              <Textarea 
                value={smsMessage.message}
                onChange={(e) => setSmsMessage({...smsMessage, message: e.target.value})}
                placeholder="Текст уведомления"
                className="bg-gray-900 border-gray-600 text-white"
                rows={4}
              />
            </div>

            <Button onClick={handleSendSMS} className="w-full bg-purple-600 hover:bg-purple-700">
              Отправить SMS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showScannerDialog} onOpenChange={setShowScannerDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Сканер QR-кодов</DialogTitle>
            <DialogDescription className="text-gray-400">Введите или отсканируйте QR-код</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="w-full h-48 bg-gray-900 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center">
              <Icon name="Scan" size={64} className="text-gray-600" />
            </div>
            <Input 
              value={scannerInput}
              onChange={(e) => setScannerInput(e.target.value)}
              placeholder="Введите QR-код"
              className="bg-gray-900 border-gray-600 text-white"
              autoFocus
            />
            <Button onClick={handleScanQR} className="w-full bg-green-600 hover:bg-green-700">
              <Icon name="CheckCircle" size={20} className="mr-2" />
              Выдать предмет
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

  const handleKeypadClick = (digit: string) => {
    setPassword(password + digit);
  };

  const handleKeypadClear = () => {
    setPassword('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-white">
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
          className="bg-gray-900 border-gray-600 text-white"
        />
      </div>

      {role !== 'client' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              disabled={disabled}
              required
              className="bg-gray-900 border-gray-600 text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(digit => (
              <Button
                key={digit}
                type="button"
                variant="outline"
                onClick={() => handleKeypadClick(digit)}
                className="h-12 text-lg bg-gray-900 border-gray-600 hover:bg-gray-700"
              >
                {digit}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={handleKeypadClear}
              className="h-12 col-span-2 bg-red-900 border-red-700 hover:bg-red-800"
            >
              Очистить
            </Button>
          </div>
        </>
      )}

      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={disabled}>
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
        className="flex-1 bg-gray-900 border-gray-600 text-white"
      />
      <Button type="submit" className="bg-green-600 hover:bg-green-700">
        <Icon name="CheckCircle" size={16} className="mr-2" />
        Выдать
      </Button>
    </form>
  );
}

function ItemsTable({ items, onReturn, onShowQR, canDelete, canReturn, isArchive = false, userRole }: { 
  items: Item[]; 
  onReturn: (qr: string) => void;
  onShowQR: (qr: string) => void;
  canDelete: boolean;
  canReturn: boolean;
  isArchive?: boolean;
  userRole: UserRole;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Icon name="Package" size={48} className="mx-auto mb-4 opacity-50" />
        <p>Нет предметов</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-700 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700 hover:bg-gray-750">
            <TableHead className="text-gray-400">QR-код</TableHead>
            <TableHead className="text-gray-400">Предмет</TableHead>
            <TableHead className="text-gray-400">Клиент</TableHead>
            <TableHead className="text-gray-400">Отдел</TableHead>
            <TableHead className="text-gray-400">Дата</TableHead>
            <TableHead className="text-gray-400">Статус</TableHead>
            {!isArchive && <TableHead className="text-right text-gray-400">Действия</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="border-gray-700 hover:bg-gray-750">
              <TableCell className="font-mono text-xs text-white">{item.qrCode}</TableCell>
              <TableCell className="font-medium text-white">{item.itemName}</TableCell>
              <TableCell className="text-gray-300">{item.clientName}</TableCell>
              <TableCell>
                <Badge variant="outline" className="border-gray-600 text-gray-300">
                  {item.department === 'documents' && 'Документы'}
                  {item.department === 'photos' && 'Фото/Карты'}
                  {item.department === 'other' && 'Другое'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-400">
                {new Date(item.depositDate).toLocaleDateString('ru-RU')}
              </TableCell>
              <TableCell>
                <Badge variant={item.status === 'stored' ? 'default' : 'secondary'} className="bg-blue-600">
                  {item.status === 'stored' ? 'На хранении' : 'Выдан'}
                </Badge>
              </TableCell>
              {!isArchive && (
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onShowQR(item.qrCode)} className="border-gray-600">
                    <Icon name="QrCode" size={14} />
                  </Button>
                  {item.status === 'stored' && canReturn && (
                    <Button variant="default" size="sm" onClick={() => onReturn(item.qrCode)} className="bg-green-600 hover:bg-green-700">
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

function UsersTable({ users, onBlock, canManage }: { users: User[]; onBlock: (username: string) => void; canManage: boolean }) {
  return (
    <div className="rounded-md border border-gray-700 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700 hover:bg-gray-750">
            <TableHead className="text-gray-400">Имя пользователя</TableHead>
            <TableHead className="text-gray-400">ФИО</TableHead>
            <TableHead className="text-gray-400">Роль</TableHead>
            <TableHead className="text-gray-400">Статус</TableHead>
            {canManage && <TableHead className="text-right text-gray-400">Действия</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.username} className="border-gray-700 hover:bg-gray-750">
              <TableCell className="font-medium text-white">{user.username}</TableCell>
              <TableCell className="text-gray-300">{user.fullName}</TableCell>
              <TableCell>
                <Badge variant="outline" className="border-gray-600 text-gray-300">
                  {ROLE_NAMES[user.role || '']}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.isBlocked ? 'destructive' : 'default'} className={user.isBlocked ? 'bg-red-600' : 'bg-green-600'}>
                  {user.isBlocked ? 'Заблокирован' : 'Активен'}
                </Badge>
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onBlock(user.username)}
                    className="border-gray-600"
                  >
                    {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default Index;