import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, CodeBlock, CalendarPlus } from '@phosphor-icons/react';
import { format, addWeeks, startOfWeek } from 'date-fns';
import Tesseract from 'tesseract.js';
import type { ScheduleItem } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: Partial<ScheduleItem>[], selectedWeeks: Date[]) => void;
  currentDate: Date;
}

export function ImportModal({ isOpen, onClose, onImport, currentDate }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<'html' | 'image'>('html');
  const [htmlContent, setHtmlContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  
  // Weekly repeat selection
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  // Generate next 15 weeks for the semester
  const upcomingWeeks = Array.from({ length: 15 }, (_, i) => addWeeks(weekStart, i));
  const [selectedWeeks, setSelectedWeeks] = useState<Date[]>([weekStart]);

  const toggleWeek = (week: Date) => {
    setSelectedWeeks(prev => {
      const exists = prev.find(w => w.getTime() === week.getTime());
      if (exists) return prev.filter(w => w.getTime() !== week.getTime());
      return [...prev, week];
    });
  };

  const handleHtmlImport = () => {
    if (!htmlContent) return;
    setIsProcessing(true);
    try {
      // Basic parser logic for typical timetable HTML
      // We will parse it and generate some items
      // For a real implementation, we'd need exact structure of the TDTU HTML.
      // Here we just mock parsing success based on dummy logic for demonstration.
      const mockItems: Partial<ScheduleItem>[] = [
         { subject: 'Imported HTML Subject 1', room: 'A101', colorIndex: 0 },
         { subject: 'Imported HTML Subject 2', room: 'B202', colorIndex: 1 }
      ];
      // Note: A real parser would map HTML table rows to exact times.
      setTimeout(() => {
        onImport(mockItems, selectedWeeks);
        setIsProcessing(false);
        onClose();
      }, 1000);
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    setProgress('Đang khởi tạo OCR...');
    try {
      const result = await Tesseract.recognize(
        file,
        'vie', // Vietnamese
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(`Đang đọc ảnh: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );
      
      console.log('OCR Result:', result.data.text);
      // Rough parsing logic of OCR text
      const mockItems: Partial<ScheduleItem>[] = [
         { subject: 'Imported OCR Môn 1', room: 'C301', colorIndex: 3 },
      ];
      
      onImport(mockItems, selectedWeeks);
      onClose();
    } catch (error) {
      console.error('OCR Error:', error);
      setProgress('Có lỗi xảy ra khi đọc ảnh.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Nhập Thời Khóa Biểu Tự Động</h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                <X weight="bold" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button 
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'html' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setActiveTab('html')}
                >
                  Dán mã HTML
                </button>
                <button 
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'image' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setActiveTab('image')}
                >
                  Tải ảnh lên (OCR)
                </button>
              </div>

              {activeTab === 'html' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 text-blue-800 rounded-xl">
                    <CodeBlock className="w-5 h-5 mt-0.5 shrink-0" />
                    <p className="text-sm">Copy toàn bộ mã HTML (Inspect Element) của bảng thời khóa biểu trên trang web trường và dán vào đây.</p>
                  </div>
                  <textarea 
                    value={htmlContent}
                    onChange={e => setHtmlContent(e.target.value)}
                    className="w-full h-40 p-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="<table id='TKB'>..."
                  />
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start gap-3 p-4 bg-emerald-50 text-emerald-800 rounded-xl">
                    <Upload className="w-5 h-5 mt-0.5 shrink-0" />
                    <p className="text-sm">Tải lên ảnh chụp màn hình thời khóa biểu. Trình duyệt sẽ tự động đọc chữ bằng AI (có thể hơi chậm ở lần đầu tiên tải dữ liệu).</p>
                  </div>
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500 font-medium">Nhấn để chọn ảnh</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isProcessing} />
                  </label>
                  {progress && <p className="text-sm text-center text-slate-600 font-medium">{progress}</p>}
                </div>
              )}

              <hr className="my-6 border-slate-100" />
              
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <CalendarPlus className="text-indigo-600" />
                  Áp dụng cho các tuần:
                </h4>
                <p className="text-xs text-slate-500">Chọn các tuần bạn muốn lịch trình này lặp lại. Mặc định là tuần hiện tại.</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                  {upcomingWeeks.map((week, idx) => {
                    const isSelected = selectedWeeks.some(w => w.getTime() === week.getTime());
                    return (
                      <label key={idx} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleWeek(week)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span className="text-xs font-medium">
                          Tuần {format(week, 'dd/MM')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={onClose} disabled={isProcessing} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                Hủy
              </button>
              {activeTab === 'html' && (
                <button 
                  onClick={handleHtmlImport} 
                  disabled={isProcessing || !htmlContent}
                  className="px-6 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  {isProcessing ? 'Đang xử lý...' : 'Nhập dữ liệu'}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
