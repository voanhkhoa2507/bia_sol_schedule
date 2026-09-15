import { useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay, getHours, getMinutes, parseISO, addMinutes } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion } from 'motion/react';
import type { ScheduleItem } from '../types';

interface TimetableGridProps {
  currentDate: Date;
  items: ScheduleItem[];
  onItemClick: (item: ScheduleItem) => void;
  onEmptySlotClick: (date: Date, hour: number) => void;
  onItemMove: (item: ScheduleItem, newStartTime: Date) => void;
}

const START_HOUR = 6;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

const COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
  'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
  'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200',
];

export function TimetableGrid({ currentDate, items, onItemClick, onEmptySlotClick, onItemMove }: TimetableGridProps) {
  // Get days of the current week (Monday to Sunday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Filter items for the current week
  const weekItems = useMemo(() => {
    return items.filter(item => {
      const itemDate = parseISO(item.startTime);
      return weekDays.some(day => isSameDay(day, itemDate));
    });
  }, [items, weekDays]);

  const calculateStyle = (startTime: string, endTime: string) => {
    const start = parseISO(startTime);
    const end = parseISO(endTime);
    
    const startHour = getHours(start) + getMinutes(start) / 60;
    const endHour = getHours(end) + getMinutes(end) / 60;
    
    const top = ((startHour - START_HOUR) / (END_HOUR - START_HOUR)) * 100;
    const height = ((endHour - startHour) / (END_HOUR - START_HOUR)) * 100;

    return {
      top: `${Math.max(0, top)}%`,
      height: `${Math.max(0, height)}%`,
      minHeight: '40px',
    };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
      <div className="min-w-[800px] flex flex-col">
        {/* Header Row */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
          <div className="p-3 border-r border-slate-200 flex items-center justify-center text-sm font-medium text-slate-500">
            Giờ
          </div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="p-3 text-center border-r border-slate-200 last:border-0">
              <div className="text-xs text-slate-500 uppercase tracking-wider">{format(day, 'EEEE', { locale: vi })}</div>
              <div className={`text-lg font-semibold mt-1 ${isSameDay(day, new Date()) ? 'text-indigo-600' : 'text-slate-900'}`}>
                {format(day, 'd/M')}
              </div>
            </div>
          ))}
        </div>

      {/* Grid Body */}
      <div className="relative grid grid-cols-[60px_repeat(7,1fr)]" style={{ height: '960px' /* 60px per hour * 16 hours */ }}>
        {/* Time Labels (Y Axis) */}
        <div className="border-r border-slate-200 flex flex-col relative z-10 bg-white">
          {HOURS.map(hour => (
            <div key={hour} className="flex-1 flex items-start justify-center pt-2 text-xs font-medium text-slate-400 border-b border-slate-100 last:border-0" style={{ height: '60px' }}>
              {hour}:00
            </div>
          ))}
        </div>

        {/* Days Columns */}
        {weekDays.map((day) => {
          const dayItems = weekItems.filter(item => isSameDay(parseISO(item.startTime), day));

          return (
            <div key={day.toISOString()} className="relative border-r border-slate-200 last:border-0 group">
              {/* Horizontal Grid Lines for the day */}
              {HOURS.map(hour => (
                <div 
                  key={hour} 
                  className="absolute w-full border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
                  style={{ top: `${(hour - START_HOUR) * 60}px`, height: '60px' }}
                  onClick={() => onEmptySlotClick(day, hour)}
                />
              ))}

              {/* Events */}
              {dayItems.map(item => (
                <motion.div
                  key={item.id}
                  layoutId={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onItemClick(item);
                  }}
                  className={`absolute left-1 right-1 rounded-lg border p-2 cursor-pointer shadow-sm overflow-hidden flex flex-col transition-shadow ${COLORS[item.colorIndex]}`}
                  style={calculateStyle(item.startTime, item.endTime)}
                  // Drag properties
                  drag
                  dragSnapToOrigin
                  onDragEnd={(_, info) => {
                     // Basic drag calculation: 
                     // We dragged info.offset.y pixels.
                     // 1 hour = 60px -> 1 min = 1px.
                     const minutesShift = Math.round(info.offset.y);
                     // Calculate column shift: day column width is (container width - 60) / 7.
                     const colWidth = (window.innerWidth >= 1200 ? 1200 - 60 : document.body.clientWidth - 60) / 7;
                     const daysShift = Math.round(info.offset.x / colWidth);
                     
                     if (minutesShift !== 0 || daysShift !== 0) {
                        const newStart = addMinutes(addDays(parseISO(item.startTime), daysShift), minutesShift);
                        onItemMove(item, newStart);
                     }
                  }}
                  whileDrag={{ scale: 1.02, zIndex: 50, opacity: 0.9 }}
                >
                  <h4 className="font-semibold text-xs sm:text-sm truncate">{item.subject}</h4>
                  <div className="text-[10px] sm:text-xs opacity-90 truncate mt-1">
                    {format(parseISO(item.startTime), 'HH:mm')} - {format(parseISO(item.endTime), 'HH:mm')}
                  </div>
                  {item.room && <div className="text-[10px] sm:text-xs font-medium opacity-90 truncate mt-1">{item.room}</div>}
                </motion.div>
              ))}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
