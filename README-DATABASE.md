# Library API with SQLite Database - Quick Start

## 🚀 Installation & Setup

### Step 1: Install Dependencies
```bash
npm install express sqlite sqlite3
```

### Step 2: Start the Server
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
📍 Base URL: http://localhost:3000
```

### Step 3: Use the Client
Open `library-api-client.html` in your browser - **NO CHANGES NEEDED!**

The client works exactly the same because the API endpoints haven't changed.

---

## 📁 Files Created

After running, you'll see a new file:

```
/your-project/
  ├── library-api-server-with-db.js  (new backend with database)
  ├── library-api-client.html        (unchanged!)
  ├── library.db                     (← new SQLite database file!)
  └── package.json
```

---

## 🔍 What's Different?

### Before (In-Memory):
```javascript
let books = [/* array */];  // Data in RAM - lost on restart

app.get('/books', (req, res) => {
  const filtered = books.filter(...);
  res.json({ data: filtered });
});
```

### After (Database):
```javascript
let db;  // Database connection - data on disk

app.get('/books', async (req, res) => {
  const books = await db.all('SELECT * FROM books WHERE ...');
  res.json({ data: books });
});
```

**Key Changes:**
- ✅ Data persists across restarts
- ✅ Routes are now `async`
- ✅ Array operations → SQL queries
- ✅ Data stored in `library.db` file

**What Stayed the Same:**
- ✅ API endpoints (`/books`, `/books/:id`)
- ✅ Request/response formats
- ✅ Frontend client (zero changes!)

---

## 📊 Database Structure

```sql
CREATE TABLE books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Auto-generated ID
  title TEXT NOT NULL,                    -- Required
  author TEXT NOT NULL,                   -- Required
  isbn TEXT UNIQUE NOT NULL,              -- Required, must be unique
  published_year INTEGER,                 -- Optional
  category TEXT,                          -- Optional
  copies_available INTEGER DEFAULT 0,     -- Defaults to 0
  copies_total INTEGER DEFAULT 0,         -- Defaults to 0
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,  -- Auto-set
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP   -- Auto-set
)
```

---

## 🧪 Testing the Database

### Using the Client
1. Open `library-api-client.html`
2. Create a new book
3. Stop the server (Ctrl+C)
4. Restart the server
5. Search for books → **Your new book is still there!**

### Using Command Line
```bash
# View the database
sqlite3 library.db

# In SQLite prompt:
.tables                    # Show tables
.schema books              # Show structure
SELECT * FROM books;       # View all books
SELECT COUNT(*) FROM books; # Count books
.quit                      # Exit
```

### Using a GUI Tool
Download [DB Browser for SQLite](https://sqlitebrowser.org/)
- Open `library.db`
- Browse data visually
- Edit directly
- Run custom queries

---

## 📚 Common SQL Queries

```sql
-- Get all books
SELECT * FROM books;

-- Filter by category
SELECT * FROM books WHERE category = 'fiction';

-- Search by author (partial match)
SELECT * FROM books WHERE author LIKE '%Tolkien%';

-- Count books by category
SELECT category, COUNT(*) FROM books GROUP BY category;

-- Get available books only
SELECT * FROM books WHERE copies_available > 0;

-- Sort by publication year
SELECT * FROM books ORDER BY published_year DESC;

-- Pagination (20 per page, page 2)
SELECT * FROM books LIMIT 20 OFFSET 20;
```

---

## 🔧 API Endpoints (Unchanged!)

| Method | Endpoint | Description | Example |
|--------|----------|-------------|---------|
| GET | `/books` | List all books | `GET /books?category=fiction&page=1` |
| POST | `/books` | Create new book | `POST /books` with JSON body |
| GET | `/books/:id` | Get specific book | `GET /books/1` |
| PUT | `/books/:id` | Update book | `PUT /books/1` with JSON body |
| DELETE | `/books/:id` | Delete book | `DELETE /books/1` |

---

## 🎯 Key Concepts Learned

### 1. Database Connection
```javascript
const db = await open({
  filename: './library.db',
  driver: sqlite3.Database
});
```
- Opens connection to SQLite database
- Creates file if doesn't exist
- Reused for all queries

### 2. Parameterized Queries (SQL Injection Prevention)
```javascript
// SAFE ✅
db.get('SELECT * FROM books WHERE id = ?', [bookId]);

// DANGEROUS ❌
db.get(`SELECT * FROM books WHERE id = ${bookId}`);
```

### 3. Database Methods

| Method | Purpose | Returns | Example |
|--------|---------|---------|---------|
| `db.run()` | INSERT/UPDATE/DELETE | `{ lastID, changes }` | Creating/modifying data |
| `db.get()` | SELECT one row | Single object or `undefined` | Getting specific book |
| `db.all()` | SELECT multiple rows | Array of objects | Listing books |
| `db.exec()` | Execute SQL (no params) | Nothing | Creating tables |

### 4. Async/Await with Database
```javascript
// All database operations are async
const book = await db.get('SELECT * FROM books WHERE id = ?', [1]);
const books = await db.all('SELECT * FROM books');
await db.run('INSERT INTO books (...) VALUES (?)', [values]);
```

---

## 🚨 Important Notes

### Data Persistence
- ✅ Data survives server restarts
- ✅ Stored in `library.db` file
- ⚠️ Deleting `library.db` = deleting all data

### Concurrent Access
- ✅ SQLite handles concurrent reads
- ⚠️ Limited concurrent writes (fine for <100 users)
- 💡 For high traffic, upgrade to PostgreSQL

### Backup
```bash
# Backup database
cp library.db library.backup.db

# Restore from backup
cp library.backup.db library.db
```

---

## 🐛 Troubleshooting

### "Database locked" error
- SQLite limits concurrent writes
- Usually resolves automatically
- For production, use PostgreSQL

### "Cannot find module 'sqlite'"
```bash
npm install sqlite sqlite3
```

### Data not persisting
- Check if `library.db` file exists
- Verify file permissions
- Check for errors in console

### Server won't start
- Check if port 3000 is already in use
- Verify database file isn't corrupted
- Delete `library.db` and restart (recreates fresh)

---

## 📖 Further Reading

- **SQLite Documentation**: https://www.sqlite.org/docs.html
- **SQL Tutorial**: https://www.sqltutorial.org/
- **Database Design**: Learn about normalization, relationships, indexes
- **Migration to PostgreSQL**: When ready for production scaling

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Server starts without errors
- [ ] `library.db` file created
- [ ] Can GET `/books` - returns data
- [ ] Can POST `/books` - creates new book
- [ ] Can restart server - data persists
- [ ] Frontend client works unchanged
- [ ] Can browse database with SQLite browser

---

## 🎓 What You've Learned

✅ How databases differ from in-memory storage  
✅ SQLite setup and configuration  
✅ SQL basics (SELECT, INSERT, UPDATE, DELETE)  
✅ Parameterized queries for security  
✅ Async database operations  
✅ Database persistence  
✅ Why APIs abstract implementation details  

**Next steps:**
- Add more tables (authors, categories, loans)
- Implement relationships (foreign keys)
- Add database indexes for performance
- Learn database migrations
- Eventually migrate to PostgreSQL for production

Happy coding! 🚀
