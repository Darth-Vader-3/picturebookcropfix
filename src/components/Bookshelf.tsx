import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PictureBook } from '../types';
import { safeGetJSON } from '../utils/storage';

export const fetchBooks = async (): Promise<PictureBook[]> => {
  let deletedIds = new Set<string>();
  try {
    const deletedList = safeGetJSON<string[]>('digipicture_deleted_book_ids', []);
    if (Array.isArray(deletedList)) {
      deletedIds = new Set(deletedList);
    }
  } catch (e) {
    console.error(e);
  }

  const booksMap = new Map<string, PictureBook>();

  try {
    const pbRef = collection(db, 'picturebooks');
    const snapshot = await getDocs(pbRef);
    snapshot.forEach((docSnap) => {
      if (!deletedIds.has(docSnap.id)) {
        const data = docSnap.data() as PictureBook;
        booksMap.set(docSnap.id, { ...data, id: docSnap.id });
      }
    });
  } catch (error) {
    console.warn('Failed to fetch from picturebooks collection:', error);
  }

  try {
    const booksRef = collection(db, 'books');
    const snapshot = await getDocs(booksRef);
    snapshot.forEach((docSnap) => {
      if (!deletedIds.has(docSnap.id) && !booksMap.has(docSnap.id)) {
        const data = docSnap.data() as PictureBook;
        booksMap.set(docSnap.id, { ...data, id: docSnap.id });
      }
    });
  } catch (error) {
    console.warn('Failed to fetch from books collection:', error);
  }

  const localBooks = safeGetJSON<PictureBook[]>('digipicture_custom_books', []);
  if (Array.isArray(localBooks)) {
    localBooks.forEach((lb) => {
      if (lb && lb.id && !deletedIds.has(lb.id) && !booksMap.has(lb.id)) {
        booksMap.set(lb.id, lb);
      }
    });
  }

  return Array.from(booksMap.values());
};

export interface BookshelfProps {
  onSelectBook?: (bookId: string) => void;
  language?: 'en' | 'sw';
}

export const Bookshelf: React.FC<BookshelfProps> = ({ onSelectBook, language = 'en' }) => {
  const [books, setBooks] = useState<PictureBook[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    fetchBooks()
      .then((items) => {
        if (isMounted) {
          const published = items.filter((b) => !b.status || b.status === 'published');
          setBooks(published);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Bookshelf fetch error:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-amber-900 font-display">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mr-3" />
        <span>{language === 'en' ? 'Loading Picture Books...' : 'Inapakia Vitabu...'}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
      {books.map((book) => (
        <div
          key={book.id}
          id={`bookshelf-card-${book.id}`}
          onClick={() => onSelectBook && onSelectBook(book.id)}
          className="bg-white rounded-2xl border border-orange-200 p-3 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col"
        >
          <div className="w-full h-44 rounded-xl overflow-hidden bg-black/5 flex items-center justify-center p-1 mb-2">
            <img
              src={book.coverImage}
              alt={book.title}
              className="w-full h-full object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          <h3 className="font-display font-bold text-sm text-gray-900 truncate">{book.title}</h3>
          <p className="text-xs text-amber-800 font-medium truncate">{book.author}</p>
        </div>
      ))}
    </div>
  );
};

export default Bookshelf;
