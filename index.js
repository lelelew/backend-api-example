const express = require("express");
const got = require("got");

const app = express();
const cache = new Map();

app.use(express.json());

// Route 1:
app.get("/api/ping", (req, res) => {
  res.status(200).json({
    success: true
  });
});

// Route 2:
app.get("/api/posts", async (req, res) => {
  // Set default value of sortBy to "id"
  let sortBy = req.query.sortBy ? req.query.sortBy.toLowerCase() : "id";
  // Set default value of direction to "asc"
  let direction = req.query.direction
    ? req.query.direction.toLowerCase()
    : "asc";

  // Return status code 400 & error message if no tag parameter is specified
  if (typeof req.query.tags !== "string") {
    return res.status(400).json({
      error: "Tags parameter is required"
    });
  }

  let lowerCaseTags = req.query.tags.toLowerCase();

  // Check for validity of sortBy query passed in & return status code 400 & error message if invalid
  const validSortBy = ["id", "reads", "likes", "popularity"];
  if (!validSortBy.includes(sortBy)) {
    return res.status(400).json({
      error: "sortBy parameter is invalid"
    });
  }

  // Check for validity of direction query passed in & return status code 400 & error message if invalid
  const validDirection = ["asc", "desc"];
  if (!validDirection.includes(direction)) {
    return res.status(400).json({
      error: "direction parameter is invalid"
    });
  }

  let tags = lowerCaseTags.split(",");
  let posts = [];
  let responses = [];
  // Fire all api requests concurrently
  for (let tag of tags) {
    // Cache responses
    const response = got(`https://example.come/api/blog/posts?tag=${tag}`, {
      json: true,
      cache: cache
    });
    responses.push(response);
  }
  // Await responses from all api calls before aggregating
  try {
    const results = await Promise.all(responses);
    for (let result of results) {
      posts = posts.concat(result.body.posts);
      // Test to see if results are being cached
      //console.log(result.fromCache);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }

  // Remove duplicate posts
  let idsSeen = new Map();

  let filteredPosts = posts.filter(post => {
    if (!idsSeen.has(post.id)) {
      idsSeen.set(post.id);
      return true;
    }
    return false;
  });

  // Handle sorting parameter and direction for sorting
  filteredPosts.sort((a, b) => {
    if (a[sortBy] < b[sortBy]) {
      return direction === "asc" ? -1 : 1;
    } else if (a[sortBy] > b[sortBy]) {
      return direction === "asc" ? 1 : -1;
    } else {
      return 0;
    }
  });

  res.json({ posts: filteredPosts });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));
