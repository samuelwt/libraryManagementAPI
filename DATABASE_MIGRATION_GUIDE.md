# Database Migration Guide: From In-Memory to SQLite

## Overview of Changes

This guide explains the transition from an in-memory array to a real SQLite database. You'll learn SQL fundamentals, database operations, and why this is a major improvement.

---

## **Key Insight: The Client Doesn't Change!**

**IMPORTANT:** The frontend client (`library-api-client.html`) requires **ZERO changes**. This demonstrates a core principle of API design:

```
Frontend makes HTTP requests → Backend processes → Frontend receives JSON

Whether backend uses:
- In-memory array
- SQLite
- PostgreSQL  
- MongoDB

The frontend doesn't know and doesn't care!
```

**This is the power of abstraction.** The API contract (endpoints, request/response formats) stays the same, so clients continue working unchanged.

---

## **What Changed: Side-by-Side Comparison**

### **In-Memory Version:**

```javascript
// Global variable
let books = [
  { id: 1, title: "The Hobbit", ... },
  { id: 2, title: "Clean Code", ... }
];

// Finding books
app.get('/books', (req, res) => {
  let filtered = books.filter(b => b.category === category);
  res.json({ data: filtered });
});
```

**Problems:**
- ❌ Data lost when server restarts
- ❌ Can't handle large datasets efficiently
- ❌ No data integrity constraints
- ❌ No concurrent access control
- ❌ No indexes for fast searching

### **Database Version:**

```javascript
// Database connection
let db;

// Initialize database on startup
await initializeDatabase();

// Finding books with SQL
app.get('/books', async (req, res) => {
  const books = await db.all('SELECT * FROM books WHERE category = ?', [category]);
  res.json({ data: books });
});
```

**Benefits:**
- ✅ Data persists across restarts
- ✅ Handles millions of records efficiently
- ✅ Enforces data constraints (UNIQUE, NOT NULL)
- ✅ Concurrent access handled by database
- ✅ Indexed queries are extremely fast
- ✅ ACID transactions (Atomicity, Consistency, Isolation, Durability)

---

## **New Concepts: Line-by-Line Breakdown**

### **1. Importing SQLite Libraries (Lines 3-4)**

```javascript
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
```

**What are these packages?**

**`sqlite3`:**
- The actual SQLite database driver
- Low-level C++ bindings to SQLite
- Provides callback-based API

**`sqlite`:**
- Wrapper around `sqlite3`
- Provides **Promise-based API** (works with async/await)
- Much easier to use than raw `sqlite3`

**Why both?**
- `sqlite` is the wrapper we actually use
- But it needs `sqlite3` as the underlying driver
- Think of it like: `sqlite3` is the engine, `sqlite` is the steering wheel

**Destructuring:**
```javascript
const { open } = require('sqlite');
```
- Imports only the `open` function
- Equivalent to: `const sqlite = require('sqlite'); const open = sqlite.open;`

---

### **2. Database Connection Variable (Line 17)**

```javascript
let db; // Will hold database connection
```

**Why global?**
- Database connection is needed in all route handlers
- Created once during startup
- Reused for all requests
- **Important:** Not a new connection per request!

**Connection vs Query:**
- **Connection** (one per app): Like opening a door to the database
- **Query** (many): Each request/operation through that door

---

### **3. Initialize Database Function (Lines 28-116)**

```javascript
async function initializeDatabase() {
  // Open database connection
  db = await open({
    filename: './library.db',
    driver: sqlite3.Database
  });
```

**Line 28:** `async function initializeDatabase()`
- Async because database operations are asynchronous
- Called once at startup, not per request

**Lines 30-33:** Opening the database

```javascript
db = await open({
  filename: './library.db',
  driver: sqlite3.Database
});
```

**What this does:**
1. Creates `library.db` file if it doesn't exist
2. Opens connection to the database
3. Returns a database object we can query

