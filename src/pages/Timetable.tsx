import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addWeeks, subWeeks, parseISO, setHours, setMinutes, addMinutes, differenceInMinutes, addDays, startOfWeek, getDay } from 'date-fns';
import { ArrowLeft, CaretLeft, CaretRight, Calendar, DownloadSimple } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ScheduleItem } from '../types';
import { TimetableGrid } from '../components/TimetableGrid';
import { ImportModal } from '../components/ImportModal';

const COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
  'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
  'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200',
];

export default function Timetable() {
  const { personId } = useParams();
  const navigate = useNavigate();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [profileName, setProfileName] = useState<string>('');
  
  const [editingItem, setEditingItem] = useState<Partial<ScheduleItem> | null>(null);
  const [editSelectedWeeks, setEditSelectedWeeks] = useState<Date[]>([]);
  const [updateSeries, setUpdateSeries] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Load Data from Firebase
  useEffect(() => {
    if (!personId) return;
    
    // Fetch Profile Name
    const docRef = doc(db, 'profiles', personId);
    const unsubProfile = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfileName(docSnap.data().name);
      }
    });

    const q = query(collection(db, 'schedules'), where('personId', '==', personId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScheduleItem[];
      setItems(data);
    });
    return () => {
      unsubscribe();
      unsubProfile();
    };
  }, [personId]);

  const handlePreviousWeek = () => setCurrentDate(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentDate(prev => addWeeks(prev, 1));
  const handleCurrentWeek = () => setCurrentDate(new Date());

  const handleEmptySlotClick = (date: Date, hour: number) => {
    const start = setMinutes(setHours(date, hour), 0);
    const end = addMinutes(start, 90); // default 1.5 hours
    setEditingItem({
      subject: '',
      room: '',
      colorIndex: 0,
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });
    setEditSelectedWeeks([startOfWeek(date, { weekStartsOn: 1 })]);
    setUpdateSeries(false);
  };

  const handleSave = async () => {
    if (!editingItem?.subject || !editingItem.startTime || !editingItem.endTime) {
      setEditingItem(null);
      return;
    }
    
    try {
      if (editingItem.id) {
        if (updateSeries && editingItem.seriesId) {
          const seriesItems = items.filter(i => i.seriesId === editingItem.seriesId);
          const batch = writeBatch(db);
          seriesItems.forEach(i => {
            const weekStart = startOfWeek(parseISO(i.startTime), { weekStartsOn: 1 });
            const baseStart = parseISO(editingItem.startTime!);
            const baseEnd = parseISO(editingItem.endTime!);
            const dayOffset = getDay(baseStart) === 0 ? 6 : getDay(baseStart) - 1;
            const eventDate = addDays(weekStart, dayOffset);
            
            const start = setMinutes(setHours(eventDate, baseStart.getHours()), baseStart.getMinutes());
            const end = setMinutes(setHours(eventDate, baseEnd.getHours()), baseEnd.getMinutes());
            
            const itemRef = doc(db, 'schedules', i.id);
            batch.update(itemRef, {
              subject: editingItem.subject,
              room: editingItem.room,
              colorIndex: editingItem.colorIndex,
              startTime: start.toISOString(),
              endTime: end.toISOString()
            });
          });
          await batch.commit();
        } else {
          const itemRef = doc(db, 'schedules', editingItem.id);
          await updateDoc(itemRef, editingItem);
        }
      } else {
        const baseStart = parseISO(editingItem.startTime);
        const baseEnd = parseISO(editingItem.endTime);
        const dayOffset = getDay(baseStart) === 0 ? 6 : getDay(baseStart) - 1; // 0 is Sunday
        const weeksToApply = editSelectedWeeks.length > 0 ? editSelectedWeeks : [startOfWeek(baseStart, { weekStartsOn: 1 })];
        const seriesId = `series-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        
        const batch = writeBatch(db);
        weeksToApply.forEach(weekStart => {
          const eventDate = addDays(weekStart, dayOffset);
          const start = setMinutes(setHours(eventDate, baseStart.getHours()), baseStart.getMinutes());
          const end = setMinutes(setHours(eventDate, baseEnd.getHours()), baseEnd.getMinutes());
          
          const newDocRef = doc(collection(db, 'schedules'));
          batch.set(newDocRef, {
            ...editingItem,
            personId,
            seriesId,
            startTime: start.toISOString(),
            endTime: end.toISOString()
          });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error("Lỗi khi lưu:", error);
    }
    setEditingItem(null);
  };

  const handleDelete = async () => {
    if (editingItem?.id) {
      try {
        if (updateSeries && editingItem.seriesId) {
          const seriesItems = items.filter(i => i.seriesId === editingItem.seriesId);
          const batch = writeBatch(db);
          seriesItems.forEach(i => {
            batch.delete(doc(db, 'schedules', i.id));
          });
          await batch.commit();
        } else {
          await deleteDoc(doc(db, 'schedules', editingItem.id));
        }
      } catch (error) {
        console.error("Lỗi khi xóa:", error);
      }
    }
    setEditingItem(null);
  };

  const handleItemMove = async (item: ScheduleItem, newStartTime: Date) => {
    const duration = differenceInMinutes(parseISO(item.endTime), parseISO(item.startTime));
    const newEndTime = addMinutes(newStartTime, duration);
    try {
      await updateDoc(doc(db, 'schedules', item.id), {
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString()
      });
    } catch (error) {
      console.error("Lỗi khi chuyển giờ:", error);
    }
  };

  const handleImport = async (newItems: Partial<ScheduleItem>[], selectedWeeks: Date[]) => {
    try {
      const batch = writeBatch(db);
      
      const seriesIdMap = new Map<number, string>();
      newItems.forEach((_, index) => {
        seriesIdMap.set(index, `series-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      });

      selectedWeeks.forEach(weekStart => {
        newItems.forEach((item, index) => {
          const offsetDay = index % 5;
          const eventDate = addDays(weekStart, offsetDay);
          const start = setMinutes(setHours(eventDate, 8 + (index * 2)), 0);
          const end = addMinutes(start, 120);
          
          const newDocRef = doc(collection(db, 'schedules'));
          batch.set(newDocRef, {
            subject: item.subject || 'Imported',
            room: item.room || '',
            colorIndex: item.colorIndex || 0,
            personId,
            seriesId: seriesIdMap.get(index),
            startTime: start.toISOString(),
            endTime: end.toISOString()
          });
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Lỗi khi import:", error);
    }
  };

  // Convert editing times for inputs
  const editStartTimeStr = editingItem?.startTime ? format(parseISO(editingItem.startTime), "HH:mm") : "00:00";
  const editEndTimeStr = editingItem?.endTime ? format(parseISO(editingItem.endTime), "HH:mm") : "00:00";
  const editDateStr = editingItem?.startTime ? format(parseISO(editingItem.startTime), "yyyy-MM-dd") : "";

  const updateEditTime = (field: 'start' | 'end', timeStr: string) => {
    if (!editingItem?.startTime) return;
    const [h, m] = timeStr.split(':').map(Number);
    const date = parseISO(editingItem.startTime);
    const newDate = setMinutes(setHours(date, h), m);
    if (field === 'start') {
      setEditingItem({ ...editingItem, startTime: newDate.toISOString() });
    } else {
      setEditingItem({ ...editingItem, endTime: newDate.toISOString() });
    }
  };

  const upcomingWeeks = Array.from({ length: 15 }, (_, i) => addWeeks(startOfWeek(currentDate, { weekStartsOn: 1 }), i));

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-12">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft weight="bold" size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 capitalize">Lịch Trình: {profileName || '...'}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200 self-start sm:self-auto">
            <button onClick={handlePreviousWeek} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <CaretLeft weight="bold" />
            </button>
            <button onClick={handleCurrentWeek} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2">
              <Calendar weight="duotone" />
              Tuần {format(currentDate, 'dd/MM')} - {format(addDays(currentDate, 6), 'dd/MM')}
            </button>
            <button onClick={handleNextWeek} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <CaretRight weight="bold" />
            </button>
          </div>

          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
          >
            <DownloadSimple weight="bold" />
            Import Lịch
          </button>
        </header>

        <p className="text-sm text-slate-500 max-w-xl">
          Nhấp vào ô trống để thêm lịch. Bạn có thể kéo thả các khối môn học để thay đổi thời gian (Kéo lên/xuống).
        </p>

        <TimetableGrid 
          currentDate={currentDate} 
          items={items} 
          onItemClick={setEditingItem}
          onEmptySlotClick={handleEmptySlotClick}
          onItemMove={handleItemMove}
        />
      </div>

      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        currentDate={currentDate}
      />

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setEditingItem(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                {editingItem.id ? 'Sửa hoạt động' : 'Thêm hoạt động'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên môn / Hoạt động</label>
                  <input 
                    type="text" 
                    value={editingItem.subject || ''}
                    onChange={e => setEditingItem({...editingItem, subject: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="VD: Làm thêm, Học mạng..."
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Địa điểm / Phòng</label>
                  <input 
                    type="text" 
                    value={editingItem.room || ''}
                    onChange={e => setEditingItem({...editingItem, room: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="VD: C401, Quán cà phê..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Giờ bắt đầu</label>
                    <input 
                      type="time" 
                      value={editStartTimeStr}
                      onChange={e => updateEditTime('start', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Giờ kết thúc</label>
                    <input 
                      type="time" 
                      value={editEndTimeStr}
                      onChange={e => updateEditTime('end', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày diễn ra</label>
                  <input 
                    type="date"
                    value={editDateStr}
                    onChange={e => {
                      if (!editingItem.startTime) return;
                      const newDate = parseISO(e.target.value);
                      const oldStart = parseISO(editingItem.startTime);
                      const oldEnd = editingItem.endTime ? parseISO(editingItem.endTime) : oldStart;
                      
                      const newStart = setMinutes(setHours(newDate, oldStart.getHours()), oldStart.getMinutes());
                      const newEnd = setMinutes(setHours(newDate, oldEnd.getHours()), oldEnd.getMinutes());
                      
                      setEditingItem({
                        ...editingItem,
                        startTime: newStart.toISOString(),
                        endTime: newEnd.toISOString()
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Màu sắc</label>
                  <div className="flex items-center gap-2 mt-2">
                    {COLORS.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => setEditingItem({...editingItem, colorIndex: i})}
                        className={`w-8 h-8 rounded-full border ${c.split(' ')[0]} ${editingItem.colorIndex === i ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''} transition-all`}
                      />
                    ))}
                  </div>
                </div>

                {!editingItem.id && (
                  <div className="pt-4 border-t border-slate-100">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Lặp lại vào các tuần (tùy chọn):</label>
                    <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                      {upcomingWeeks.map((week, idx) => {
                        const isSelected = editSelectedWeeks.some(w => w.getTime() === week.getTime());
                        return (
                          <label key={idx} className={`flex items-center gap-1.5 p-1.5 rounded border cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => {
                                setEditSelectedWeeks(prev => {
                                  const exists = prev.find(w => w.getTime() === week.getTime());
                                  if (exists) return prev.filter(w => w.getTime() !== week.getTime());
                                  return [...prev, week];
                                });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                            />
                            <span className="text-[10px] font-medium">
                              {format(week, 'dd/MM')}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {editingItem.id && editingItem.seriesId && (
                  <div className="pt-4 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={updateSeries}
                        onChange={(e) => setUpdateSeries(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-sm font-medium text-slate-700">Cập nhật (hoặc xóa) cho tất cả các tuần</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                {editingItem.id && (
                  <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg mr-auto transition-colors">
                    Xóa
                  </button>
                )}
                <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Hủy
                </button>
                <button onClick={handleSave} className="px-6 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors">
                  Lưu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
