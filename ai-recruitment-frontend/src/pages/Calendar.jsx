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
  CheckCircle2
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO, isToday } from 'date-fns';
import { calendarApi } from '../services/api';
import toast from 'react-hot-toast';
import { Spinner } from '../components/ui';

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day, agenda
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const res = await calendarApi.list({ 
        start_date: start.toISOString(), 
        end_date: end.toISOString() 
      });
      setEvents(res.data);
    } catch (err) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleAiSchedule = async () => {
    if (!aiInput.trim()) return;
    setAiGenerating(true);
    try {
      const res = await calendarApi.aiGenerate(aiInput);
      setEvents(prev => [...prev, res.data]);
      setAiInput('');
      toast.success('AI successfully scheduled your event!');
    } catch (err) {
      toast.error('AI failed to parse scheduling intent');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
      await calendarApi.delete(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      toast.success('Event deleted');
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  // Render Header
  const renderHeader = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
          <CalendarIcon className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Smart Calendar</h1>
          <p className="text-slate-400 text-sm">Manage your recruitment schedule and tasks</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
        {['month', 'week', 'day', 'agenda'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              view === v 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  // Render Month View
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), cloneDay));
        
        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] p-2 border-r border-b border-slate-800 transition-colors hover:bg-slate-900/30 ${
              !isSameMonth(day, monthStart) ? "text-slate-600" : isToday(day) ? "bg-indigo-500/5" : "text-slate-300"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                isToday(day) ? "bg-indigo-600 text-white" : ""
              }`}>
                {formattedDate}
              </span>
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event, idx) => (
                <div 
                  key={idx} 
                  className={`text-[10px] p-1 rounded px-1.5 truncate border border-l-2 ${
                    event.event_type === 'interview' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' :
                    event.event_type === 'task' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                    'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                  }`}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[10px] text-slate-500 pl-1">+{dayEvents.length - 3} more</div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="bg-slate-900/40 rounded-3xl border border-slate-800 overflow-hidden backdrop-blur-xl">
        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/80">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
      {/* AI Assistant Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 blur-3xl -z-10" />
        <div className="bg-slate-900/60 backdrop-blur-xl border border-indigo-500/20 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-4 shadow-2xl shadow-indigo-500/5">
          <div className="flex items-center gap-3 min-w-fit">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">AI Assistant</span>
          </div>
          <div className="flex-1 w-full relative">
            <input 
              type="text"
              placeholder='Try "Schedule interview with Rahul tomorrow at 3 PM"'
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSchedule()}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3 pl-5 pr-12 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
            />
            <button 
              onClick={handleAiSchedule}
              disabled={aiGenerating || !aiInput.trim()}
              className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl transition-all flex items-center gap-2 font-semibold shadow-lg shadow-indigo-600/20"
            >
              {aiGenerating ? <Spinner size={16} /> : <MessageSquare size={16} />}
              <span className="hidden sm:inline">Schedule</span>
            </button>
          </div>
        </div>
      </motion.div>

      {renderHeader()}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">{format(currentMonth, "MMMM yyyy")}</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/10"
            >
              <Plus size={18} /> New Event
            </button>
          </div>

          {loading ? (
            <div className="h-[600px] flex items-center justify-center bg-slate-900/20 rounded-3xl border border-slate-800 border-dashed">
              <div className="text-center">
                <Spinner size={40} />
                <p className="text-slate-500 mt-4 font-medium">Syncing with your schedule...</p>
              </div>
            </div>
          ) : view === 'month' ? renderMonthView() : (
            <div className="h-[600px] flex items-center justify-center bg-slate-900/20 rounded-3xl border border-slate-800 border-dashed text-slate-500">
              {view} view coming soon
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-6 backdrop-blur-xl h-full">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Up Next
            </h3>
            
            <div className="space-y-4">
              {events.filter(e => parseISO(e.start_time) >= new Date()).slice(0, 5).map((event, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={idx} 
                  className="group relative bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      event.event_type === 'interview' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-indigo-500/20 text-indigo-400'
                    }`}>
                      {event.event_type}
                    </span>
                    <button 
                      onClick={() => handleDeleteEvent(event.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-slate-200 mb-2">{event.title}</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <CalendarIcon size={12} />
                      {format(parseISO(event.start_time), "MMM d, h:mm a")}
                    </div>
                    {event.participants && event.participants.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Users size={12} />
                        {event.participants.join(', ')}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {events.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-700">
                    <CalendarIcon className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-slate-500 text-sm">No upcoming events</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
