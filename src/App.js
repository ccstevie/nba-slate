// App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import PlayerTable from './pages/NBA/PlayerTable';
// import Home from './pages/Home/Home';
// import About from './pages/About/About';
// import Create from './pages/Create/Create';
// import Post from './components/Post/Post';
import NotFound from './components/NotFound/NotFound';
import './App.css';

const App = () => {
  return (
    <Router>
      <div className="App">
        <header>
          <Navbar />
        </header>
        <main>
          <Routes>
            <Route exact path="/" element={<PlayerTable />} />
            {/* <Route exact path="/" element={<Home />} /> */}
            {/* <Route path="/about" element={<About />} /> */}
            {/* <Route path="/create" element={<Create />} /> */}
            {/* <Route path="/post/:id" element={<Post />} /> */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
