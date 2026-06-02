import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle2, AlertCircle, Clock, Calendar, Brain, MessageSquare, Trash2 } from 'lucide-react';
import { notificationsApi } from '../../services/api';
import { formatRelativeTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Failed to fetch unread count');
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const handleReadAll = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const handleClear = async () => {
    try {
      await notificationsApi.clear();
      setNotifications([]);
      setUnreadCount(0);
      toast.success('Notifications cleared');
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'interview_scheduled': return <Calendar className="w-4 h-4 text-cyan-400" />;
      case 'candidate_joined': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'ai_report': return <Brain className="w-4 h-4 text-indigo-400" />;
      case 'reminder': return <Clock className="w-4 h-4 text-amber-400" />;
      default: return <MessageSquare className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all group"
      >
        <Bell className={`w-5 h-5 transition-colors ${unreadCount > 0 ? 'text-cyan-400 animate-pulse' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface-container-lowest shadow-sm"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 md:w-96 bg-surface-container-lowest backdrop-blur-2xl border border-outline-variant rounded-3xl shadow-2xl z-50 overflow-hidden"
            style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
          >
            <div className="p-5 border-b border-outline-variant flex items-center justify-between bg-surface-container">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-bold text-on-surface">Notifications</h3>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button onClick={handleClear} className="p-1.5 hover:bg-surface-container-highest rounded-lg text-outline hover:text-error transition-colors" title="Clear all">
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-surface-container-highest rounded-lg text-outline hover:text-on-surface transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-[450px] overflow-y-auto custom-scrollbar bg-surface-container-lowest">
              {loading && notifications.length === 0 ? (
                <div className="p-12 text-center text-outline">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-4 border border-outline-variant">
                    <Bell className="w-6 h-6 text-outline opacity-40" />
                  </div>
                  <p className="text-on-surface font-medium">All caught up!</p>
                  <p className="text-outline text-xs mt-1">No new notifications for you.</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/30">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                      className={`p-4 hover:bg-surface-container transition-colors cursor-pointer relative group ${!notif.is_read ? 'bg-primary/5' : ''}`}
                    >
                      {!notif.is_read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                      )}
                      <div className="flex gap-4">
                        <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${!notif.is_read ? 'bg-primary/10' : 'bg-surface-container-high'}`}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className={`text-sm font-bold truncate ${!notif.is_read ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-outline whitespace-nowrap ml-2">
                              {formatRelativeTime(notif.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {unreadCount > 0 && (
              <div className="p-3 bg-surface-container border-t border-outline-variant text-center">
                <button 
                  onClick={handleReadAll}
                  className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
