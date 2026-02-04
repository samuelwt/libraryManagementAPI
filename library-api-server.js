/**
 * LIBRARY MANAGEMENT API - BACKEND IMPLEMENTATION
 * This file implements the GET /books endpoint from the OpenAPI spec
 * 
 * To run this server:
 * 1. npm install express
 * 2. node library-api-server.js
 * 3. Visit http://localhost:3000/books in your browser
 */

const express = require('express');
const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Enable CORS for frontend testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// =============================================================================
// IN-MEMORY DATABASE (normally this would be PostgreSQL/MongoDB)
// =============================================================================
let books = [
  {
    id: 1,
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    isbn: "978-0547928227",
    published_year: 1937,
    category: "fiction",
    copies_available: 3,
    copies_total: 5,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-05T10:30:00Z"
  },
  {
    id: 2,
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    published_year: 2008,
    category: "technology",
    copies_available: 2,
    copies_total: 2,
    created_at: "2025-01-02T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z"
  },
  {
    id: 3,
    title: "1984",
    author: "George Orwell",
    isbn: "978-0451524935",
    published_year: 1949,
    category: "fiction",
    copies_available: 0,
    copies_total: 4,
    created_at: "2025-01-03T00:00:00Z",
    updated_at: "2025-01-10T14:20:00Z"
  },
  {
    id: 4,
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen",
    isbn: "978-0262033848",
    published_year: 2009,
    category: "technology",
    copies_available: 1,
    copies_total: 3,
    created_at: "2025-01-04T00:00:00Z",
    updated_at: "2025-01-04T00:00:00Z"
  },
  {
    id: 5,
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    isbn: "978-0544003415",
    published_year: 1954,
    category: "fiction",
    copies_available: 2,
    copies_total: 6,
    created_at: "2025-01-05T00:00:00Z",
    updated_at: "2025-01-12T09:15:00Z"
  }
];

// =============================================================================
// GET /books - LIST ALL BOOKS WITH FILTERING, SORTING, AND PAGINATION
// =============================================================================
app.get('/books', (req, res) => {
  console.log('\n📚 GET /books request received');
  console.log('Query parameters:', req.query);

  // STEP 1: Extract query parameters (with defaults)
  // the following is just a variable declaration
  // const category = req.query.category

  // req.query itself is just a JS object -> i.e. {category: "fiction", pages:"2"}
  // this is automatically generated from client req URL - http://localhost:3000/books?category=fiction&pages=2
  const {
    category,        // Filter by category
    author,          // Filter by author
    available,       // Filter by availability
    sort_by = 'title',   // Sort field (default: title)
    order = 'asc',       // Sort order (default: ascending)
    page = 1,            // Page number (default: 1)
    limit = 20           // Items per page (default: 20)
  } = req.query;

  // STEP 2: Validate query parameters
  // The only three valid sort fields are title, published year, and author
  // response returns an error for any other stuff placed in sort by
  const validSortFields = ['title', 'published_year', 'author'];
  if (!validSortFields.includes(sort_by)) {
    return res.status(400).json({
      error: {
        code: "INVALID_PARAMETER",
        message: "Invalid sort_by parameter",
        details: [{
          field: "sort_by",
          message: `Must be one of: ${validSortFields.join(', ')}`
        }]
      }
    });
  }

  // same - order only takes in 'asc' or 'desc'
  // error otherwise
  if (!['asc', 'desc'].includes(order)) {
    return res.status(400).json({
      error: {
        code: "INVALID_PARAMETER",
        message: "Invalid order parameter",
        details: [{
          field: "order",
          message: "Must be 'asc' or 'desc'"
        }]
      }
    });
  }

  // STEP 3: Start with all books
  let filteredBooks = [...books];

  // STEP 4: Apply filters
  if (category) {
    filteredBooks = filteredBooks.filter(book => 
      book.category.toLowerCase() === category.toLowerCase()
    );
    console.log(`  ✓ Filtered by category: ${category} (${filteredBooks.length} results)`);
  }

  if (author) {
    filteredBooks = filteredBooks.filter(book =>
      book.author.toLowerCase().includes(author.toLowerCase())
    );
    console.log(`  ✓ Filtered by author: ${author} (${filteredBooks.length} results)`);
  }

  if (available !== undefined) {
    // Convert string "true"/"false" to boolean
    const isAvailable = available === 'true' || available === true;
    filteredBooks = filteredBooks.filter(book =>
      isAvailable ? book.copies_available > 0 : book.copies_available === 0
    );
    console.log(`  ✓ Filtered by availability: ${isAvailable} (${filteredBooks.length} results)`);
  }

  // STEP 5: Apply sorting
  filteredBooks.sort((a, b) => {
    let aVal = a[sort_by];
    let bVal = b[sort_by];

    // Handle string comparison (case-insensitive)
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  console.log(`  ✓ Sorted by ${sort_by} (${order})`);

  // STEP 6: Apply pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  
  const paginatedBooks = filteredBooks.slice(startIndex, endIndex);
  const totalItems = filteredBooks.length;
  const totalPages = Math.ceil(totalItems / limitNum);

  console.log(`  ✓ Paginated: page ${pageNum} of ${totalPages} (showing ${paginatedBooks.length} items)`);

  // STEP 7: Build response matching OpenAPI spec
  const response = {
    data: paginatedBooks,
    pagination: {
      current_page: pageNum,
      total_pages: totalPages,
      total_items: totalItems,
      items_per_page: limitNum
    }
  };

  // STEP 8: Send response
  console.log('✅ Response sent\n');
  res.status(200).json(response);
});

// =============================================================================
// POST /books - CREATE NEW BOOK
// =============================================================================
app.post('/books', (req, res) => {
  console.log('\n📝 POST /books request received');
  console.log('Request body:', req.body);

  const { title, author, isbn, published_year, category, copies_total = 1 } = req.body;

  // STEP 1: Validate required fields
  if (!title || !author || !isbn) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Missing required fields",
        details: [
          !title && { field: "title", message: "Title is required" },
          !author && { field: "author", message: "Author is required" },
          !isbn && { field: "isbn", message: "ISBN is required" }
        ].filter(Boolean)
      }
    });
  }

  // STEP 2: Check for duplicate ISBN
  const existingBook = books.find(book => book.isbn === isbn);
  if (existingBook) {
    return res.status(409).json({
      error: {
        code: "DUPLICATE_ISBN",
        message: "A book with this ISBN already exists",
        details: {
          existing_book_id: existingBook.id
        }
      }
    });
  }

  // STEP 3: Create new book
  const newBook = {
    id: books.length + 1, // In real app, database would generate this
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

  books.push(newBook);

  console.log('✅ Book created:', newBook.id);

  // STEP 4: Send response with Location header
  res.status(201)
    .header('Location', `/books/${newBook.id}`)
    .json(newBook);
});

