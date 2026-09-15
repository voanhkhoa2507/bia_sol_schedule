import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Timetable from './pages/Timetable';

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="min-h-[100dvh] w-full font-sans text-slate-900 bg-slate-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schedule/:personId" element={<Timetable />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
