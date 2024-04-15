// Footer.js
import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer>
      <div className="footer-container">
        <div className="footer-text">© 2024 My Blog</div>
        <div className="footer-links">
          <a href="/">Home</a>
          <a href="/about">About</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
