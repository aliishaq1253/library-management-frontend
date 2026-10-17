import { useEffect, useState, useCallback } from 'react';
import './App.css';

const API_BASE = 'http://localhost:8080/api';

/**
 * Thin wrapper around fetch() that:
 * - parses JSON responses
 * - throws a readable Error for non-2xx responses (using the backend's error message if present)
 * - lets network failures (backend down) bubble up as a TypeError, caught by callers
 */
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      message = body.message || JSON.stringify(body.fields) || message;
    } catch {
      // response had no JSON body - keep the generic message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

// --- shared UI building blocks ---

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 ' +
  'shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white ' +
  'shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:bg-indigo-300';

function Card({ title, subtitle, children }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Alert({ type, children, onClose }) {
  const styles = {
    success: 'border-green-200 bg-green-50 text-green-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-amber-200 bg-amber-50 text-amber-800',
  };
  const icons = { success: '✓', error: '!', info: 'i' };
  const iconStyles = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-amber-500',
  };

  return (
    <div role="alert" className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      <span
        className={`mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold text-white ${iconStyles[type]}`}
      >
        {icons[type]}
      </span>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="flex-none rounded px-1 opacity-60 transition hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 px-6 py-12 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

function StatusBadge({ available }) {
  return available ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
      <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
      Available
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
      <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
      Borrowed
    </span>
  );
}

function DataTable({ columns, children }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 [&>tr:nth-child(even)]:bg-slate-50 [&>tr:hover]:bg-indigo-50/60">
          {children}
        </tbody>
      </table>
    </div>
  );
}

const cellClass = 'whitespace-nowrap px-4 py-3 text-slate-700';

// --- layout ---

function Header({ books, users, loans }) {
  const stats = [
    { label: 'Books', value: books.length },
    { label: 'Users', value: users.length },
    { label: 'Active loans', value: loans.length },
  ];

  return (
    <header className="bg-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 text-xl">📚</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Library Management System</h1>
            <p className="text-sm text-slate-400">Manage books, members and loans</p>
          </div>
        </div>
        <dl className="flex gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-right">
              <dt className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</dt>
              <dd className="text-lg font-semibold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

function Navigation({ activeTab, onChangeTab }) {
  const tabs = [
    { key: 'books', label: 'Books' },
    { key: 'users', label: 'Users' },
    { key: 'loans', label: 'Loans' },
  ];

  return (
    <nav className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl gap-1 px-4 sm:px-6">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChangeTab(tab.key)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition ${
                active
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// --- tabs ---

function BooksTab({ books, onAddBook, onDeleteBook }) {
  const [form, setForm] = useState({ title: '', author: '', isbn: '', publicationYear: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onAddBook({
      title: form.title,
      author: form.author,
      isbn: form.isbn,
      publicationYear: Number(form.publicationYear) || 0,
      available: true,
    });
    if (success) {
      setForm({ title: '', author: '', isbn: '', publicationYear: '' });
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Add Book" subtitle="Add a new title to the catalogue.">
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_1.5fr_1fr_auto]">
          <input
            className={inputClass}
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            className={inputClass}
            placeholder="Author"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            required
          />
          <input
            className={inputClass}
            placeholder="ISBN"
            value={form.isbn}
            onChange={(e) => setForm({ ...form, isbn: e.target.value })}
            required
          />
          <input
            className={inputClass}
            type="number"
            placeholder="Year"
            value={form.publicationYear}
            onChange={(e) => setForm({ ...form, publicationYear: e.target.value })}
            required
          />
          <button type="submit" className={primaryButtonClass}>
            Add Book
          </button>
        </form>
      </Card>

      <Card title="Books" subtitle={`${books.length} ${books.length === 1 ? 'book' : 'books'} in the catalogue`}>
        {books.length === 0 ? (
          <EmptyState icon="📖" title="No books yet" hint="Add your first book using the form above." />
        ) : (
          <DataTable columns={['Title', 'Author', 'ISBN', 'Year', 'Status', '']}>
            {books.map((book) => (
              <tr key={book.id} className="transition-colors">
                <td className={`${cellClass} font-medium text-slate-900`}>{book.title}</td>
                <td className={cellClass}>{book.author}</td>
                <td className={`${cellClass} font-mono text-xs`}>{book.isbn}</td>
                <td className={cellClass}>{book.publicationYear}</td>
                <td className={cellClass}>
                  <StatusBadge available={book.available} />
                </td>
                <td className={`${cellClass} text-right`}>
                  <button
                    onClick={() => onDeleteBook(book.id)}
                    className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}

function UsersTab({ users, onAddUser }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onAddUser(form);
    if (success) {
      setForm({ name: '', email: '', phone: '' });
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Add User" subtitle="Register a new library member.">
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            className={inputClass}
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className={inputClass}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className={inputClass}
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
          <button type="submit" className={primaryButtonClass}>
            Add User
          </button>
        </form>
      </Card>

      <Card title="Users" subtitle={`${users.length} registered ${users.length === 1 ? 'member' : 'members'}`}>
        {users.length === 0 ? (
          <EmptyState icon="👤" title="No users yet" hint="Register your first member using the form above." />
        ) : (
          <DataTable columns={['Name', 'Email', 'Phone']}>
            {users.map((user) => (
              <tr key={user.id} className="transition-colors">
                <td className={`${cellClass} font-medium text-slate-900`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                    {user.name}
                  </div>
                </td>
                <td className={cellClass}>{user.email}</td>
                <td className={cellClass}>{user.phone}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}

function LoansTab({ loans, books, users, onBorrowBook, onReturnBook }) {
  const availableBooks = books.filter((book) => book.available);
  const [userId, setUserId] = useState('');
  const [bookId, setBookId] = useState('');

  const handleBorrow = async (e) => {
    e.preventDefault();
    if (!userId || !bookId) return;
    const success = await onBorrowBook(userId, bookId);
    if (success) {
      setUserId('');
      setBookId('');
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Borrow a Book" subtitle="Lend an available book to a member.">
        <form onSubmit={handleBorrow} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select className={inputClass} value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="" disabled>
              Select user
            </option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <select className={inputClass} value={bookId} onChange={(e) => setBookId(e.target.value)} required>
            <option value="" disabled>
              Select book
            </option>
            {availableBooks.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={availableBooks.length === 0 || users.length === 0}
          >
            Borrow
          </button>
        </form>
        {availableBooks.length === 0 && (
          <div className="mt-4">
            <Alert type="info">No available books to borrow right now.</Alert>
          </div>
        )}
      </Card>

      <Card title="Active Loans" subtitle={`${loans.length} ${loans.length === 1 ? 'book' : 'books'} currently on loan`}>
        {loans.length === 0 ? (
          <EmptyState icon="✨" title="No active loans" hint="All books are on the shelf." />
        ) : (
          <DataTable columns={['Book', 'User', 'Loan Date', '']}>
            {loans.map((loan) => (
              <tr key={loan.id} className="transition-colors">
                <td className={`${cellClass} font-medium text-slate-900`}>{loan.book?.title}</td>
                <td className={cellClass}>{loan.user?.name}</td>
                <td className={cellClass}>{loan.loanDate}</td>
                <td className={`${cellClass} text-right`}>
                  <button
                    onClick={() => onReturnBook(loan.id)}
                    className="rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    Return
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('books');
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [connectionError, setConnectionError] = useState('');
  // feedback for the last action: { type: 'success' | 'error', text }
  const [notice, setNotice] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [booksData, usersData, loansData] = await Promise.all([
        apiRequest('/books'),
        apiRequest('/users'),
        apiRequest('/loans'),
      ]);
      setBooks(booksData);
      setUsers(usersData);
      setLoans(loansData);
      setConnectionError('');
    } catch (err) {
      setConnectionError(
        err instanceof TypeError
          ? 'Cannot reach the backend. Is it running on http://localhost:8080?'
          : err.message
      );
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // success messages disappear on their own; errors stay until dismissed or the next action
  useEffect(() => {
    if (notice?.type !== 'success') return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const showSuccess = (text) => setNotice({ type: 'success', text });
  const showError = (text) => setNotice({ type: 'error', text });

  const handleAddBook = async (book) => {
    setNotice(null);
    try {
      const created = await apiRequest('/books', { method: 'POST', body: JSON.stringify(book) });
      setBooks((prev) => [...prev, created]);
      showSuccess(`"${created.title}" was added to the catalogue.`);
      return true;
    } catch (err) {
      showError(err.message);
      return false;
    }
  };

  const handleDeleteBook = async (id) => {
    setNotice(null);
    try {
      await apiRequest(`/books/${id}`, { method: 'DELETE' });
      setBooks((prev) => prev.filter((book) => book.id !== id));
      showSuccess('Book deleted.');
    } catch (err) {
      showError(err.message);
    }
  };

  const handleAddUser = async (user) => {
    setNotice(null);
    try {
      const created = await apiRequest('/users', { method: 'POST', body: JSON.stringify(user) });
      setUsers((prev) => [...prev, created]);
      showSuccess(`${created.name} was registered.`);
      return true;
    } catch (err) {
      showError(err.message);
      return false;
    }
  };

  const handleBorrowBook = async (userId, bookId) => {
    setNotice(null);
    try {
      const loan = await apiRequest(`/loans/borrow?userId=${userId}&bookId=${bookId}`, {
        method: 'POST',
      });
      setLoans((prev) => [...prev, loan]);
      // the borrowed book is no longer available - reflect that without a full refetch
      setBooks((prev) => prev.map((book) => (book.id === loan.book.id ? { ...book, available: false } : book)));
      showSuccess(`"${loan.book?.title}" was lent to ${loan.user?.name}.`);
      return true;
    } catch (err) {
      showError(err.message);
      return false;
    }
  };

  const handleReturnBook = async (loanId) => {
    setNotice(null);
    try {
      const loan = await apiRequest(`/loans/${loanId}/return`, { method: 'PUT' });
      setLoans((prev) => prev.filter((l) => l.id !== loan.id));
      setBooks((prev) => prev.map((book) => (book.id === loan.book.id ? { ...book, available: true } : book)));
      showSuccess(`"${loan.book?.title}" was returned.`);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleChangeTab = (tab) => {
    setNotice(null);
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased">
      <Header books={books} users={users} loans={loans} />
      <Navigation activeTab={activeTab} onChangeTab={handleChangeTab} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {connectionError && (
          <Alert type="error">
            <p className="font-semibold">Connection problem</p>
            <p className="mt-0.5">{connectionError}</p>
            <button
              onClick={loadAll}
              className="mt-3 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          </Alert>
        )}

        {!connectionError && notice && (
          <Alert type={notice.type} onClose={() => setNotice(null)}>
            {notice.text}
          </Alert>
        )}

        {!connectionError && activeTab === 'books' && (
          <BooksTab books={books} onAddBook={handleAddBook} onDeleteBook={handleDeleteBook} />
        )}
        {!connectionError && activeTab === 'users' && <UsersTab users={users} onAddUser={handleAddUser} />}
        {!connectionError && activeTab === 'loans' && (
          <LoansTab
            loans={loans}
            books={books}
            users={users}
            onBorrowBook={handleBorrowBook}
            onReturnBook={handleReturnBook}
          />
        )}
      </main>
    </div>
  );
}

export default App;
