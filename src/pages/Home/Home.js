import blogEntries from '../../blogEntries.json';

const Home = () => {
  return (
    <div className="container">
      <header>
        <h1 className="title">My Personal Sports Betting Blog</h1>
        <p className="text">Welcome to my blog! Feel free to check out the <i>About</i> page for some information about me.</p>
      </header>
      <div className="section">
        {blogEntries ? (blogEntries.map((blogEntry) => 
          <div>
            <h2>{blogEntry.league}</h2>
            <p className="text">{blogEntry.content}</p>
          </div>
        )) : (
          <p className="text">No blog entry for today.</p>
        )}
      </div>
    </div>
  );
}

export default Home;
