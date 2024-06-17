import React from 'react';
import './Subscription.css';

const Subscription = () => {
  return (
    <div className="subscription-container">
      <h2>Subscribe</h2>
      <form>
        <label htmlFor="email">Get updates directly to your inbox:</label>
        <div className="subscription-form">
          <input type="email" id="email" name="email" placeholder="Your email address" required />
          <button type="submit">Subscribe</button>
        </div>
      </form>
    </div>
  );
}

export default Subscription;
