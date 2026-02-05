/**
 * LIBRARY MANAGEMENT API - WITH SQLITE DATABASE
 * This version uses a real SQLite database instead of in-memory array
 * 
 * To run this server:
 * 1. npm install express sqlite sqlite3
 * 2. node library-api-server-with-db.js
 * 3. Database file (library.db) will be created automatically
 */

const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = 3000;

// =============================================================================
// DATABASE SETUP
// =============================================================================

let db; // Will hold database connection

/**
 * Initialize SQLite database
 * - Creates database file if it doesn't exist
 * - Creates tables if they don't exist
 * - Seeds with initial data
 */
async function initializeDatabase() {
  // Open database connection
  db = await open({
    filename: './library.db',  // Database file path
    driver: sqlite3.Database   // Database driver
  });

  console.log('📂 Database connected: library.db');

  // Create books table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT UNIQUE NOT NULL,
      published_year INTEGER,
      category TEXT,
      copies_available INTEGER DEFAULT 0,
      copies_total INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Table "books" ready');

  // Check if we need to seed data
  const count = await db.get('SELECT COUNT(*) as count FROM books');
  
  if (count.count === 0) {
    console.log('🌱 Seeding initial data...');
    
    // Insert sample books
    const books = [
      {
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        isbn: "978-0547928227",
        published_year: 1937,
        category: "fiction",
        copies_available: 3,
        copies_total: 5
      },
      {
        title: "Clean Code",
        author: "Robert C. Martin",
        isbn: "978-0132350884",
        published_year: 2008,
        category: "technology",
        copies_available: 2,
        copies_total: 2
      },
      {
        title: "1984",
        author: "George Orwell",
        isbn: "978-0451524935",
        published_year: 1949,
        category: "fiction",
        copies_available: 0,
        copies_total: 4
      },
      {
        title: "Introduction to Algorithms",
        author: "Thomas H. Cormen",
        isbn: "978-0262033848",
        published_year: 2009,
        category: "technology",
        copies_available: 1,
        copies_total: 3
      },
      {
        title: "The Lord of the Rings",
        author: "J.R.R. Tolkien",
        isbn: "978-0544003415",
        published_year: 1954,
        category: "fiction",
        copies_available: 2,
        copies_total: 6
      }
    ];

    for (const book of books) {
      await db.run(`
        INSERT INTO books (title, author, isbn, published_year, category, copies_available, copies_total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [book.title, book.author, book.isbn, book.published_year, book.category, book.copies_available, book.copies_total]);
    }

    console.log(`✅ Seeded ${books.length} books`);
  } else {
    console.log(`📚 Database has ${count.count} books`);
  }
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// =============================================================================
// ROUTE: GET /books - LIST ALL BOOKS
// =============================================================================

app.get('/books', async (req, res) => {
  console.log('\n📚 GET /books request received');
  console.log('Query parameters:', req.query);

  try {
    // STEP 1: Extract and validate query parameters
    const {
      category,
      author,
      available,
      sort_by = 'title',
      order = 'asc',
      page = 1,
      limit = 20
    } = req.query;

    // Validate sort_by
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

    // Validate order
    if (!['asc', 'desc'].includes(order.toLowerCase())) {
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

    // STEP 2: Build SQL query dynamically
    let whereConditions = [];
    let queryParams = [];

    // Add category filter
    if (category) {
      whereConditions.push('category = ?');
      queryParams.push(category);
    }

    // Add author filter (partial match, case-insensitive)
    if (author) {
      whereConditions.push('author LIKE ?');
      queryParams.push(`%${author}%`);
    }

    // Add availability filter
    if (available !== undefined) {
      const isAvailable = available === 'true' || available === true;
      if (isAvailable) {
        whereConditions.push('copies_available > 0');
      } else {
        whereConditions.push('copies_available = 0');
      }
    }

    // Build WHERE clause
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // STEP 3: Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM books ${whereClause}`;
    const { total } = await db.get(countQuery, queryParams);

    // STEP 4: Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum);

    // STEP 5: Build main query with sorting and pagination
    const dataQuery = `
      SELECT * FROM books 
      ${whereClause}
      ORDER BY ${sort_by} ${order.toUpperCase()}
      LIMIT ? OFFSET ?
    `;
    
    const books = await db.all(dataQuery, [...queryParams, limitNum, offset]);

    // STEP 6: Build response
    const response = {
      data: books,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_items: total,
        items_per_page: limitNum
      }
    };

    console.log(`✅ Found ${books.length} books (${total} total)`);
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({
      error: {
        code: "DATABASE_ERROR",
        message: "An error occurred while fetching books",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// =============================================================================
// ROUTE: POST /books - CREATE NEW BOOK
// =============================================================================

app.post('/books', async (req, res) => {
  console.log('\n📝 POST /books request received');
  console.log('Request body:', req.body);

  try {
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
    const existingBook = await db.get('SELECT id FROM books WHERE isbn = ?', [isbn]);
    
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

    // STEP 3: Insert new book
    const result = await db.run(`
      INSERT INTO books (title, author, isbn, published_year, category, copies_available, copies_total)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, author, isbn, published_year, category, copies_total, copies_total]);

    // STEP 4: Fetch the created book
    const newBook = await db.get('SELECT * FROM books WHERE id = ?', [result.lastID]);

    console.log('✅ Book created:', newBook.id);

    // STEP 5: Send response
    res.status(201)
      .header('Location', `/books/${newBook.id}`)
      .json(newBook);

  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({
      error: {
        code: "DATABASE_ERROR",
        message: "An error occurred while creating the book",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// =============================================================================
// ROUTE: GET /books/:id - GET SINGLE BOOK
// =============================================================================

app.get('/books/:id', async (req, res) => {
  const bookId = parseInt(req.params.id);
  console.log(`\n🔍 GET /books/${bookId} request received`);

  try {
    const book = await db.get('SELECT * FROM books WHERE id = ?', [bookId]);

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

  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({
      error: {
        code: "DATABASE_ERROR",
        message: "An error occurred while fetching the book"
      }
    });
  }
});

// =============================================================================
// ROUTE: PUT /books/:id - UPDATE BOOK
// =============================================================================

app.put('/books/:id', async (req, res) => {
  const bookId = parseInt(req.params.id);
  console.log(`\n✏️  PUT /books/${bookId} request received`);

  try {
    const { title, author, isbn, published_year, category, copies_total } = req.body;

    // Validate required fields
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

    // Check if book exists
    const existingBook = await db.get('SELECT * FROM books WHERE id = ?', [bookId]);
    
    if (!existingBook) {
      return res.status(404).json({
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: `Book with ID ${bookId} not found`
        }
      });
    }

    // Check for ISBN conflict (if ISBN changed)
    if (isbn !== existingBook.isbn) {
      const duplicateISBN = await db.get('SELECT id FROM books WHERE isbn = ? AND id != ?', [isbn, bookId]);
      
      if (duplicateISBN) {
        return res.status(409).json({
          error: {
            code: "DUPLICATE_ISBN",
            message: "A book with this ISBN already exists",
            details: {
              existing_book_id: duplicateISBN.id
            }
          }
        });
      }
    }

    // Calculate copies_available (preserve the difference)
    const availableDifference = existingBook.copies_available;
    const newCopiesTotal = copies_total || existingBook.copies_total;
    
    // Update book
    await db.run(`
      UPDATE books 
      SET title = ?, author = ?, isbn = ?, published_year = ?, category = ?, 
          copies_total = ?, copies_available = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, author, isbn, published_year, category, newCopiesTotal, availableDifference, bookId]);

    // Fetch updated book
    const updatedBook = await db.get('SELECT * FROM books WHERE id = ?', [bookId]);

    console.log('✅ Book updated:', updatedBook.id);
    res.status(200).json(updatedBook);

  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({
      error: {
        code: "DATABASE_ERROR",
        message: "An error occurred while updating the book"
      }
    });
  }
});

// =============================================================================
// ROUTE: DELETE /books/:id - DELETE BOOK
// =============================================================================

app.delete('/books/:id', async (req, res) => {
  const bookId = parseInt(req.params.id);
  console.log(`\n🗑️  DELETE /books/${bookId} request received`);

  try {
    // Check if book exists
    const book = await db.get('SELECT * FROM books WHERE id = ?', [bookId]);

    if (!book) {
      return res.status(404).json({
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: `Book with ID ${bookId} not found`
        }
      });
    }

    // In a real app, you'd check for active loans here
    // For demo, we'll allow deletion
    
    // Delete the book
    await db.run('DELETE FROM books WHERE id = ?', [bookId]);

    console.log('✅ Book deleted');
    res.status(204).send();

  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({
      error: {
        code: "DATABASE_ERROR",
        message: "An error occurred while deleting the book"
      }
    });
  }
});

// =============================================================================
// START SERVER
// =============================================================================

async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();

    // Then start Express server
    app.listen(PORT, () => {
      console.log('\n🚀 Library API Server is running!');
      console.log(`📍 Base URL: http://localhost:${PORT}`);
      console.log('\n📚 Try these endpoints:');
      console.log(`   GET    http://localhost:${PORT}/books`);
      console.log(`   GET    http://localhost:${PORT}/books?category=fiction`);
      console.log(`   GET    http://localhost:${PORT}/books?author=Tolkien`);
      console.log(`   POST   http://localhost:${PORT}/books`);
      console.log(`   PUT    http://localhost:${PORT}/books/1`);
      console.log(`   DELETE http://localhost:${PORT}/books/5`);
      console.log('\n⏳ Waiting for requests...\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  if (db) {
    await db.close();
    console.log('📂 Database connection closed');
  }
  process.exit(0);
});

// Start the server
startServer();
