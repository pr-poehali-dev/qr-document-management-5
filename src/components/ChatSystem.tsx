import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  sender: string;
  senderRole: string;
  text: string;
  timestamp: Date;
  isVoice?: boolean;
}

interface ChatSystemProps {
  currentUser: string;
  userRole: string;
  clientPhone?: string;
}

export function ChatSystem({ currentUser, userRole, clientPhone }: ChatSystemProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [clients, setClients] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (userRole !== 'client') {
      setClients(['Client1', 'Client2', 'Client3']);
    }
  }, [userRole]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: crypto.randomUUID(),
      sender: currentUser,
      senderRole: userRole,
      text: newMessage,
      timestamp: new Date(),
      isVoice: false
    };

    setMessages([...messages, message]);
    setNewMessage('');
    toast({ title: "Сообщение отправлено" });
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const message: Message = {
          id: crypto.randomUUID(),
          sender: currentUser,
          senderRole: userRole,
          text: '[Голосовое сообщение]',
          timestamp: new Date(),
          isVoice: true
        };

        setMessages([...messages, message]);
        toast({ title: "Голосовое сообщение отправлено" });
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось получить доступ к микрофону", variant: "destructive" });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const renderClientList = () => (
    <Card className="bg-gray-800 border-gray-700 mb-4">
      <CardHeader>
        <CardTitle className="text-white text-sm">Клиенты</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {clients.map((client) => (
          <Button
            key={client}
            variant={selectedClient === client ? "default" : "outline"}
            className="w-full justify-start border-gray-600"
            onClick={() => setSelectedClient(client)}
          >
            <Icon name="User" size={16} className="mr-2" />
            {client}
          </Button>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {userRole !== 'client' && (
        <div className="md:col-span-1">
          {renderClientList()}
        </div>
      )}
      
      <Card className={`bg-gray-800 border-gray-700 ${userRole !== 'client' ? 'md:col-span-3' : 'md:col-span-4'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              {userRole === 'client' ? 'Чат с поддержкой' : `Чат с ${selectedClient || 'клиентом'}`}
            </CardTitle>
            <Badge variant="outline" className="border-green-500 text-green-500">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Онлайн
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 rounded-lg bg-gray-900 p-4 mb-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === currentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender === currentUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">{message.sender}</span>
                      <Badge variant="outline" className="text-xs border-gray-500">
                        {message.senderRole}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {message.isVoice && <Icon name="Mic" size={14} />}
                      <p className="text-sm">{message.text}</p>
                    </div>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Введите сообщение..."
              className="flex-1 bg-gray-900 border-gray-600 text-white"
            />
            
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className="border-gray-600"
            >
              <Icon name={isRecording ? "Square" : "Mic"} size={20} />
            </Button>
            
            <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700">
              <Icon name="Send" size={20} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
