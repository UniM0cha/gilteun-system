import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Worship } from './pages/Worship';
import { Admin } from './pages/Admin';
import { StyleTest } from './pages/StyleTest';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/worship" element={<Worship />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/style-test" element={<StyleTest />} />
      </Routes>
    </Router>
  );
}

export default App;
