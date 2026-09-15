import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Trash, CalendarBlank } from '@phosphor-icons/react';

export default function Home() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([
    { id: 'sol', name: 'Sol', color: 'bg-emerald-500' },
    { id: 'bia', name: 'Bia', color: 'bg-blue-500' },
  ]);

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAdd = () => {
    const name = prompt('Nhập tên người dùng mới:');
    if (name) {
      const id = name.toLowerCase().replace(/\s+/g, '-');
      setSchedules((prev) => [...prev, { id, name, color: 'bg-indigo-500' }]);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="max-w-3xl w-full mx-auto space-y-12">
        <header className="text-center space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900"
          >
            Lịch Trình Cá Nhân
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 text-lg"
          >
            Chọn thời khóa biểu để xem hoặc chỉnh sửa.
          </motion.p>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
        >
          {schedules.map((person, index) => (
            <motion.div
              key={person.id}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => navigate(`/schedule/${person.id}`)}
              className="relative group cursor-pointer overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col items-center justify-center min-h-[160px]"
            >
              <div className={`absolute top-0 left-0 w-full h-1 ${person.color}`} />
              <CalendarBlank weight="duotone" className="w-12 h-12 text-slate-400 mb-4 group-hover:text-slate-600 transition-colors" />
              <h2 className="text-2xl font-semibold text-slate-800">{person.name}</h2>
              
              <button 
                onClick={(e) => handleRemove(e, person.id)}
                className="absolute top-3 right-3 p-2 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                title="Xóa thời khóa biểu"
              >
                <Trash weight="bold" size={18} />
              </button>
            </motion.div>
          ))}

          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAdd}
            className="cursor-pointer rounded-2xl bg-slate-100/50 border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-100 transition-colors p-6 flex flex-col items-center justify-center min-h-[160px] text-slate-500 hover:text-slate-700"
          >
            <Plus weight="bold" className="w-8 h-8 mb-2" />
            <span className="font-medium">Thêm người mới</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
