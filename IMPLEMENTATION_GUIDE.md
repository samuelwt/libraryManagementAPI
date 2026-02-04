# Library API Implementation Guide

## Overview
This guide explains how the OpenAPI specification (YAML file) translates into actual working code. You now have three files that work together:

1. **libraryManagementAPI.yaml** - The blueprint/contract
2. **library-api-server.js** - The backend implementation (Node.js/Express)
3. **library-api-client.html** - The frontend that calls the API

---

## How to Run This Example

### Step 1: Install Dependencies
```bash
# Make sure you have Node.js installed, then:
npm install express
```

### Step 2: Start the Backend Server
```bash
node library-api-server.js
```

You should see:
```
🚀 Library API Server is running!
📍 Base URL: http://localhost:3000
```

### Step 3: Open the Frontend
Simply open `library-api-client.html` in your browser (double-click the file).

---

## Understanding the Flow

### Example: Searching for Fiction Books

#### 1. YAML Specification Says:
```yaml
/books:
  get:
    parameters:
      - name: category
        in: query
        schema:
          type: string
          example: fiction
```

This means: "The API accepts a 'category' query parameter"

#### 2. Frontend JavaScript Calls:
```javascript
const params = new URLSearchParams();
params.append('category', 'fiction');

fetch(`http://localhost:3000/books?${params}`)
  .then(response => response.json())
  .then(data => console.log(data));
```

This creates the URL: `http://localhost:3000/books?category=fiction`

#### 3. Backend Receives & Processes:
```javascript
app.get('/books', (req, res) => {
  const { category } = req.query;  // Extract 'category' from URL
  
  let filteredBooks = books.filter(book => 
    book.category === category     // Apply filter
  );
  
  res.json({ data: filteredBooks }); // Send response
});
```

#### 4. Response Matches YAML Spec:
```yaml
responses:
  '200':
    content:
      application/json:
        schema:
          properties:
            data:
              type: array
              items:
                $ref: '#/components/schemas/Book'
```

The response structure matches what was specified!

---

## Key Concepts Explained

### 1. Query Parameters (in the URL)
```
http://localhost:3000/books?category=fiction&author=Tolkien&page=1
                            ↑
                            These are query parameters
```

**In the backend:**
```javascript
const { category, author, page } = req.query;
// category = "fiction"
// author = "Tolkien"
// page = "1"
```

### 2. Path Parameters (in the URL path)
```
http://localhost:3000/books/123
                             ↑
                             This is a path parameter
```

**Backend route definition:**
```javascript
app.get('/books/:id', (req, res) => {
  const bookId = req.params.id; // bookId = "123"
  // Find book with this ID
});
```

### 3. Request Body (for POST/PUT)
```javascript
// Frontend sends data:
fetch('http://localhost:3000/books', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "New Book",
    author: "New Author",
    isbn: "123-456"
  })
})
```

**Backend receives:**
```javascript
app.post('/books', (req, res) => {
  const { title, author, isbn } = req.body;
  // Create new book with this data
});
```

### 4. Response Status Codes

The YAML spec defines these responses:
- **200 OK** - Request succeeded
- **201 Created** - Resource created
- **204 No Content** - Success, but no response body
- **400 Bad Request** - Invalid input
- **404 Not Found** - Resource doesn't exist
- **409 Conflict** - Duplicate/constraint violation

**Backend implementation:**
```javascript
// Success
res.status(200).json({ data: books });

// Created
res.status(201).json(newBook);

// Error
res.status(404).json({
  error: {
    code: "RESOURCE_NOT_FOUND",
    message: "Book not found"
  }
});
```

---

## Step-by-Step: Creating a New Book

### What the YAML Says:
```yaml
/books:
  post:
    requestBody:
      required: true
      content:
        application/json:
          schema:
            required:
              - title
              - author
              - isbn
            properties:
              title:
                type: string
                minLength: 1
                maxLength: 200
```

### Frontend Implementation:
```javascript
async function createBook() {
  // 1. Collect data from form
  const bookData = {
    title: "Design Patterns",
    author: "Gang of Four",
    isbn: "978-0201633610",
    published_year: 1994,
    category: "technology",
    copies_total: 3
  };

  // 2. Make POST request
  const response = await fetch('http://localhost:3000/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookData)
  });

  // 3. Handle response
  const result = await response.json();
  
  if (response.ok) {
    console.log('Book created!', result);
  } else {
    console.error('Error:', result.error);
  }
}
```