**`filename: './library.db'`:**
- **`.`** means current directory
- Creates a file named `library.db`
- **This file IS the database** - everything stored here

**`driver: sqlite3.Database`:**
- Specifies which driver to use
- Links the wrapper to the actual SQLite engine

**What happens on disk:**
```
Before: 
  /your-project/
    ├── library-api-server-with-db.js
    └── package.json

After running:
  /your-project/
    ├── library-api-server-with-db.js
    ├── package.json
    └── library.db  ← New database file created!
```

---

### **4. Creating Tables (Lines 38-53)**

```javascript
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
```

**What is SQL?**
- **SQL** = Structured Query Language
- Standard language for relational databases
- Used by SQLite, PostgreSQL, MySQL, etc.

**Line 38:** `await db.exec(...)`

**What is `.exec()`?**
- Executes SQL command
- Returns nothing (void)
- Used for DDL (Data Definition Language) - creating/altering tables

**Breaking down the SQL:**

**`CREATE TABLE IF NOT EXISTS books`**
- `CREATE TABLE` - Make a new table
- `IF NOT EXISTS` - Only if it doesn't already exist (prevents errors on restart)
- `books` - Table name

**Column definitions:**

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
```
- **`id`** - Column name
- **`INTEGER`** - Data type (whole number)
- **`PRIMARY KEY`** - Unique identifier for each row
- **`AUTOINCREMENT`** - Database generates next ID automatically (1, 2, 3...)

```sql
title TEXT NOT NULL,
```
- **`TEXT`** - String data type
- **`NOT NULL`** - Cannot be empty (required field)

```sql
isbn TEXT UNIQUE NOT NULL,
```
- **`UNIQUE`** - No two books can have same ISBN
- Database enforces this (prevents duplicates)

```sql
copies_available INTEGER DEFAULT 0,
```
- **`DEFAULT 0`** - If not specified, use 0
- Optional field with fallback value

```sql
created_at TEXT DEFAULT CURRENT_TIMESTAMP,
```
- **`CURRENT_TIMESTAMP`** - Database sets current date/time automatically
- No need to set this in code

**Data types in SQLite:**
- `INTEGER` - Whole numbers (1, 42, -5)
- `REAL` - Decimals (3.14, -0.5)
- `TEXT` - Strings ("Hello", "978-0132350884")
- `BLOB` - Binary data (images, files)

---

### **5. Checking and Seeding Data (Lines 57-113)**

```javascript
// Check if we need to seed data
const count = await db.get('SELECT COUNT(*) as count FROM books');

if (count.count === 0) {
  console.log('🌱 Seeding initial data...');
  // Insert sample books...
}
```

**Line 57:** `await db.get('SELECT COUNT(*) as count FROM books')`

**What is `.get()`?**
- Fetches **one row** from database
- Returns JavaScript object
- Returns `undefined` if no rows found

**SQL: `SELECT COUNT(*) as count FROM books`**
- **`SELECT`** - Fetch data
- **`COUNT(*)`** - Count all rows
- **`as count`** - Name the result column "count"
- **`FROM books`** - From the books table

**Result:**
```javascript
{ count: 0 }  // If empty
{ count: 5 }  // If 5 books
```

**Line 59:** `if (count.count === 0) { ... }`
- Only seed if database is empty
- Prevents duplicate data on restart

**Lines 64-107:** Inserting seed data

```javascript
for (const book of books) {
  await db.run(`
    INSERT INTO books (title, author, isbn, ...)
    VALUES (?, ?, ?, ...)
  `, [book.title, book.author, book.isbn, ...]);
}
```

**What is `.run()`?**
- Executes SQL that **modifies** data (INSERT, UPDATE, DELETE)
- Returns result object with `lastID`, `changes` properties
- Different from `.get()` which fetches data

**SQL: `INSERT INTO books (...) VALUES (...)`**
- **`INSERT INTO books`** - Add new row to books table
- **`(title, author, isbn, ...)`** - Columns we're setting
- **`VALUES (?, ?, ?, ...)`** - Placeholder values

**What are the `?` placeholders?**
- **Parameterized query** (prepared statement)
- Prevents SQL injection attacks
- Values substituted safely

**Second parameter: `[book.title, book.author, ...]`**
- Array of values
- Each `?` replaced by corresponding array value
- In order: first `?` = `book.title`, second `?` = `book.author`, etc.

**Example:**
```javascript
// This SQL:
INSERT INTO books (title, author) VALUES (?, ?)

