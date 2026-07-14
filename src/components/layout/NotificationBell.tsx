import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, FileText, LifeBuoy, BarChart3, Tag, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeIcons: Record<string, React.ElementType> = {
  document: FileText,
  support: LifeBuoy,
  stage: BarChart3,
  version: Tag,
  info: Info,
};

const typeColors: Record<string, string> = {
  document: 'text-blue-500 bg-blue-500/10',
  support: 'text-green-500 bg-green-500/10',
  stage: 'text-orange-500 bg-orange-500/10',
  version: 'text-purple-500 bg-purple-500/10',
  info: 'text-muted-foreground bg-muted',
};

function NotificationItem({ notification, onRead }: { notification: Notification; onRead: () => void }) {
  const navigate = useNavigate();
  const Icon = typeIcons[notification.notification_type] || Info;
  const colorClass = typeColors[notification.notification_type] || typeColors.info;

  const handleClick = () => {
    if (!notification.is_read) onRead();
    if (notification.link) navigate(notification.link);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-3 hover:bg-accent/50 transition-colors border-b last:border-b-0 ${
        !notification.is_read ? 'bg-accent/20' : ''
      }`}
    >
      <div className="flex gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        {!notification.is_read && (
          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
        )}
      </div>
    </button>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount && unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          ) : null}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications && notifications.length > 0 ? (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={() => markAsRead.mutate(n.id)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
