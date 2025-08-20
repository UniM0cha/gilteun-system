import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Worship } from './pages/Worship';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/worship" element={<Worship />} />
      </Routes>
    </Router>
  );
}

export default App;
