import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Clock, 
  MapPin, 
  Users, 
  Tag, 
  Trash2, 
  Sparkles,
  MessageSquare,
  AlertCircle,
  X,
  CheckCircle2,
  CalendarDays,
  List
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
  parseISO, isToday, startOfDay, endOfDay, addWeeks, subWeeks,
  addDays as addDaysFns, subDays
} from 'date-fns';
import { calendarApi } from '../services/api';
import toast from 'react-hot-toast';
import { Spinner, EmptyState } from '../components/ui';
import { cn } from '../utils/helpers';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day, agenda
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'meeting',
    start_time: '',
    end_time: '',
    priority: 'medium',
    participants: ''
  });
  const [aiInput, setAiInput] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [currentDate, view]);

  const openAddModal = () => {
    setEditingEvent(null);
    setEventForm({
      title: '',
      description: '',
      event_type: 'meeting',
      start_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(addDaysFns(new Date(), 0), "yyyy-MM-dd'T'HH:mm"),
      priority: 'medium',
      participants: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      event_type: event.event_type || 'meeting',
      start_time: format(parseISO(event.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(parseISO(event.end_time), "yyyy-MM-dd'T'HH:mm"),
      priority: event.priority || 'medium',
      participants: (event.participants || []).join(', ')
    });
    setShowAddModal(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    const payload = {
      ...eventForm,
      participants: eventForm.participants.split(',').map(p => p.trim()).filter(Boolean)
    };

    try {
      if (editingEvent) {
        const res = await calendarApi.update(editingEvent.id, payload);
        setEvents(prev => prev.map(ev => ev.id === editingEvent.id ? res.data : ev));
        toast.success('Event updated');
      } else {
        const res = await calendarApi.create(payload);
        setEvents(prev => [...prev, res.data]);
        toast.success('Event scheduled');
      }
      setShowAddModal(false);
    } catch (err) {
      toast.error('Failed to save event');
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let start, end;
      if (view === 'month') {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
      } else if (view === 'week') {
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
      } else {
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
      }
      
      const res = await calendarApi.list({ 
        start_date: start.toISOString(), 
        end_date: end.toISOString() 
      });
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Calendar Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAiSchedule = async () => {
    if (!aiInput.trim()) return;
    setAiGenerating(true);
    try {
      const res = await calendarApi.aiGenerate(aiInput);
      // Backend now returns an object with 'events' array
      const newEvents = res.data.events || [res.data];
      setEvents(prev => [...prev, ...newEvents]);
      setAiInput('');
      toast.success(res.data.message || 'AI successfully scheduled your events!');
    } catch (err) {
      toast.error('AI failed to parse scheduling intent');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if(!confirm("Delete this event?")) return;
    try {
      await calendarApi.delete(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      toast.success('Event deleted');
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  const nextDate = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDaysFns(currentDate, 1));
  };

  const prevDate = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  // Render Header
  const renderHeader = () => (
    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
      <div>
        <h2 className="text-3xl font-bold text-on-surface mb-1">Smart Calendar</h2>
        <p className="text-on-surface-variant text-sm opacity-70">
          Manage your schedule with AI assistance
        </p>
      </div>

      <div className="flex items-center gap-2 p-1 bg-surface-container-low rounded-xl border border-outline-variant">
        {[
          { id: 'month', label: 'Month', icon: CalendarIcon },
          { id: 'week', label: 'Week', icon: CalendarDays },
          { id: 'day', label: 'Day', icon: Clock },
          { id: 'agenda', label: 'Agenda', icon: List }
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
              view === v.id 
                ? 'bg-primary text-on-primary shadow-sm' 
                : 'text-outline hover:bg-surface-container hover:text-on-surface'
            )}
          >
            <v.icon size={14} />
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const getEventStyle = (type) => {
    if (type === 'interview') return 'bg-primary/10 border-primary/20 text-primary';
    if (type === 'task') return 'bg-tertiary/10 border-tertiary/20 text-tertiary';
    return 'bg-secondary/10 border-secondary/20 text-secondary';
  };

  // Render Month View
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, "d");
        const cloneDay = day;
        const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), cloneDay));
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isTodayDate = isToday(day);
        
        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[120px] p-2 border-r border-b border-outline-variant transition-colors",
              isCurrentMonth ? "bg-surface-container-lowest" : "bg-surface-container-low text-outline opacity-50",
              isTodayDate && "bg-primary/[0.03]"
            )}
          >
            <div className="flex justify-between items-center mb-2">
              <span className={cn(
                "w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold",
                isTodayDate ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant"
              )}>
                {formattedDate}
              </span>
            </div>
            <div className="space-y-1.5">
              {dayEvents.slice(0, 3).map((event, idx) => (
                <div 
                  key={idx} 
                  onClick={() => openEditModal(event)}
                  className={cn(
                    "text-[10px] p-1.5 rounded-md px-2 truncate border text-left font-semibold cursor-pointer hover:brightness-95 transition-all active:scale-95",
                    getEventStyle(event.event_type)
                  )}
                  title={event.title}
                >
                  {format(parseISO(event.start_time), "h:mm a")} · {event.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[10px] font-bold text-outline pl-1 cursor-pointer hover:text-primary">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDaysFns(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="portal-card overflow-hidden bg-surface-container-lowest">
        <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-3 text-center text-[11px] font-bold text-outline uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>
        <div className="border-t border-l border-outline-variant -mt-[1px] -ml-[1px]">
           {rows}
        </div>
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDaysFns(startDate, i));
    }

    return (
      <div className="portal-card overflow-hidden bg-surface-container-lowest flex flex-col h-[600px]">
        <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container shrink-0">
          {days.map((day, i) => (
            <div key={i} className="py-3 text-center border-r border-outline-variant last:border-r-0">
              <div className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">{format(day, 'EEE')}</div>
              <div className={cn(
                "text-lg font-bold w-8 h-8 mx-auto flex items-center justify-center rounded-full",
                isToday(day) ? "bg-primary text-on-primary shadow-md" : "text-on-surface"
              )}>{format(day, 'd')}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto grid grid-cols-7 custom-scrollbar">
          {days.map((day, i) => {
            const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), day));
            return (
              <div key={i} className="border-r border-outline-variant last:border-r-0 p-2 space-y-2 min-h-[500px]">
                {dayEvents.map((event, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => openEditModal(event)}
                    className={cn("p-2 rounded-lg border text-xs text-left cursor-pointer hover:brightness-95 transition-all active:scale-95", getEventStyle(event.event_type))}
                  >
                    <div className="font-bold mb-1 line-clamp-2">{event.title}</div>
                    <div className="text-[10px] font-semibold opacity-80">{format(parseISO(event.start_time), "h:mm a")}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Day View
  const renderDayView = () => {
    const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), currentDate));
    // Sort by time
    dayEvents.sort((a, b) => parseISO(a.start_time) - parseISO(b.start_time));

    return (
      <div className="portal-card bg-surface-container-lowest p-6 h-[600px] overflow-y-auto custom-scrollbar">
        <h3 className="text-xl font-bold text-on-surface mb-6 border-b border-outline-variant pb-4">
          {isToday(currentDate) ? 'Today' : format(currentDate, "EEEE, MMMM do, yyyy")}
        </h3>
        {dayEvents.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <Clock size={40} className="mx-auto mb-4 text-outline" />
            <p className="text-sm font-bold uppercase tracking-widest text-outline">No events scheduled</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dayEvents.map((event, idx) => (
              <div 
                key={idx} 
                onClick={() => openEditModal(event)}
                className={cn("p-4 rounded-xl border flex gap-4 items-start cursor-pointer hover:brightness-95 transition-all active:scale-[0.98]", getEventStyle(event.event_type))}
              >
                <div className="w-16 shrink-0 text-right pt-0.5">
                  <div className="text-xs font-black">{format(parseISO(event.start_time), "h:mm a")}</div>
                </div>
                <div className="w-1 shrink-0 h-full bg-current opacity-20 rounded-full" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm mb-1">{event.title}</h4>
                  <div className="text-xs opacity-80 mb-2">{event.event_type.toUpperCase()}</div>
                  {event.participants?.length > 0 && (
                     <div className="flex items-center gap-1.5 text-[11px] font-semibold opacity-70">
                       <Users size={12} /> {event.participants.join(', ')}
                     </div>
                  )}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }} 
                  className="p-2 opacity-50 hover:opacity-100 hover:text-error transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render Agenda View
  const renderAgendaView = () => {
    // Show events from currentDate onwards, sorted by date
    const futureEvents = events.filter(e => parseISO(e.start_time) >= startOfDay(currentDate));
    futureEvents.sort((a, b) => parseISO(a.start_time) - parseISO(b.start_time));

    return (
      <div className="portal-card bg-surface-container-lowest p-6 h-[600px] overflow-y-auto custom-scrollbar">
         {futureEvents.length === 0 ? (
           <EmptyState icon={List} title="Agenda Clear" description="No upcoming events found in your schedule." />
         ) : (
           <div className="space-y-6">
             {futureEvents.map((event, idx) => {
               const dateObj = parseISO(event.start_time);
               const isNewDay = idx === 0 || !isSameDay(dateObj, parseISO(futureEvents[idx - 1].start_time));
               return (
                 <div key={idx}>
                   {isNewDay && (
                     <h4 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
                       <CalendarIcon size={14} className="text-primary" />
                       {format(dateObj, "EEEE, MMMM do")}
                     </h4>
                   )}
                   <div className={cn("ml-2 border-l-2 pl-4 py-2 mb-2 relative group", 
                     event.event_type === 'interview' ? 'border-primary' : 'border-tertiary'
                   )}>
                      <div className={cn("absolute -left-[5px] top-4 w-2 h-2 rounded-full",
                        event.event_type === 'interview' ? 'bg-primary' : 'bg-tertiary'
                      )} />
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-bold text-primary mb-1">{format(dateObj, "h:mm a")}</div>
                          <div className="font-semibold text-sm text-on-surface">{event.title}</div>
                        </div>
                        <button onClick={() => handleDeleteEvent(event.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-outline hover:text-error transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                   </div>
                 </div>
               );
             })}
           </div>
         )}
      </div>
    );
  };

  return (
    <div className="page-enter bg-surface">
      
      {/* AI Assistant Section */}
      <div className="portal-card p-4 mb-8 bg-primary/5 border border-primary/20 flex flex-col md:flex-row items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-on-primary" />
          </div>
          <div>
            <span className="font-bold text-primary block leading-tight">AI Scheduling</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-outline">Smart Assistant</span>
          </div>
        </div>
        <div className="flex-1 w-full relative">
          <input 
            type="text"
            placeholder='Ask AI: "Schedule a 30min technical interview with Rahul for tomorrow at 2 PM"'
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiSchedule()}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-3 pl-4 pr-32 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <button 
            onClick={handleAiSchedule}
            disabled={aiGenerating || !aiInput.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-primary hover:bg-primary-container disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2 font-bold text-xs"
          >
            {aiGenerating ? <Spinner size={14} /> : <MessageSquare size={14} />}
            <span className="hidden sm:inline">Schedule</span>
          </button>
        </div>
      </div>

      {renderHeader()}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Main Calendar View Area */}
        <div className="xl:col-span-3 space-y-6">
          <div className="flex items-center justify-between portal-card p-3 bg-surface-container-lowest shadow-sm">
            <div className="flex items-center gap-4 pl-2">
              <h2 className="text-lg font-bold text-on-surface min-w-[150px]">
                {view === 'month' ? format(currentDate, "MMMM yyyy") : 
                 view === 'week' ? `Week of ${format(startOfWeek(currentDate), "MMM do")}` : 
                 format(currentDate, "MMMM do, yyyy")}
              </h2>
              <div className="flex items-center gap-1 bg-surface-container rounded-lg p-0.5 border border-outline-variant">
                <button onClick={prevDate} className="p-1.5 hover:bg-surface-container-high rounded-md text-outline hover:text-on-surface transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-outline hover:text-on-surface transition-colors">
                  Today
                </button>
                <button onClick={nextDate} className="p-1.5 hover:bg-surface-container-high rounded-md text-outline hover:text-on-surface transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-primary py-2 px-4 shadow-sm"
            >
              <Plus size={16} /> New Event
            </button>
          </div>

          {loading ? (
            <div className="h-[600px] flex flex-col items-center justify-center portal-card bg-surface-container-lowest border-dashed">
              <Spinner size={32} />
              <p className="text-sm text-outline mt-4 font-bold uppercase tracking-widest">Syncing Schedule...</p>
            </div>
          ) : (
            <>
              {view === 'month' && renderMonthView()}
              {view === 'week' && renderWeekView()}
              {view === 'day' && renderDayView()}
              {view === 'agenda' && renderAgendaView()}
            </>
          )}
        </div>

        {/* Sidebar / Up Next */}
        <div className="space-y-6">
          <div className="portal-card bg-surface-container-lowest p-6 h-[600px] shadow-sm">
            <h3 className="text-base font-bold text-on-surface mb-5 flex items-center gap-2 border-b border-outline-variant pb-4">
              <Clock className="w-4 h-4 text-primary" />
              Upcoming
            </h3>
            
            <div className="space-y-3">
              {events.filter(e => parseISO(e.start_time) >= new Date()).slice(0, 6).map((event, idx) => (
                <div 
                  key={idx} 
                  onClick={() => openEditModal(event)}
                  className="group relative bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 p-3.5 rounded-xl transition-all hover:border-primary/30 cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn("text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded border", 
                      getEventStyle(event.event_type)
                    )}>
                      {event.event_type}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-outline hover:text-error transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-on-surface mb-2 leading-tight">{event.title}</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-outline">
                      <CalendarIcon size={12} className="text-primary opacity-70" />
                      {format(parseISO(event.start_time), "MMM d, h:mm a")}
                    </div>
                  </div>
                </div>
              ))}
              
              {events.filter(e => parseISO(e.start_time) >= new Date()).length === 0 && (
                <div className="text-center py-10 opacity-60">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center mx-auto mb-3 border border-outline-variant">
                    <CalendarIcon className="w-5 h-5 text-outline" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-outline">No upcoming events</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Event Modal (Add/Edit) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-on-surface">
                    {editingEvent ? 'Edit Event' : 'Schedule New Event'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-surface-container-highest rounded-full text-outline transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Event Title</label>
                  <input
                    required
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:border-primary transition-all"
                    placeholder="e.g. Technical Interview - John Doe"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Start Time</label>
                    <input
                      required
                      type="datetime-local"
                      value={eventForm.start_time}
                      onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">End Time</label>
                    <input
                      required
                      type="datetime-local"
                      value={eventForm.end_time}
                      onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Event Type</label>
                    <select
                      value={eventForm.event_type}
                      onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:border-primary transition-all appearance-none"
                    >
                      <option value="interview">Interview</option>
                      <option value="meeting">Meeting</option>
                      <option value="task">Task</option>
                      <option value="reminder">Reminder</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Priority</label>
                    <select
                      value={eventForm.priority}
                      onChange={(e) => setEventForm({ ...eventForm, priority: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:border-primary transition-all appearance-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Participants (emails, comma separated)</label>
                  <input
                    type="text"
                    value={eventForm.participants}
                    onChange={(e) => setEventForm({ ...eventForm, participants: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:border-primary transition-all"
                    placeholder="john@example.com, sara@example.com"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 px-4 border border-outline-variant rounded-xl font-bold text-on-surface hover:bg-surface-container transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3 px-4 bg-primary text-on-primary rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
                  >
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
