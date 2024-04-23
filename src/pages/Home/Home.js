import React from 'react';
import './Home.css';
// import Subscription from '../../components/Subscription/Subscription';

const Home = () => {
  return (
    <div className="home">
      <header>
        <h1>Today's Slate</h1>
      </header>
      <section>
        <h2>NBA</h2>
        <ul>
          <li>
            <h3>Post Title</h3>
            <p>Post content goes here...</p>
          </li>
        </ul>
      </section>
      {/* <aside>
          <Subscription />
      </aside> */}
    </div>
  );
}

export default Home;
