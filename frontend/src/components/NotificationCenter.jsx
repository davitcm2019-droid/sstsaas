import { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Shield, 
  HardHat,
  GraduationCap,
  ClipboardCheck
} from 'lucide-react';
import { notificationsService } from '../services/api';

const NotificationCenter = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsService.getAll({ 
        userId: 2, // Mock user ID
        limit: 20 
      });
      setNotifications(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      task_due: Clock,
      task_completed: CheckCircle,
      compliance_alert: AlertTriangle,
      risk_identified: Shield,
      epi_expiring: HardHat,
      training_due: GraduationCap,
      inspection_due: ClipboardCheck
    };
    const Icon = icons[type] || Bell;
    return <Icon className="h-5 w-5" />;
  };

  const getNotificationColor = (type) => {
    const colors = {
      task_due: 'text-yellow-600 bg-yellow-100',
      task_completed: 'text-green-600 bg-green-100',
      compliance_alert: 'text-red-600 bg-red-100',
      risk_identified: 'text-orange-600 bg-orange-100',
      epi_expiring: 'text-yellow-600 bg-yellow-100',
      training_due: 'text-blue-600 bg-blue-100',
      inspection_due: 'text-purple-600 bg-purple-100'
    };
    return colors[type] || 'text-gray-600 bg-gray-100';
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
      
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">
              Notificações
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {unreadCount}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === 'all' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === 'unread' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Não lidas
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-3 py-1 text-sm rounded-full ${
                filter === 'read' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Lidas
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Nenhuma notificação
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'unread' 
                  ? 'Você não tem notificações não lidas.'
                  : 'Você não tem notificações.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start">
                    <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          {new Date(notification.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Marcar como lida
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3">
          <button
            onClick={() => {
              // Marcar todas como lidas
              notifications.forEach(notif => {
                if (!notif.read) {
                  markAsRead(notif.id);
                }
              });
            }}
            className="w-full text-sm text-primary-600 hover:text-primary-700"
          >
            Marcar todas como lidas
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
