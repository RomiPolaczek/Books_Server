const express = require("express");
const app = express();
const bodyParser = require("body-parser");

app.use(
    bodyParser.json({
      type() {
        return true;
      },
    })
);

let books = [];
let currentId = 1;
const genresSet = new Set(["SCI_FI", "NOVEL", "HISTORY", "MANGA", "ROMANCE", "PROFESSIONAL"]);

// 1- HEALTH
app.get('/books/health', (req, res) => {
    res.status(200).send('OK');
});

// 2- CREATE A NEW BOOK
app.post('/book', (req, res) => {
    const { title, author, year, price, genres } = req.body;

    if (books.some(book => book.title.toLowerCase() === title.toLowerCase())) {
        return res.status(409).json({ errorMessage: `Error: Book with the title [${title}] already exists in the system` });
    }
    if (year < 1940 || year > 2100) {
        return res.status(409).json({ errorMessage: `Error: Can’t create new Book that its year [${year}] is not in the accepted range [1940 -> 2100]` });
    }
    if (price <= 0) {
        return res.status(409).json({ errorMessage: `Error: Can’t create new Book with negative price` });
    }

    const newBook = {
        id: currentId++,
        title,
        author,
        year,
        price,
        genres
    };

    books.push(newBook);

    res.status(200).json({ result: newBook.id });
});

 // GET TOTAL BOOKS
app.get('/books/total', (req, res) => {
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
                return res.status(400).json({ errorMessage: `Error: Invalid genre [${genre}] provided` });
            }
        }
        filteredBooks = filteredBooks.filter(book => genresArray.some(genre => book.genres.includes(genre)));
    }

    res.status(200).json({ result: filteredBooks.length });
});

// 4- GET BOOKS DATA
app.get('/books', (req, res) => {
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
                return res.status(400).json({ errorMessage: `Error: Invalid genre [${genre}] provided` });
            }
        }
        filteredBooks = filteredBooks.filter(book => genresArray.some(genre => book.genres.includes(genre)));
    }

    filteredBooks.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));

    res.status(200).json({ result: filteredBooks });
});

// 5- GET SINGLE BOOK DATA
app.get('/book', (req, res) => {
    const { id } = req.query;
    const bookId = parseInt(id);

    const book = books.find(book => book.id === bookId);

    if (!book) {
        return res.status(404).json({ errorMessage: `Error: no such Book with id ${bookId}` });
    }

    res.status(200).json({ result: book });
});

// 6- UPDATE BOOK'S PRICE
app.put('/book', (req, res) => {
    const { id, price } = req.query;
    const bookId = parseInt(id);
    const newPrice = parseInt(price);

    const book = books.find(book => book.id === bookId);

    if (!book) {
        return res.status(404).json({ errorMessage: `Error: no such Book with id ${bookId}` });
    }

    if (newPrice <= 0) {
        return res.status(409).json({ errorMessage: `Error: price update for book [${bookId}] must be a positive integer` });
    }

    const oldPrice = book.price;
    book.price = newPrice;

    res.status(200).json({ result: oldPrice });
});

// 7- DELETE BOOK
app.delete('/book', (req, res) => {
    const { id } = req.query;
    const bookId = parseInt(id);

    const bookIndex = books.findIndex(book => book.id === bookId);

    if (bookIndex === -1) {
        return res.status(404).json({ errorMessage: `Error: no such Book with id ${bookId}` });
    }

    books.splice(bookIndex, 1);

    res.status(200).json({ result: books.length });
});


const port = 8574
const server = app.listen(port, () => {
  console.log("Server listening on port " + port + "...\n");
});