// With parameters:
[book.title, book.author]
// Where book.title = "The Hobbit", book.author = "Tolkien"

// Becomes:
INSERT INTO books (title, author) VALUES ('The Hobbit', 'Tolkien')
```

**Why not string concatenation?**

**DANGEROUS (SQL Injection):**
```javascript
// DON'T DO THIS!
db.run(`INSERT INTO books (title) VALUES ('${userInput}')`)

// If userInput = "'; DROP TABLE books; --"
// Becomes: INSERT INTO books (title) VALUES (''; DROP TABLE books; --')
// This DELETES YOUR TABLE!
```

**SAFE (Parameterized):**
```javascript
// DO THIS!
db.run('INSERT INTO books (title) VALUES (?)', [userInput])

// Database treats userInput as data, not code
// Safe from injection attacks
```

---

### **6. Route Handler with Database Query (Lines 141-238)**

Let's examine the GET /books route with database queries:

```javascript
app.get('/books', async (req, res) => {
  try {
    // Build SQL query dynamically
    let whereConditions = [];
    let queryParams = [];

    if (category) {
      whereConditions.push('category = ?');
      queryParams.push(category);
    }

    if (author) {
      whereConditions.push('author LIKE ?');
      queryParams.push(`%${author}%`);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const { total } = await db.get(`SELECT COUNT(*) as total FROM books ${whereClause}`, queryParams);

    // Get paginated data
    const books = await db.all(`
      SELECT * FROM books 
      ${whereClause}
      ORDER BY ${sort_by} ${order.toUpperCase()}
      LIMIT ? OFFSET ?
    `, [...queryParams, limitNum, offset]);

    res.json({ data: books, pagination: {...} });
  } catch (error) {
    // Error handling
  }
});
```

**Dynamic WHERE clause building:**

```javascript
let whereConditions = [];
let queryParams = [];

if (category) {
  whereConditions.push('category = ?');
  queryParams.push(category);
}
```

**Why arrays?**
- We don't know beforehand which filters user will apply
- Build SQL piece by piece
- Join at the end

**Example flow:**

```javascript
// User requests: ?category=fiction&author=Tolkien

// After building:
whereConditions = ['category = ?', 'author LIKE ?']
queryParams = ['fiction', '%Tolkien%']

// Join conditions:
whereClause = 'WHERE category = ? AND author LIKE ?'

// Final SQL:
SELECT * FROM books WHERE category = ? AND author LIKE ?

// With parameters substituted:
SELECT * FROM books WHERE category = 'fiction' AND author LIKE '%Tolkien%'
```

**SQL LIKE operator:**
```sql
author LIKE '%Tolkien%'
```
- **`LIKE`** - Pattern matching
- **`%`** - Wildcard (matches anything)
- **`%Tolkien%`** - Matches "J.R.R. Tolkien", "Tolkien", "Christopher Tolkien"

**Line 218:** `await db.get(...)`
- Gets count for pagination
- Returns single value: `{ total: 94 }`

**Line 227:** `await db.all(...)`

**What is `.all()`?**
- Fetches **all matching rows**
- Returns array of objects
- `[]` if no matches

**SQL features:**

```sql
ORDER BY title ASC
```
- **`ORDER BY`** - Sort results
- **`ASC`** - Ascending (A→Z, 1→9)
- **`DESC`** - Descending (Z→A, 9→1)

```sql
LIMIT 20 OFFSET 40
```
- **`LIMIT 20`** - Return maximum 20 rows
- **`OFFSET 40`** - Skip first 40 rows
- Together: "Give me rows 41-60" (page 3 of 20 per page)

**Spread operator with parameters:**
```javascript
[...queryParams, limitNum, offset]
```
- Combines multiple arrays/values
- If `queryParams = ['fiction']`, `limitNum = 20`, `offset = 0`
- Result: `['fiction', 20, 0]`

---

### **7. POST Route with Database Insert (Lines 244-303)**

```javascript
app.post('/books', async (req, res) => {
  try {
    // Check for duplicate
    const existingBook = await db.get('SELECT id FROM books WHERE isbn = ?', [isbn]);
    
    if (existingBook) {
      return res.status(409).json({ error: {...} });
    }

    // Insert new book
    const result = await db.run(`
      INSERT INTO books (title, author, isbn, ...)
      VALUES (?, ?, ?, ...)
    `, [title, author, isbn, ...]);

    // Fetch the created book
    const newBook = await db.get('SELECT * FROM books WHERE id = ?', [result.lastID]);

    res.status(201).json(newBook);
  } catch (error) {
    // Error handling
  }
});
```

**Line 267:** Duplicate check
```javascript
const existingBook = await db.get('SELECT id FROM books WHERE isbn = ?', [isbn]);
```
- Queries database for existing ISBN
- Returns `{ id: 5 }` if exists, `undefined` if not
- More reliable than array `.find()` - database handles it

**Line 280-282:** Insert and get ID

```javascript
const result = await db.run(`INSERT INTO books ...`, [values]);
```

**What does `.run()` return?**
```javascript
{
  lastID: 6,        // ID of newly inserted row (auto-generated)
  changes: 1        // Number of rows affected
}
```

**Line 285:** Fetch inserted book
```javascript
const newBook = await db.get('SELECT * FROM books WHERE id = ?', [result.lastID]);
```

**Why fetch instead of manually creating object?**
- Database might modify values (timestamps, defaults)
- Ensures we return exactly what's in database
- `created_at` and `updated_at` set automatically by database

**Comparison with in-memory version:**

**In-memory:**
```javascript
const newBook = {
  id: books.length + 1,  // Manual ID
  title,
  author,
  isbn,
  created_at: new Date().toISOString(),  // Manual timestamp
  updated_at: new Date().toISOString()
};
books.push(newBook);
```

**Database:**
```javascript
const result = await db.run('INSERT INTO books (...) VALUES (...)', [values]);
const newBook = await db.get('SELECT * FROM books WHERE id = ?', [result.lastID]);
// Database handles ID and timestamps automatically!
```

---

### **8. UPDATE Route (Lines 309-392)**

```javascript
app.put('/books/:id', async (req, res) => {
  try {
    // Check if exists
    const existingBook = await db.get('SELECT * FROM books WHERE id = ?', [bookId]);
    
    if (!existingBook) {
      return res.status(404).json({...});
    }

    // Update
    await db.run(`
      UPDATE books 
      SET title = ?, author = ?, ..., updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, author, ..., bookId]);

    // Fetch updated book
    const updatedBook = await db.get('SELECT * FROM books WHERE id = ?', [bookId]);
    res.json(updatedBook);
  } catch (error) {
    // Error handling
  }
});
```

**SQL UPDATE syntax:**
```sql
UPDATE books 
SET title = ?, author = ?
WHERE id = ?
```
- **`UPDATE books`** - Table to modify
- **`SET column = value`** - What to change
- **`WHERE id = ?`** - Which row(s) to update
- **CRITICAL:** Without WHERE, updates ALL rows!

**`updated_at = CURRENT_TIMESTAMP`:**
- Database sets timestamp automatically
- No need to pass from JavaScript

**Why fetch after update?**
- Ensures response matches database state
- Returns database-computed values (timestamps, triggers)

---

### **9. DELETE Route (Lines 398-435)**

```javascript
app.delete('/books/:id', async (req, res) => {
  try {
    // Check if exists
    const book = await db.get('SELECT * FROM books WHERE id = ?', [bookId]);

    if (!book) {
      return res.status(404).json({...});
    }

    // Delete
    await db.run('DELETE FROM books WHERE id = ?', [bookId]);
    res.status(204).send();
  } catch (error) {
    // Error handling
  }
});
```

**SQL DELETE syntax:**
```sql
DELETE FROM books WHERE id = ?
```
- **`DELETE FROM books`** - Table to delete from
- **`WHERE id = ?`** - Which row(s) to delete
- **CRITICAL:** Without WHERE, deletes ALL rows!

**Why check existence first?**
- Can return 404 with helpful error
- Know if deletion actually happened

---

### **10. Error Handling (Throughout)**

```javascript
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
```

**Why wrap in try-catch?**
- Database operations can fail (connection lost, disk full, constraint violation)
- Prevents server crash
- Returns proper error to client

**`process.env.NODE_ENV`:**
- Environment variable
- `'development'` on your machine
- `'production'` on live server
- Show detailed errors only in development (security)

---

### **11. Server Startup Sequence (Lines 441-468)**

```javascript
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();

    // Then start Express server
    app.listen(PORT, () => {
      console.log('Server running!');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

**Order matters!**
1. Initialize database connection
2. Create tables if needed
3. Seed data if empty
4. **Only then** start accepting HTTP requests

**Why this order?**
- Routes need `db` object to be ready
- If server starts before database ready → requests fail

**`process.exit(1)`:**
- Terminates Node.js process
- `1` = error code (non-zero = error)
- Prevents running server with broken database

---

### **12. Graceful Shutdown (Lines 470-477)**

```javascript
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  if (db) {
    await db.close();
    console.log('📂 Database connection closed');
  }
  process.exit(0);
});
```

**What is `SIGINT`?**
- Signal sent when you press Ctrl+C
- Tells process to stop

**What is graceful shutdown?**
- Close database connection properly
- Finish pending operations
- Don't corrupt data
- vs. abrupt shutdown (pulling power plug)

**`await db.close()`:**
- Closes database connection
- Flushes pending writes
- Releases file locks

---

## **SQL Cheat Sheet**

### **Common Operations:**

```sql
-- SELECT (Read)
SELECT * FROM books;                           -- All books
SELECT title, author FROM books;               -- Specific columns
SELECT * FROM books WHERE category = 'fiction'; -- Filtered
SELECT * FROM books WHERE copies_available > 0; -- Numeric filter
SELECT * FROM books WHERE author LIKE '%Tolk%'; -- Pattern match

-- INSERT (Create)
INSERT INTO books (title, author, isbn) 
VALUES ('Title', 'Author', '123-456');

-- UPDATE (Modify)
UPDATE books 
SET copies_available = 5 
WHERE id = 1;

-- DELETE (Remove)
DELETE FROM books WHERE id = 1;

-- COUNT
SELECT COUNT(*) FROM books;
SELECT COUNT(*) FROM books WHERE category = 'fiction';

-- ORDER BY
SELECT * FROM books ORDER BY title ASC;
SELECT * FROM books ORDER BY published_year DESC;

-- LIMIT and OFFSET (Pagination)
SELECT * FROM books LIMIT 20;              -- First 20
SELECT * FROM books LIMIT 20 OFFSET 20;    -- Next 20 (page 2)
```

### **Operators:**

```sql
=     -- Equal
!=    -- Not equal
<     -- Less than
>     -- Greater than
<=    -- Less than or equal
>=    -- Greater than or equal
LIKE  -- Pattern matching
IN    -- Value in list
```

---

## **Setup Instructions**

### **1. Install Dependencies**

```bash
npm install express sqlite sqlite3
```

### **2. Run the Server**

```bash
node library-api-server-with-db.js
```

**First run output:**
```
📂 Database connected: library.db
✅ Table "books" ready
🌱 Seeding initial data...
✅ Seeded 5 books
🚀 Library API Server is running!
```

**Subsequent runs:**
```
📂 Database connected: library.db
✅ Table "books" ready
📚 Database has 5 books
🚀 Library API Server is running!
```

### **3. Use the Same Frontend**

Open `library-api-client.html` - **it works without changes!**

---

## **Advantages of Database Version**

### **1. Data Persistence**

**In-memory:**
```
Start server → Data exists
Stop server → Data GONE FOREVER
Restart → Start with seed data again
```

**Database:**
```
Start server → Data loaded from disk
Stop server → Data safely saved
Restart → All data still there!
```

### **2. Performance**

**In-memory (1 million books):**
```javascript
books.filter(b => b.category === 'fiction')
// Checks all 1,000,000 books - SLOW! ~100ms
```

**Database (1 million books):**
```sql
SELECT * FROM books WHERE category = 'fiction'
-- Uses index - FAST! ~1ms
```

### **3. Data Integrity**

**In-memory:**
```javascript
books.push({ id: 1, isbn: "123" });
books.push({ id: 1, isbn: "123" }); // Oops! Duplicate ID
// JavaScript doesn't care - CORRUPTED DATA
```

**Database:**
```sql
INSERT INTO books (id, isbn) VALUES (1, '123');
INSERT INTO books (id, isbn) VALUES (1, '123');
-- ERROR: UNIQUE constraint failed
-- Database PREVENTS corruption
```

### **4. Complex Queries**

**In-memory:**
```javascript
// Find books by author, published after 2000, with copies available, sorted by title
// Requires multiple .filter() calls, .sort(), custom logic - COMPLEX!
```

**Database:**
```sql
SELECT * FROM books 
WHERE author = 'Tolkien' 
  AND published_year > 2000 
  AND copies_available > 0
ORDER BY title ASC
-- Simple, readable, optimized!
```

---

## **Next Steps**

### **Exploring Your Database:**

**1. Install SQLite Browser (GUI):**
- Download: https://sqlitebrowser.org/
- Open `library.db` file
- Browse tables visually
- Run custom queries

**2. Command Line:**
```bash
sqlite3 library.db
```

Then in SQLite prompt:
```sql
.tables                           -- Show all tables
.schema books                     -- Show table structure
SELECT * FROM books;              -- See all books
SELECT * FROM books WHERE id = 1; -- Specific query
.quit                            -- Exit
```

### **Database Exercises:**

1. **Add a new column:**
```sql
ALTER TABLE books ADD COLUMN publisher TEXT;
```

2. **Create an index for faster searches:**
```sql
CREATE INDEX idx_category ON books(category);
```

3. **Create a related table (borrowers):**
```sql
CREATE TABLE borrowers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);
```

4. **Join tables (advanced):**
```sql
CREATE TABLE loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER,
  borrower_id INTEGER,
  borrowed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id),
  FOREIGN KEY (borrower_id) REFERENCES borrowers(id)
);
```

---

## **Migration to PostgreSQL (When Ready)**

When your app grows, migrating to PostgreSQL is simple:

**1. Change connection:**
```javascript
// Before (SQLite):
const db = await open({
  filename: './library.db',
  driver: sqlite3.Database
});

// After (PostgreSQL):
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  database: 'library',
  user: 'postgres',
  password: 'password'
});
```

**2. SQL mostly stays the same!**
- 95% of queries work unchanged
- Minor syntax differences (AUTOINCREMENT → SERIAL)

---

## **Key Takeaways**

✅ **SQLite is production-ready** - Not just for learning  
✅ **SQL is universal** - Skills transfer to all databases  
✅ **API abstraction works** - Frontend unchanged  
✅ **Data persistence** - Survives server restarts  
✅ **Performance** - Indexed queries are extremely fast  
✅ **Data integrity** - Constraints prevent corruption  

You now have a fully functional, persistent API!
