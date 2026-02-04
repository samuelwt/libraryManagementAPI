# Library Management API - Complete Implementation

This project demonstrates how an OpenAPI specification (YAML) translates into actual working code.

## 📁 Project Files

- **libraryManagementAPI.yaml** - The OpenAPI specification (blueprint)
- **library-api-server.js** - Backend implementation (Node.js/Express)
- **library-api-client.html** - Interactive frontend client
- **IMPLEMENTATION_GUIDE.md** - Detailed tutorial explaining everything
- **package.json** - Node.js dependencies

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Backend Server
```bash
npm start
```

You should see:
```
🚀 Library API Server is running!
📍 Base URL: http://localhost:3000
```

### 3. Open the Frontend Client
Open `library-api-client.html` in your browser (just double-click it)

## 📚 What You'll Learn

### The Relationship Between YAML and Code

**YAML Specification (libraryManagementAPI.yaml):**
- Describes WHAT the API should do
- Documents endpoints, parameters, responses
- Acts as a contract between frontend and backend

**JavaScript Implementation (library-api-server.js):**
- Actually DOES what the YAML describes
- Handles HTTP requests
- Processes data and returns responses

**Frontend Client (library-api-client.html):**
- Consumes the API
- Makes HTTP requests to the backend
- Displays results to users

## 🎯 Try These Examples

### Search for Fiction Books
```
http://localhost:3000/books?category=fiction
```

### Search for Books by Tolkien
```
http://localhost:3000/books?author=Tolkien
```

### Get Available Books, Sorted by Year (Descending)
```
http://localhost:3000/books?available=true&sort_by=published_year&order=desc
```

### Get a Specific Book
```
http://localhost:3000/books/1
```

## 🔧 API Endpoints Implemented

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/books` | List all books with filtering, sorting, pagination |
| POST | `/books` | Create a new book |
| GET | `/books/:id` | Get a specific book |
| DELETE | `/books/:id` | Delete a book |

## 📖 Understanding the Code

### Query Parameters (Filtering & Sorting)
```javascript
// Frontend: Building the URL
const url = `http://localhost:3000/books?category=fiction&page=1`;

// Backend: Reading the parameters
app.get('/books', (req, res) => {
  const { category, page } = req.query;
  // Apply filters and return results
});
```

### Request Body (Creating Resources)
```javascript
// Frontend: Sending data
fetch('http://localhost:3000/books', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "New Book",
    author: "Author Name",
    isbn: "123-456-789"
  })
});

// Backend: Receiving data
app.post('/books', (req, res) => {
  const { title, author, isbn } = req.body;
  // Create and save the book
});
```

## 🎨 Frontend Features

The HTML client includes:
- ✅ Interactive search and filtering
- ✅ Real-time API URL display
- ✅ Pagination controls
- ✅ Book creation form
- ✅ Single book operations (get/delete)
- ✅ Visual response status codes
- ✅ JSON response viewer

## 🔍 Key Concepts

### 1. RESTful Endpoints
- **GET** - Read/retrieve data
- **POST** - Create new data
- **PUT** - Update existing data
- **DELETE** - Remove data

### 2. HTTP Status Codes
- **200 OK** - Success
- **201 Created** - Resource created
- **204 No Content** - Success, no response body
- **400 Bad Request** - Invalid input
- **404 Not Found** - Resource doesn't exist
- **409 Conflict** - Duplicate/constraint violation

### 3. Response Structure
```json
{
  "data": [...],           // The actual data
  "pagination": {          // Metadata
    "current_page": 1,
    "total_pages": 5,
    "total_items": 94,
    "items_per_page": 20
  }
}
```

### 4. Error Handling
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "isbn",
        "message": "ISBN format is invalid"
      }
    ]
  }
}
```

## 💡 Next Steps

1. Read **IMPLEMENTATION_GUIDE.md** for detailed explanations
2. Modify the API to add new features
3. Try implementing the PUT endpoint (update book)
4. Connect to a real database (PostgreSQL, MongoDB)
5. Add authentication and authorization
6. Deploy to production (Heroku, Railway, etc.)

## 🛠️ Technologies Used

- **Backend:** Node.js, Express.js
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Specification:** OpenAPI 3.0 (YAML)

## 📚 Additional Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Express.js Documentation](https://expressjs.com/)
- [MDN Web Docs - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

## ❓ Common Questions

**Q: Is the YAML file executable code?**  
A: No, it's documentation/specification. Your backend code implements what the YAML describes.

**Q: Why use OpenAPI/Swagger?**  
A: It provides a standard way to document APIs, enables auto-generation of docs and SDKs, and ensures frontend/backend stay in sync.

**Q: Can I use this with other languages?**  
A: Yes! The same OpenAPI spec can be implemented in Python (Flask/FastAPI), Java (Spring Boot), Go, PHP, etc.

## 📝 License

MIT - Feel free to use this for learning!

---

Built with ❤️ for learning API development
