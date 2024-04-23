// Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css'; // Import CSS file from same directory

const Navbar = () => {
  return (
    <nav>
      <div className="navbar-container">
        <ul className="navbar-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/about">About</Link></li>
          {/* Add additional links here */}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
