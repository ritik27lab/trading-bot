const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies
app.use(bodyParser.json());

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Handle POST requests to the form submission
app.post('/submit', (req, res) => {
  const inputValue1 = req.body.input1;
  const inputValue2 = req.body.input2;
  const selectValue1 = req.body.select1;
  const selectValue2 = req.body.select2;

  // Create JSON payload
  const payload = {
    value1: inputValue1,
    value2: inputValue2,
    option: selectValue1,
    param: selectValue2
  };

  // Perform the API calls using the JSON payload
  // Replace the URLs with your actual API endpoints
  const url1 = "https://api.example.com/endpoint1";
  fetch(url1, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => {
      console.log("API 1 response:", data);
      // Process the API response here
    })
    .catch(error => {
      console.error("API 1 error:", error);
      // Handle API error here
    });

  const url2 = "https://api.example.com/endpoint2";
  fetch(url2, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => {
      console.log("API 2 response:", data);
      // Process the API response here
    })
    .catch(error => {
      console.error("API 2 error:", error);
      // Handle API error here
    });

  res.send('API calls completed successfully.'); // Send a response to the client
});
