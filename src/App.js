// App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Home from './components/Home/Home';
import About from './components/About/About';
import Post from './components/Post/Post';
import NotFound from './components/NotFound';
import Footer from './components/Footer/Footer'; // Import Footer component
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
            <Route exact path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/post/:id" element={<Post />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
