// Post.js
import React from 'react';
import { useParams } from 'react-router-dom';
import posts from '../../posts';
import NotFound from '../NotFound/NotFound';

const Post = () => {
  const { id } = useParams();
  const post = posts.find(post => post.id === parseInt(id));

  if (!post) {
    return <NotFound />;
  }

  return (
    <div>
      <h2>{post.title}</h2>
      <p>{post.content}</p>
    </div>
  );
};

export default Post;
