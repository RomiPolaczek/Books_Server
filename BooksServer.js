const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;
const path = require('path');

// Initialize variables
let books = [];
let currentId = 1;
const genresSet = new Set(["SCI_FI", "NOVEL", "HISTORY", "MANGA", "ROMANCE", "PROFESSIONAL"]);
let requestCounter = 0;

// Custom format for log messages
const logFormat = printf(({ level, message, timestamp, requestId }) => {
  return `${timestamp} ${level.toUpperCase()}: ${message} | request #${requestId}`;
});

// Request Logger
const requestLogger = createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'DD-MM-YYYY HH:mm:ss.SSS' }),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: path.join(__dirname, 'logs', 'requests.log') })
  ]
});

// Books Logger
const booksLogger = createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'DD-MM-YYYY HH:mm:ss.SSS' }),
    logFormat
  ),
  transports: [
    new transports.File({ filename: path.join(__dirname, 'logs', 'books.log') })
  ]
});

app.use(bodyParser.json({
  type() {
    return true;
  },
}));

// Middleware to log incoming requests
app.use((req, res, next) => {
  requestCounter += 1;
  req.requestId = requestCounter;
  requestLogger.info(`Incoming request | #${req.requestId} | resource: ${req.path} | HTTP Verb ${req.method}`,{requestId : req.requestId});
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    requestLogger.debug(`request #${req.requestId} duration: ${duration}ms`, {requestId : req.requestId});
  });
  next();
});

// Middleware to log errors
app.use((err, req, res, next) => {
  if (err) {
    log.error(err.message, {requestId : req.requestId});
    res.status(err.status || 500).json({ errorMessage: err.message });
  }
});

// 1- HEALTH
app.get('/books/health', (req, res) => {
  res.status(200).send('OK');
});

// 2- CREATE A NEW BOOK
app.post('/book', (req, res, next) => {
  const { title, author, year, price, genres } = req.body;

  if (books.some(book => book.title.toLowerCase() === title.toLowerCase())) {
    const errorMessage = `Error: Book with the title [${title}] already exists in the system`;
    return next({ message: errorMessage, status: 409 });
  }
  if (year < 1940 || year > 2100) {
    const errorMessage = `Error: Can’t create new Book that its year [${year}] is not in the accepted range [1940 -> 2100]`;
    return next({ message: errorMessage, status: 409 });
  }
  if (price <= 0) {
    const errorMessage = `Error: Can’t create new Book with negative price`;
    return next({ message: errorMessage, status: 409 });
  }

  const newBook = {
    id: currentId++,
    title,
    author,
    year,
    price,
    genres
  };

  booksLogger.info(`Creating new Book with Title [${title}]`, { requestId: req.requestId });
  booksLogger.debug(`Currently there are ${books.length} Books in the system. New Book will be assigned with id ${newBook.id}`, { requestId: req.requestId });

  books.push(newBook);

  res.status(200).json({ result: newBook.id });
});

// GET TOTAL BOOKS
app.get('/books/total', (req, res, next) => {
  const { author, 'price-bigger-than': priceBiggerThan, 'price-less-than': priceLessThan, 'year-bigger-than': yearBiggerThan, 'year-less-than': yearLessThan, genres } = req.query;

  let filteredBooks = books;

  if (author) {
    filteredBooks = filteredBooks.filter(book => book.author.toLowerCase() === author.toLowerCase());
  }
  if (priceBiggerThan) {
    filteredBooks = filteredBooks.filter(book => book.price >= parseInt(priceBiggerThan));
  }
  if (priceLessThan) {
    filteredBooks = filteredBooks.filter(book => book.price <= parseInt(priceLessThan));
  }
  if (yearBiggerThan) {
    filteredBooks = filteredBooks.filter(book => book.year >= parseInt(yearBiggerThan));
  }
  if (yearLessThan) {
    filteredBooks = filteredBooks.filter(book => book.year <= parseInt(yearLessThan));
  }
  if (genres) {
    const genresArray = genres.split(',');
    for (const genre of genresArray) {
      if (!genresSet.has(genre)) {
        const errorMessage = `Error: Invalid genre [${genre}] provided`;
        return next({ message: errorMessage, status: 400 });
      }
    }
    filteredBooks = filteredBooks.filter(book => genresArray.some(genre => book.genres.includes(genre)));
  }

  booksLogger.info(`Total Books found for requested filters is ${filteredBooks.length}`, { requestId: req.requestId });

  res.status(200).json({ result: filteredBooks.length });
});

