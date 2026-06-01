// Search fields for librarian
export const LIBRARIAN_SEARCHABLE_FIELDS = [
    "librarianCode",
    "fullNameEnglish",
    "fullNameBangla",
    "phone",
    "email",
    "nid",
    "designation",
  ];
  
  export const LIBRARIAN_FILTERABLE_FIELDS = [
    "gender",
    "institutionId",
    "designation",
  ];
  
  // Search fields for books
  export const BOOK_SEARCHABLE_FIELDS = [
    "title",
    "author",
    "isbn",
    "publisher",
    "description",
  ];
  
  export const BOOK_FILTERABLE_FIELDS = [
    "categoryId",
    "status",
    "language",
    "institutionId",
    "publishedYear",
  ];
  
  // Default borrow duration in days
  export const DEFAULT_BORROW_DAYS = 14;
  
  // Fine per day in BDT
  export const FINE_PER_DAY = 5.0;