### Backend Implementation:
```javascript
app.post('/books', (req, res) => {
  // 1. Extract data from request body
  const { title, author, isbn, published_year, category, copies_total } = req.body;

  // 2. Validate required fields (matching YAML spec)
  if (!title || !author || !isbn) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Missing required fields"
      }
    });
  }

  // 3. Check for duplicate ISBN
  const existingBook = books.find(book => book.isbn === isbn);
  if (existingBook) {
    return res.status(409).json({
      error: {
        code: "DUPLICATE_ISBN",
        message: "A book with this ISBN already exists"
      }
    });
  }

  // 4. Create new book
  const newBook = {
    id: books.length + 1,
    title,
    author,
    isbn,
    published_year: published_year || null,
    category: category || null,
    copies_available: copies_total,
    copies_total,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 5. Save to "database" (in-memory array)
  books.push(newBook);

  // 6. Return success response (matching YAML spec)
  res.status(201)
    .header('Location', `/books/${newBook.id}`)
    .json(newBook);
});
```

---

## Common Patterns Explained

### 1. Filtering
```javascript
// Get only available books
let filteredBooks = books.filter(book => book.copies_available > 0);

// Get books by category
let filteredBooks = books.filter(book => book.category === 'fiction');

// Get books by author (partial match, case-insensitive)
let filteredBooks = books.filter(book =>
  book.author.toLowerCase().includes('tolkien')
);
```

### 2. Sorting
```javascript
// Sort by title (ascending)
filteredBooks.sort((a, b) => a.title.localeCompare(b.title));

// Sort by year (descending)
filteredBooks.sort((a, b) => b.published_year - a.published_year);

// Generic sorting based on user choice
const sortField = 'published_year';
const order = 'desc';

filteredBooks.sort((a, b) => {
  if (order === 'asc') {
    return a[sortField] > b[sortField] ? 1 : -1;
  } else {
    return a[sortField] < b[sortField] ? 1 : -1;
  }
});
```

### 3. Pagination
```javascript
const page = 2;        // User wants page 2
const limit = 20;      // 20 items per page

// Calculate which items to show
const startIndex = (page - 1) * limit;  // (2-1) * 20 = 20
const endIndex = startIndex + limit;     // 20 + 20 = 40

// Get only items for this page
const paginatedBooks = filteredBooks.slice(startIndex, endIndex);

// Calculate metadata
const totalItems = filteredBooks.length;
const totalPages = Math.ceil(totalItems / limit);

// Return with pagination info
res.json({
  data: paginatedBooks,
  pagination: {
    current_page: page,
    total_pages: totalPages,
    total_items: totalItems,
    items_per_page: limit
  }
});
```

---

## Real-World Differences

In a production application, you would:

### 1. Use a Real Database
```javascript
// Instead of in-memory array:
let books = [];

// Use a database (e.g., PostgreSQL with Prisma):
const books = await prisma.book.findMany({
  where: {
    category: 'fiction',
    copies_available: { gt: 0 }
  },
  orderBy: {
    title: 'asc'
  },
  skip: (page - 1) * limit,
  take: limit
});
```

### 2. Add Authentication
```javascript
app.get('/books', authenticateUser, (req, res) => {
  // req.user will contain the authenticated user
  // Only proceed if user is logged in
});
```

### 3. Add Validation Libraries
```javascript
const { body, validationResult } = require('express-validator');

app.post('/books', [
  body('title').notEmpty().isLength({ max: 200 }),
  body('isbn').matches(/^[0-9-]{10,17}$/),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Proceed with creation
});
```

### 4. Add Error Handling Middleware
```javascript
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong"
    }
  });
});
```

---

## Testing Your API

### Using Browser (GET requests only)
```
http://localhost:3000/books
http://localhost:3000/books?category=fiction
http://localhost:3000/books/1
```

### Using cURL (command line)
```bash
# GET request
curl http://localhost:3000/books

# POST request
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{"title":"New Book","author":"Author","isbn":"123-456"}'

# DELETE request
curl -X DELETE http://localhost:3000/books/1
```

### Using Postman or Insomnia
These GUI tools let you:
- Import the OpenAPI YAML file
- Auto-generate requests
- Test all endpoints visually

---

## Key Takeaways

1. **YAML is documentation** - It describes what your API should do
2. **Backend code implements** - It actually does what the YAML describes
3. **Frontend code consumes** - It calls the API endpoints
4. **They should match** - The implementation should follow the specification

The OpenAPI spec is like a blueprint for a house - it shows what rooms exist and where doors are, but you still need to build the actual house (the backend code).

---

## Next Steps

1. Try modifying the filters in the HTML client
2. Add a new endpoint (e.g., `/books/search` for full-text search)
3. Implement the missing endpoints from the YAML (if any)
4. Add validation to match all the constraints in the YAML spec
5. Connect to a real database instead of in-memory storage

Good luck with your API development! 🚀