// 4- GET BOOKS DATA
app.get('/books', (req, res, next) => {
  const { author, 'price-bigger-than': priceBiggerThan, 'price-less-than': priceLessThan, 'year-bigger-than': yearBiggerThan, 'year-less-than': yearLessThan, genres } = req.query;

  let filteredBooks = books;

  if (author) {
    filteredBooks = filteredBooks.filter(book => book.author.toLowerCase() === author.toLowerCase());
  }
  if (priceBiggerThan) {
    filteredBooks = filteredBooks.filter(book => book.price >= parseInt(priceBiggerThan));
  }
  if (priceLessThan) {
    filteredBooks = filteredBooks.filter(book => book.price <= parseInt(priceLessThan));
  }
  if (yearBiggerThan) {
    filteredBooks = filteredBooks.filter(book => book.year >= parseInt(yearBiggerThan));
  }
  if (yearLessThan) {
    filteredBooks = filteredBooks.filter(book => book.year <= parseInt(yearLessThan));
  }
  if (genres) {
    const genresArray = genres.split(',');
    for (const genre of genresArray) {
      if (!genresSet.has(genre)) {
        const errorMessage = `Error: Invalid genre [${genre}] provided`;
        return next({ message: errorMessage, status: 400 });
      }
    }
    filteredBooks = filteredBooks.filter(book => genresArray.some(genre => book.genres.includes(genre)));
  }

  filteredBooks.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));

  booksLogger.info(`Total Books found for requested filters is ${filteredBooks.length}`, { requestId: req.requestId });

  res.status(200).json({ result: filteredBooks });
});

// 5- GET SINGLE BOOK DATA
app.get('/book', (req, res, next) => {
  const { id } = req.query;
  const bookId = parseInt(id);

  const book = books.find(book => book.id === bookId);

  if (!book) {
    const errorMessage = `Error: no such Book with id ${bookId}`;
    return next({ message: errorMessage, status: 404 });
  }

  booksLogger.debug(`Fetching book id ${bookId} details`, { requestId: req.requestId });

  res.status(200).json({ result: book });
});

// 6- UPDATE BOOK'S PRICE
app.put('/book', (req, res, next) => {
  const { id, price } = req.query;
  const bookId = parseInt(id);
  const newPrice = parseInt(price);

  const book = books.find(book => book.id === bookId);

  if (!book) {
    const errorMessage = `Error: no such Book with id ${bookId}`;
    return next({ message: errorMessage, status: 404 });
  }

  if (newPrice <= 0) {
    const errorMessage = `Error: Can’t update a Book with negative price`;
    return next({ message: errorMessage, status: 409 });
  }

  booksLogger.info(`Update Book id [${bookId}] price to ${newPrice}`, { requestId: req.requestId });
  booksLogger.debug(`Book [${book.title}] price change: ${book.price} --> ${newPrice}`, { requestId: req.requestId });

  book.price = newPrice;

  res.status(200).json({ result: book.price });
});

// 7- DELETE A BOOK
app.delete('/book', (req, res, next) => {
    const { id } = req.query;
    const bookId = parseInt(id);
  
    const bookIndex = books.findIndex(book => book.id === bookId);
  
    if (bookIndex === -1) {
      const errorMessage = `Error: no such Book with id ${bookId}`;
      return next({ message: errorMessage, status: 404 });
    }
  
    const [deletedBook] = books.splice(bookIndex, 1);
  
    booksLogger.info(`Removing book [${deletedBook.title}]`, { requestId: req.requestId });
    booksLogger.debug(`After removing book [${deletedBook.title}] id: [${bookId}] there are ${books.length} books in the system`, { requestId: req.requestId });
  
    res.status(200).json({ result: bookId });
  });
  
  // 8- GET LOG LEVEL
  app.get('/logs/level', (req, res) => {
    const { 'logger-name': loggerName } = req.query;
  
    if (!loggerName || !['request-logger', 'books-logger'].includes(loggerName)) {
      return res.status(400).send('Invalid logger name');
    }
  
    const logger = loggerName === 'request-logger' ? requestLogger : booksLogger;
    res.status(200).send(logger.level.toUpperCase());
  });
  
  // 9- SET LOG LEVEL
  app.put('/logs/level', (req, res) => {
    const { 'logger-name': loggerName, 'logger-level': loggerLevel } = req.query;
  
    if (!loggerName || !['request-logger', 'books-logger'].includes(loggerName)) {
      return res.status(400).send('Invalid logger name');
    }
  
    if (!loggerLevel || !['ERROR', 'INFO', 'DEBUG'].includes(loggerLevel.toUpperCase())) {
      return res.status(400).send('Invalid logger level');
    }
  
    const logger = loggerName === 'request-logger' ? requestLogger : booksLogger;
    logger.level = loggerLevel.toLowerCase();
  
    res.status(200).send(logger.level.toUpperCase());
  });
  
  // Error handler for unmatched routes
  app.use((req, res, next) => {
    const errorMessage = `Error: Route not found for ${req.method} ${req.originalUrl}`;
    requestLogger.error(errorMessage, { requestId: req.requestId });
    next({ message: errorMessage, status: 404 });
  });
  
  // Global error handler
  app.use((err, req, res, next) => {
    if (err) {
      if (err.status && err.status === 400) {
        // Bad request, don't log it
        return res.status(400).json({ errorMessage: err.message });
      }
      // Log the error
      booksLogger.error(err.message, { requestId: req.requestId });
      res.status(err.status || 500).json({ errorMessage: err.message });
    }
  });
  
  app.listen(8574, () => {
    console.log("Server is running on port 8574");
  });
  