// =============================================================================
// GET /books/:id - GET SINGLE BOOK
// =============================================================================
app.get('/books/:id', (req, res) => {
  const bookId = parseInt(req.params.id);
  console.log(`\n🔍 GET /books/${bookId} request received`);

  const book = books.find(b => b.id === bookId);

  if (!book) {
    return res.status(404).json({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: `Book with ID ${bookId} not found`
      }
    });
  }

  console.log('✅ Book found:', book.title);
  res.status(200).json(book);
});

// =============================================================================
// DELETE /books/:id - DELETE A BOOK
// =============================================================================
app.delete('/books/:id', (req, res) => {
  const bookId = parseInt(req.params.id);
  console.log(`\n🗑️  DELETE /books/${bookId} request received`);

  const bookIndex = books.findIndex(b => b.id === bookId);

  if (bookIndex === -1) {
    return res.status(404).json({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: `Book with ID ${bookId} not found`
      }
    });
  }

  // In real app, you'd check for active loans here
  // For demo, assume no active loans
  books.splice(bookIndex, 1);

  console.log('✅ Book deleted');
  res.status(204).send(); // No content response
});

// =============================================================================
// START SERVER
// =============================================================================
app.listen(PORT, () => {
  console.log('\n🚀 Library API Server is running!');
  console.log(`📍 Base URL: http://localhost:${PORT}`);
  console.log('\n📚 Try these endpoints:');
  console.log(`   GET    http://localhost:${PORT}/books`);
  console.log(`   GET    http://localhost:${PORT}/books?category=fiction`);
  console.log(`   GET    http://localhost:${PORT}/books?author=Tolkien`);
  console.log(`   GET    http://localhost:${PORT}/books?available=true&sort_by=published_year&order=desc`);
  console.log(`   GET    http://localhost:${PORT}/books/1`);
  console.log(`   POST   http://localhost:${PORT}/books`);
  console.log(`   DELETE http://localhost:${PORT}/books/5`);
  console.log('\n⏳ Waiting for requests...\n');
});
