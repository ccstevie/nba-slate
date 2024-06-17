import './Home.css';
import blogEntries from '../../blogEntries.json';

const Home = () => {
  return (
    <div className="home">
      <header>
        <h1>My Personal Sports Betting Blog</h1>
        <p>Welcome to my blog! Feel free to check out the <i>About</i> page for some information about me.</p>
      </header>
      <section>
        <h2>Daily Entry</h2>
        {blogEntries ? (blogEntries.map((blogEntry) => 
          <div>
            <h3>{blogEntry.league}</h3>
            <p>{blogEntry.content}</p>
          </div>
        )) : (
          <p>No blog entry for today.</p>
        )}
      </section>
    </div>
  );
}

export default Home;
